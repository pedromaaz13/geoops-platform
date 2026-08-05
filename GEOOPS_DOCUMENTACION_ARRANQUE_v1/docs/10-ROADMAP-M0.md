# Roadmap ejecutable M0

M0 demuestra el núcleo completo con incendios.

---

## GEO-001 · Bootstrap

**Resultado:** monorepo instalable con web, API y PostGIS.

```text
[ ] pnpm
[ ] entorno Python reproducible
[ ] Docker Compose
[ ] CI
[ ] Makefile
[ ] AGENTS y docs
```

## GEO-002 · Modelos base

`Source`, `SourceRun`, `RawPayload`, `Observation`, `Event`,
`EventObservation`, `EventRevision`.

## GEO-003 · Persistencia

- SQLAlchemy;
- Alembic;
- PostGIS;
- índices;
- tests de migración.

## GEO-004 · Wildfire adapter

- manifest;
- incidents;
- sources;
- raw;
- fixtures;
- idempotencia;
- health.

## GEO-005 · Normalización

- Observation;
- tiempos;
- precisión;
- procedencia;
- validación.

## GEO-006 · Reconciliación

- upstream ID;
- evento;
- relación;
- revisión;
- alias inicial.

## GEO-007 · API

- bbox;
- tiempo;
- tipo;
- detalle;
- observaciones;
- fuentes.

## GEO-008 · AppShell

- React;
- layout;
- escritorio;
- móvil;
- accesibilidad.

## GEO-009 · Mapa y lista

- MapLibre;
- selección bidireccional;
- URL;
- filtros.

## GEO-010 · Ficha

- procedencia;
- latencias;
- precisión;
- evidencias;
- revisiones.

## GEO-011 · Capas y leyenda

- registry;
- carga diferida;
- error;
- opacidad;
- fuente.

## GEO-012 · CI completa

- backend;
- frontend;
- contratos;
- build;
- E2E;
- captura;
- bundle.

---

## Definition of Done

```text
[ ] setup limpio
[ ] ingestión real
[ ] segunda ejecución idempotente
[ ] observaciones persistentes
[ ] eventos y revisiones
[ ] API espacial
[ ] interfaz operacional
[ ] procedencia y dos latencias
[ ] pruebas y CI
[ ] documentación
[ ] demo
```

Después:

```text
M1: AEMET + DGT como eventos nativos
M2: Assets + Impacts
M3: Rules + Alerts
```
