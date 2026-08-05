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
| GEO-002 Modelos | no iniciado | — |
| GEO-003 Persistencia | no iniciado | — |
| GEO-004 Wildfire adapter | no iniciado | — |
| GEO-005 Normalización | no iniciado | — |
| GEO-006 Reconciliación | no iniciado | — |
| GEO-007 API | no iniciado | — |
| GEO-008 AppShell | no iniciado | — |
| GEO-009 Mapa/lista | no iniciado | — |
| GEO-010 Ficha | no iniciado | — |
| GEO-011 Capas | no iniciado | — |
| GEO-012 CI | no iniciado | — |

## Tests

Configurados:

- pytest para API e ingesta;
- prueba de integración marcada para `/ready` con PostGIS;
- Vitest + Testing Library para la pantalla inicial;
- Playwright con un smoke E2E.

Última validación local de `GEO-001`: `make check` terminado correctamente.

## Fuentes conectadas

Ninguna.

## Bloqueos

Ninguno para `GEO-001`.

## Último cambio comprobado

2026-08-05: `GEO-001` validado en la rama `codex/geo-001-bootstrap`.
