# GEO-FIX-006 · Hallazgos de codigo fuera de alcance

Fecha: 2026-08-06.
Commit inspeccionado: `c1fcb83`.

Este registro conserva defectos confirmados mientras GEO-FIX-006 corrige solo
documentacion. No afirma que esten resueltos ni autoriza a corregirlos dentro de
esta tarea.

## GEO-FIX-001 · Listado parcial no declarado

- `services/api/geoops_api/operations.py:158` ordena por UUID de evento.
- `services/api/geoops_api/operations.py:159` calcula `next_cursor` al truncar.
- `services/api/geoops_api/operations.py:167` devuelve siempre `partial=False`.
- Riesgo: el cliente puede interpretar un subconjunto arbitrario como inventario completo.

## GEO-FIX-002 · Cooldown y ciclo de alerta incompletos

- `services/api/geoops_api/models.py:159` persiste `cooldown_minutes`.
- `services/api/geoops_api/operations.py:659` evalua alertas sin aplicar ese valor.
- `services/api/geoops_api/models.py:177` define `resolved_at`, pero solo existe la accion acknowledge en `main.py:208`.
- Riesgo: revisiones sucesivas pueden producir alertas sin semantica material y no existe resolucion automatica.

## GEO-FIX-003 · API sin contrato tipado

- Los endpoints de `services/api/geoops_api/main.py:71` a `main.py:209` no declaran `response_model`.
- Los POST leen `Request` y JSON manualmente en `main.py:173` y `main.py:196`.
- `apps/web/src/types.ts:1` mantiene contratos a mano.
- Riesgo: backend y frontend pueden divergir sin que OpenAPI o los mocks lo detecten.

## GEO-FIX-004 · Reconciliacion espacial en Python

- `services/api/geoops_api/wildfire_ingest.py:433` calcula distancia en Python.
- `services/api/geoops_api/wildfire_ingest.py:458` busca y filtra candidatos fuera de PostGIS.
- Riesgo: coste lineal y dos representaciones de coordenadas al crecer el volumen.

## GEO-FIX-005 · E2E sin backend real

- `apps/web/tests/e2e/operations.spec.ts:45` y `operations.spec.ts:123` interceptan respuestas `/v1`.
- `Makefile:95` ejecuta ese E2E como parte de `make check`.
- Riesgo: cambios incompatibles en la forma real de la API pueden mantener CI verde.

## Otros hallazgos documentales con seguimiento pendiente

- `GET /v1/events` acepta parametros desconocidos sin error de contrato.
- El frontend pide como maximo 200 eventos y no consume `next_cursor`.
- El resumen operativo recalcula datos por evento y vuelve a consultar source health.
- No existe presupuesto de bundle que haga fallar por el chunk grande de MapLibre.
