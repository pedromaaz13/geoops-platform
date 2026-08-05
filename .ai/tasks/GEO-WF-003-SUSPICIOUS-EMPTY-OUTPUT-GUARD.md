# GEO-WF-003 · Guard de salida vacia sospechosa

Estado: implementado en `codex/geo-wf-003-suspicious-empty-output-guard`.

## Pregunta que responde

Como evita GeoOps interpretar una caida o bug de fuente como "no hay incendios" cuando habia actividad wildfire reciente?

## Problema

Un feed `wildfire-public` con `features=[]` puede ser legitimo en una base limpia, pero tambien puede ser una salida corrupta o incompleta. Si GeoOps lo acepta sin contexto, la API podria aparentar ausencia de eventos y ocultar actividad vigente.

## Evidencia

La auditoria `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md` marca como pendiente critico el control de salida vacia sospechosa heredado del visor de incendios.

## Objetivo

Rechazar una ingesta vacia de `wildfire-public` cuando existe actividad wildfire reciente previa, conservando raw payloads y ultimo estado valido.

## Alcance

- Ingesta `wildfire-public`.
- Persistencia de `RawPayload`.
- Registro de `SourceRun` fallido con `error_type="suspicious_empty"`.
- Tests de integracion para base limpia, actividad reciente y actividad antigua.
- Documentacion de estado/auditoria.

## Fuera de alcance

- Stale real por TTL de fuente.
- Filtros wildfire por origen, sensor o confianza.
- Reconciliacion oficial/satelite por tolerancia temporal/espacial.
- Nuevas fuentes externas.
- Cambios de UI.

## Archivos previstos

- `services/api/geoops_api/wildfire_ingest.py`
- `tests/mvp/test_wildfire_mvp_integration.py`
- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`

## Dependencias

No se anaden dependencias.

## Riesgos

- Bloquear un cero real si hay actividad reciente pero la fuente no declara cierre.
- No cubrir aun stale por TTL especifico de fuente.
- Confundir edad de descarga con edad del dato si no se mantiene `latest_observed_at`.

## Errores silenciosos posibles

- Guardar raw pero no finalizar `SourceRun`.
- Crear observaciones/eventos antes de detectar la salida sospechosa.
- Considerar reciente una ejecucion fallida previa sin datos aceptados.
- Permitir vacio sospechoso por mirar solo eventos y no runs previos.

## Plan

1. Crear helper de actividad wildfire reciente con ventana inicial de 72h.
2. Ejecutar la guardia despues de validar schema y guardar raw, antes de crear observaciones/eventos.
3. Marcar el run como `failed/suspicious_empty` y lanzar `WildfireFeedError`.
4. Anadir fixtures temporales de feed vacio en tests.
5. Cubrir base limpia, actividad reciente y actividad antigua.
6. Actualizar auditoria y estado.
7. Ejecutar validacion especifica y completa.

## Pruebas

- `test_empty_feed_is_allowed_without_previous_activity`
- `test_suspicious_empty_feed_after_recent_activity_is_rejected`
- `test_old_previous_activity_does_not_block_empty_feed`
- `uv run pytest tests/ingestion tests/mvp -q`
- `make test`
- `make check`

## Criterios de aceptacion

- Feed vacio en base limpia queda `status="empty"`.
- Feed vacio tras actividad wildfire reciente falla con `error_type="suspicious_empty"`.
- Raw payloads de la ingesta vacia quedan preservados.
- No se crean ni modifican `Observation`/`Event` al rechazar el vacio sospechoso.
- La API conserva el ultimo estado valido existente.
- Actividad previa fuera de 72h no bloquea un feed vacio.

## Documentacion a actualizar

- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`

## Validacion ejecutada

- `GEOOPS_TEST_DATABASE_URL="postgresql://geoops:geoops@localhost:5432/geoops_dev" uv run pytest tests/mvp/test_wildfire_mvp_integration.py -q` -> 8 passed.
- `uv run pytest tests/ingestion tests/mvp -q` -> 20 passed.
- `make test` -> backend unit 14 passed, frontend 4 passed, backend integration 9 passed.
- `make check` -> lint, typecheck, tests, build y Playwright E2E pasaron.
- `make demo` -> PostGIS healthy, ingesta wildfire success, demo seed creado.
- `curl /health`, `/ready`, `/v1/operations/summary` -> API GeoOps accesible, PostGIS ready, `events_total=2`.

Warnings vivos:

- Vite avisa de chunk grande por MapLibre.
- Playwright muestra warning `NO_COLOR` ignorado por `FORCE_COLOR`.
