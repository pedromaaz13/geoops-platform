"""Write the API's OpenAPI schema to ``openapi.json`` at the repo root.

Run with ``python -m geoops_api.openapi_dump`` (see ``make openapi``). The output
is canonical (sorted keys) so ``make openapi-check`` can diff it in CI and catch
any endpoint whose contract changed without regenerating the committed schema.
"""

from __future__ import annotations

import json
from pathlib import Path

from geoops_api.main import app

OUTPUT_PATH = Path("openapi.json")


def main() -> None:
    schema = app.openapi()
    OUTPUT_PATH.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
