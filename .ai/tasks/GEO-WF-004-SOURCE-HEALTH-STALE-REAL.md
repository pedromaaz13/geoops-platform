# GEO-WF-004 · Source health con stale real

Estado: implementado en `codex/geo-wf-004-source-health-stale-real`.

## Pregunta que responde

Como sabe GeoOps si una fuente esta viva pero sus datos ya son viejos, sin confundir edad de descarga, edad del dato y ultimo exito?

## Problema

`/v1/sources/health` distinguia estados basicos, pero mezclaba metadatos declarados del fixture con el ultimo `SourceRun`. Una fuente podia parecer sana aunque el dato observado o la descarga hubieran superado su TTL.

## Evidencia

La auditoria `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md` marcaba pendiente separar descarga, dato, ultimo exito, TTL y razon de stale.

## Objetivo

Calcular health de fuente usando tiempos persistidos cuando existen, exponer edades separadas y marcar `stale` cuando edad de dato o descarga supera el TTL.

## Alcance

- `wildfire-public` y fuentes upstream registradas desde `sources.json`.
- Endpoint existente `/v1/sources/health`.
- Resumen existente `/v1/operations/summary`.
- Tests de fuente fresca, stale y fallo `suspicious_empty` conservando ultimo exito.

## Fuera de alcance

- Nuevas fuentes externas.
- Filtros `origin/sensor/confidence`.
- Reconciliacion oficial/satelite.
- Nueva tabla de health historico.
- Alertas por fuente stale.

## Decisiones

- No se anade migracion: `SourceRun.started_at`, `finished_at` y `latest_observed_at` ya permiten calcular lo necesario para el MVP.
- TTL inicial de `wildfire-public`: `86400` segundos.
- Si el ultimo run falla, `freshness_status="failed"` gana a `stale`, pero se conserva `last_success_at` y `latest_observed_at` del ultimo run exitoso.
- Para fuentes upstream sin `SourceRun`, se usan `last_success_at`, `ttl_seconds` y `data_age_seconds` del `sources.json`; cuando hay `generated_at`, se infiere `latest_observed_at`.

## Pruebas

- Fuente fresca: `success`, edades separadas y TTL.
- Fuente stale: `data_age_seconds > ttl_seconds`, descarga fresca, razon stale.
- Fallo sospechoso: ultimo run `failed/suspicious_empty`, ultimo exito preservado y eventos no borrados.
- Resumen operativo: lista `stale_sources`, `failed_sources`, peor edad de dato y peor edad de descarga.

## Validacion ejecutada

- `GEOOPS_TEST_DATABASE_URL="postgresql://geoops:geoops@localhost:5432/geoops_dev" uv run pytest tests/mvp/test_wildfire_mvp_integration.py -q` -> 11 passed.
- `uv run ruff check services tests alembic` -> passed.
- `uv run mypy services/api services/ingestion` -> passed.
- `uv run pytest tests/mvp tests/api -q -rs` -> 13 passed, 1 skipped (`GEOOPS_TEST_DATABASE_URL` no configurado para `test_ready_integration` en ejecucion directa).
- `pnpm --filter @geoops/web typecheck` -> passed.
- `make test` -> backend unit 14 passed, frontend 4 passed, backend integration 12 passed.
- `make check` -> lint, typecheck, tests, build y Playwright E2E pasaron.
- `make demo` -> PostGIS healthy, ingesta wildfire success, demo seed creado.
- `curl /health` -> API GeoOps `ok`.
- `curl /ready` -> PostGIS `ready`.
- `curl /v1/sources/health` -> `wildfire-public=success`, `112cv=firms_viirs=stale` por TTL del fixture.
- `curl /v1/operations/summary` -> `events_total=2`, `source_health.stale_sources=["112cv","firms_viirs"]`.

Warnings vivos:

- Vite avisa de chunk grande por MapLibre.
- Playwright muestra warning `NO_COLOR` ignorado por `FORCE_COLOR`.

## Documentacion a actualizar

- `docs/06-CONTRATOS-Y-APIS.md`
- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`
