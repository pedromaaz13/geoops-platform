# GEO-WF-005 · Filtros wildfire por origin, sensor y confidence

Estado: implementado en `codex/geo-wf-005-006-filters-reconciliation`.

## Pregunta que responde

Como puede un operador filtrar incendios por procedencia, sensor y confianza sin perder los filtros existentes?

## Alcance

- Extender `GET /v1/events` con `origins`, `sensors` y `min_confidence`.
- Preservar filtros existentes de estado, fuente, impacto, alerta y ventana temporal.
- Llevar filtros a la UI operacional.
- No anadir fuentes externas.

## Fuera de alcance

- Buscador IGN/gazetteer.
- Nuevos sensores reales.
- Ranking o scoring avanzado de confianza.

## Pruebas

- API filtra por `origins=satelite`.
- API filtra por `sensors=VIIRS_NOAA20_NRT`.
- API filtra por `min_confidence`.
- UI envia los parametros nuevos al backend.

## Validacion

- `uv run ruff check services tests alembic`: OK.
- `uv run mypy services/api services/ingestion`: OK.
- `GEOOPS_TEST_DATABASE_URL="postgresql://geoops:geoops@localhost:5432/geoops_dev" uv run pytest tests/mvp/test_wildfire_mvp_integration.py -q`: 14 passed.
- `pnpm --filter @geoops/web test`: 5 passed.
- `make test`: backend unit, frontend e integracion OK.
- `make check`: lint, typecheck, tests, build y E2E OK.
- `make demo`: OK, con ingesta idempotente sobre BD existente.
- `curl /v1/events?types=wildfire&origins=satelite`: devuelve solo evento satelite.
- `curl /v1/events?types=wildfire&sensors=VIIRS_NOAA20_NRT`: devuelve eventos con sensor declarado.
- `curl /v1/events?types=wildfire&min_confidence=0.7`: devuelve solo eventos con confianza >= 0.7.
- `curl /v1/events?types=wildfire&min_confidence=2`: 400 `INVALID_REQUEST`.
