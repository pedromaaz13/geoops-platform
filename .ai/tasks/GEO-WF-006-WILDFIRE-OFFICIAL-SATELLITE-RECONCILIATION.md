# GEO-WF-006 · Reconciliacion oficial/satelite por tolerancia y ventana temporal

Estado: implementado en `codex/geo-wf-005-006-filters-reconciliation`.

## Pregunta que responde

Como evita GeoOps crear dos eventos distintos cuando una observacion oficial y una satelital describen el mismo incendio?

## Alcance

- Mantener reconciliacion exacta por `upstream_incident_id`.
- Anadir reconciliacion espacial/temporal para wildfire cuando los IDs difieren.
- Usar ventana inicial de 6h y tolerancia basada en precision declarada.
- Conservar procedencia agregada en `Event.attributes`.
- Mantener `Observation` inmutable y relacion `EventObservation`.

## Fuera de alcance

- Motor generico multiobservacion.
- Tabla nueva de candidatos.
- Reconciliacion multisource para AEMET/DGT.
- Ajustes humanos/manuales.

## Pruebas

- Dos observaciones satelite/oficial cercanas en espacio-tiempo crean un solo `Event`.
- Observaciones lejanas o fuera de ventana siguen creando eventos separados.
- El evento fusionado conserva las dos observaciones y los IDs upstream agregados.

## Validacion

- `uv run ruff check services tests alembic`: OK.
- `uv run mypy services/api services/ingestion`: OK.
- `GEOOPS_TEST_DATABASE_URL="postgresql://geoops:geoops@localhost:5432/geoops_dev" uv run pytest tests/mvp/test_wildfire_mvp_integration.py -q`: 14 passed.
- `make test`: backend unit, frontend e integracion OK.
- `make check`: lint, typecheck, tests, build y E2E OK.
- Test `test_wildfire_reconciles_official_and_satellite_observations_by_tolerance`: dos observaciones cercanas en 6h crean un unico evento `ambos`.
- Test `test_wildfire_reconciliation_keeps_observations_outside_window_separate`: observaciones fuera de ventana quedan separadas.
- `make demo`: OK y la API sigue mostrando 2 eventos demo.
