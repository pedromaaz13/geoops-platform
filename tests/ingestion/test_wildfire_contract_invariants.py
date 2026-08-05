import copy
import json
from pathlib import Path

from geoops_api.wildfire_ingest import _validate_feed

FIXTURE = Path("tests/fixtures/wildfire_public")


def _payloads() -> tuple[dict, dict, dict]:  # type: ignore[type-arg]
    manifest = json.loads((FIXTURE / "manifest.json").read_text(encoding="utf-8"))
    incidents = json.loads((FIXTURE / "incidents.geojson").read_text(encoding="utf-8"))
    sources = json.loads((FIXTURE / "sources.json").read_text(encoding="utf-8"))
    return manifest, incidents, sources


def _first_feature() -> dict:  # type: ignore[type-arg]
    _, incidents, _ = _payloads()
    return copy.deepcopy(incidents["features"][0])


def test_valid_wildfire_fixture_satisfies_contract_invariants() -> None:
    manifest, incidents, sources = _payloads()

    assert _validate_feed(manifest, incidents, sources) == []


def test_duplicate_incident_ids_are_rejected() -> None:
    manifest, incidents, sources = _payloads()
    incidents["features"].append(copy.deepcopy(incidents["features"][0]))

    assert any("duplicated incident id" in error for error in _validate_feed(manifest, incidents, sources))


def test_geometry_outside_spain_bbox_is_rejected() -> None:
    manifest, incidents, sources = _payloads()
    incidents["features"][0]["geometry"]["coordinates"] = [2.35, 48.86]

    assert any("outside operational bbox" in error for error in _validate_feed(manifest, incidents, sources))


def test_zero_zero_geometry_is_rejected() -> None:
    manifest, incidents, sources = _payloads()
    incidents["features"][0]["geometry"]["coordinates"] = [0.0, 0.0]

    assert any("outside operational bbox" in error for error in _validate_feed(manifest, incidents, sources))


def test_missing_or_non_positive_precision_is_rejected() -> None:
    manifest, incidents, sources = _payloads()
    incidents["features"][0]["properties"].pop("position_precision_m")
    incidents["features"][1]["properties"]["position_precision_m"] = 0

    errors = _validate_feed(manifest, incidents, sources)

    assert any("missing position_precision_m" in error for error in errors)
    assert any("non-positive precision" in error for error in errors)


def test_inverted_detection_window_is_rejected() -> None:
    manifest, incidents, sources = _payloads()
    props = incidents["features"][0]["properties"]
    props["first_detected"] = "2026-08-05T10:00:00Z"
    props["last_detected"] = "2026-08-05T09:00:00Z"

    assert any("first_detected after last_detected" in error for error in _validate_feed(manifest, incidents, sources))


def test_origin_and_confirmation_flags_must_be_coherent() -> None:
    manifest, incidents, sources = _payloads()
    props = incidents["features"][0]["properties"]
    props["origin"] = "ambos"
    props["official_confirmed"] = False

    assert any("origin does not match confirmation flags" in error for error in _validate_feed(manifest, incidents, sources))


def test_status_requires_official_source_and_vocab() -> None:
    manifest, incidents, sources = _payloads()
    props = incidents["features"][0]["properties"]
    props["status"] = "apagandose"
    props["official_confirmed"] = False
    props["confirmed_by"] = ""
    props["status_origen"] = "satelite"

    errors = _validate_feed(manifest, incidents, sources)

    assert any("status outside allowed vocabulary" in error for error in errors)
    assert any("declares status without official confirmation" in error for error in errors)
    assert any("declares status without confirmed_by" in error for error in errors)
    assert any("declares status without status_origen=oficial" in error for error in errors)


def test_satellite_incident_without_hotspots_is_rejected() -> None:
    manifest, incidents, sources = _payloads()
    props = incidents["features"][0]["properties"]
    props["n_hotspots"] = 0
    props["origin"] = "satelite"

    assert any("n_hotspots=0 with non-official origin" in error for error in _validate_feed(manifest, incidents, sources))


def test_official_orphan_without_hotspots_is_valid() -> None:
    manifest, _, sources = _payloads()
    feature = _first_feature()
    feature["properties"].update(
        {
            "id": "official-orphan",
            "origin": "oficial",
            "satellite_confirmed": False,
            "official_confirmed": True,
            "confirmed_by": "112cv",
            "status": "activo",
            "status_origen": "oficial",
            "n_hotspots": 0,
            "position_precision_m": 100,
        }
    )
    incidents = {"type": "FeatureCollection", "features": [feature]}
    manifest["counts"]["incidents_total"] = 1

    assert _validate_feed(manifest, incidents, sources) == []
