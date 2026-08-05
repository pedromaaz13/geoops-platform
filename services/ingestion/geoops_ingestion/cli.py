from __future__ import annotations

import argparse
import json
import logging
from collections.abc import Sequence


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
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "smoke":
        return _smoke()

    parser.print_help()
    return 0
