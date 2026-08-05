# Estado del proyecto

**Fecha:** 2026-08-05.

Este documento es la única fuente del estado real. Se actualiza al cerrar cada
hito, no al planificarlo.

## Repositorio

```text
Nombre: geoops-platform
Rama de producción: main
Producción: pendiente
```

## Estado por bloque

| Bloque | Estado | Evidencia |
|---|---|---|
| GEO-001 Bootstrap | completado | `make check` en rama `codex/geo-001-bootstrap`; `Makefile`, `pyproject.toml`, `apps/web`, `services/api`, `services/ingestion`, `docker-compose.yml`, `.github/workflows/ci.yml` |
| GEO-MVP-001 Wildfire end-to-end | completado | `make check` en rama `codex/mvp-wildfire-vertical-slice`; migración `0001_mvp_core`; fixture `tests/fixtures/wildfire_public`; API `/v1`; consola `/operations`; pruebas `tests/mvp` y Playwright |
| GEO-002 Modelos | absorbido por MVP | `Source`, `SourceRun`, `RawPayload`, `Observation`, `Event`, `EventRevision`, `Asset`, `Impact`, `AlertRule`, `Alert` |
| GEO-003 Persistencia | absorbido por MVP | Alembic + PostGIS con índices GiST y unicidad de idempotencia |
| GEO-004 Wildfire adapter | absorbido por MVP | comando `geoops-ingestion wildfire-public` |
| GEO-005 Normalización | absorbido por MVP | `services/api/geoops_api/wildfire_ingest.py` |
| GEO-006 Reconciliación | absorbido por MVP | reconciliación MVP por `source_id + upstream_incident_id` |
| GEO-007 API | absorbido por MVP | endpoints `/v1/events`, fuentes, assets, impactos y alertas |
| GEO-008 AppShell | absorbido por MVP | consola operacional React |
| GEO-009 Mapa/lista | absorbido por MVP | MapLibre + lista en `/operations` |
| GEO-010 Ficha | absorbido por MVP | detalle con observaciones, impactos y procedencia |
| GEO-UI-002 Paridad wildfire/UI | parcial | rama `codex/geoops-wildfire-parity-and-ui-rebuild`; auditoria `docs/audits/WILDFIRE-PARITY-AUDIT.md`; capturas en `artifacts/screenshots/`; consola map-first con source health, timeline, capas, lista viewport y ficha flotante |
| GEO-011 Capas | iniciado | registry inicial de eventos, incertidumbre, activos e impactos; sin hotspots/perimetros/viento/trafico |
| GEO-012 CI | preparado | `make check` comparte puertas locales y CI |

## Tests

Configurados:

- pytest para API e ingesta;
- prueba de integración marcada para `/ready` con PostGIS;
- pruebas de integración del MVP para migración, ingesta, idempotencia,
  revisión, impactos, reglas y alertas;
- Vitest + Testing Library para la consola operacional;
- Playwright con un smoke E2E del flujo wildfire.

Última validación local de `GEO-001`: `make check` terminado correctamente.
Última validación local del MVP wildfire: `make check` terminado correctamente
en la rama `codex/mvp-wildfire-vertical-slice`.
Última validación parcial de `GEO-UI-002`: lint/typecheck Python y frontend,
Vitest, build frontend, Playwright mockeado, PostGIS healthy, `/health`, `/ready`,
`make demo` y pruebas de integración MVP. `make check` queda pendiente de la
validación final de esta rama.

## Fuentes conectadas

- `wildfire-public`: fixture local y URL configurable. No se descarga nada por
  defecto durante tests.

## Bloqueos

Ninguno para el MVP wildfire.

## Último cambio comprobado

2026-08-05: `GEO-UI-002` reconstruye la consola `/operations` hacia paridad
wildfire. Estado: parcial hasta ejecutar `make check` final y resolver los
pendientes vivos de auditoria que se consideren bloqueantes para merge.
