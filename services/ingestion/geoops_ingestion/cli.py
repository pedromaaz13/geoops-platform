from __future__ import annotations

import argparse
import json
import logging
import shutil
import tempfile
from collections.abc import Sequence
from pathlib import Path

from geoops_api.db import create_session_factory
from geoops_api.models import AlertRule, RawPayload
from geoops_api.operations import create_alert_rule, create_asset, list_assets, list_events
from geoops_api.wildfire_ingest import ingest_wildfire_public
from sqlalchemy import select


def _configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s", force=True)


def _smoke() -> int:
    _configure_logging()
    logging.info(
        json.dumps(
            {
                "service": "geoops-ingestion",
                "status": "ok",
                "message": "ingestion CLI loaded; no external sources were contacted",
            },
            sort_keys=True,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="geoops-ingestion",
        description="GeoOps ingestion bootstrap CLI.",
    )
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("smoke", help="Verify the ingestion CLI can start without sources.")
    wildfire = subparsers.add_parser("wildfire-public", help="Import the wildfire public feed.")
    wildfire.add_argument("--fixture", type=Path)
    wildfire.add_argument("--base-url")
    replay = subparsers.add_parser("replay", help="Replay a raw payload by id.")
    replay.add_argument("--raw-payload-id", required=True)
    subparsers.add_parser("demo-seed", help="Create one demo asset and alert rule from current events.")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "smoke":
        return _smoke()
    if args.command == "wildfire-public":
        _configure_logging()
        session_factory = create_session_factory()
        with session_factory() as session:
            summary = ingest_wildfire_public(session, fixture=args.fixture, base_url=args.base_url)
        print(json.dumps(summary.as_dict(), sort_keys=True))
        return 0
    if args.command == "replay":
        session_factory = create_session_factory()
        with session_factory() as session:
            raw = session.get(RawPayload, args.raw_payload_id)
            if raw is None:
                raise SystemExit(f"Raw payload not found: {args.raw_payload_id}")
            raw_dir = Path(raw.storage_uri).parent
            with tempfile.TemporaryDirectory() as tmp:
                tmp_path = Path(tmp)
                for artifact in ("manifest", "incidents", "sources"):
                    matches = list(raw_dir.glob(f"{artifact}-*.json"))
                    if not matches:
                        raise SystemExit(f"Missing {artifact} payload near {raw.storage_uri}")
                    shutil.copyfile(matches[0], tmp_path / {"manifest": "manifest.json", "incidents": "incidents.geojson", "sources": "sources.json"}[artifact])
                summary = ingest_wildfire_public(session, fixture=tmp_path)
        print(json.dumps(summary.as_dict(), sort_keys=True))
        return 0
    if args.command == "demo-seed":
        session_factory = create_session_factory()
        with session_factory() as session:
            events = list_events(
                session,
                bbox=None,
                types="wildfire",
                from_time=None,
                to_time=None,
                updated_after=None,
                status=None,
                sources=None,
                has_impact=None,
                has_alert=None,
                limit=1,
                cursor=None,
            )
            if not events["features"]:
                raise SystemExit("No wildfire events available. Run wildfire-public ingestion first.")
            coords = events["features"][0]["geometry"]["coordinates"]
            assets = list_assets(session)
            if not assets:
                asset = create_asset(
                    session,
                    {
                        "name": "Demo asset near wildfire",
                        "asset_type": "site",
                        "longitude": coords[0] + 0.01,
                        "latitude": coords[1] + 0.01,
                        "criticality": "high",
                    },
                )
            else:
                asset = assets[0]
            existing_rule = session.scalar(
                select(AlertRule).where(
                    AlertRule.name == "Demo wildfire proximity",
                    AlertRule.asset_id == asset["id"],
                    AlertRule.event_type == "wildfire",
                )
            )
            if existing_rule is None:
                rule = create_alert_rule(
                    session,
                    {
                        "name": "Demo wildfire proximity",
                        "event_type": "wildfire",
                        "asset_id": asset["id"],
                        "distance_threshold_m": 50000,
                        "cooldown_minutes": 0,
                    },
                )
            else:
                rule = {
                    "id": existing_rule.id,
                    "name": existing_rule.name,
                    "event_type": existing_rule.event_type,
                    "asset_id": existing_rule.asset_id,
                    "distance_threshold_m": existing_rule.distance_threshold_m,
                    "enabled": existing_rule.enabled,
                }
        print(json.dumps({"asset": asset, "rule": rule}, sort_keys=True))
        return 0

    parser.print_help()
    return 0
