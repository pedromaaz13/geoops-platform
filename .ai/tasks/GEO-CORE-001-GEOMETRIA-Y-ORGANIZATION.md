# GEO-CORE-001 · Geometría genérica y Organization

Estado: en planificación (rama `geo-core-001-geometria-y-organizacion`). Requiere
**aprobación del plan antes de escribir código** (tarea de mayor riesgo). Orden:
`docs/16-PROMPTS-DE-SESION.md` sesión 2.

## Pregunta que responde

¿Puede GeoOps representar avisos y activos no puntuales (zonas AEMET, cortes DGT,
parcelas, recintos) y aislar los datos por organización?

## Problema

`Event.geometry` y `Asset.geometry` son `Geometry("POINT", 4326)`: imposible pintar
zonas/líneas. No existe `Organization`: activos, reglas, alertas e impactos no
tienen dueño → fuga de datos entre clientes en un producto multiempresa.

## Evidencia

- `services/api/geoops_api/models.py`: `POINT` en Event/Observation/Asset; sin `Organization`.
- `services/api/geoops_api/operations.py`: ninguna query filtra por organización.

## Objetivo

Geometría GeoJSON genérica (point|line|area) con SRID e índice espacial, y
`Organization` con aislamiento verificado por endpoint. El adaptador wildfire sigue
funcionando **exactamente igual** (puntual).

## Alcance

### Incluye
1. Migración `0002`: Event, Observation, Asset → `Geometry("GEOMETRY", 4326, spatial_index=True)`, `ALTER ... USING ST_Force2D(geometry)`.
2. `CHECK (ST_SRID(geometry) = 4326)` en las tres tablas.
3. Columna `geometry_kind` (point|line|area) — generada o mantenida en normalizador (decidir + ADR).
4. `representative_point` (POINT) con `ST_PointOnSurface` para etiquetas/clustering.
5. Tabla `organizations` + `organization_id NOT NULL` en assets, alert_rules, alerts, impacts; seed org por defecto + backfill.
6. `OrganizationContext` por dependencia FastAPI (fijo por env var de momento); **todas** las queries de `operations.py` filtran por él.
7. Índice compuesto GiST `(organization_id, geometry)` en assets.
8. `schemas.py`: geometría GeoJSON genérica (fin de `PointGeometry`); regenerar `openapi.json` + `api-types.ts`.
9. Front mínimo: `OperationsMap` añade capas `fill` y `line` filtradas por geometry-type (tokens de `styles.css`, sin hex nuevo, estilos según `docs/15 §4`).

### No incluye
- Autenticación / login / RLS Postgres → es `GEO-PROD-001`.
- Dibujo de polígonos en la UI, importación SIGPAC, rediseño de consola (`GEO-FIX-007`).
- Cambiar el adaptador wildfire (sigue puntual, comportamiento idéntico).

## Riesgo silencioso principal

Filtrar por organización en doce sitios y **olvidar uno** = fuga entre clientes.
Cubrir con test **por endpoint** (no genérico): dos organizaciones, aislamiento
verificado en cada endpoint que devuelva activos, impactos, reglas o alertas.

## Pruebas (test que falla ANTES de implementar)

- Insertar evento poligonal y recuperarlo por `GET /v1/events`.
- Activo lineal contra evento poligonal: el impacto se calcula.
- Migración up y down sobre base con datos de `make demo`.
- Invariantes wildfire y paginación (GEO-FIX-001) pasan sin cambio de comportamiento.
- Aislamiento por organización en cada endpoint (uno por endpoint).

## Documentación

- ADR para `geometry_kind` (generada vs normalizador) y para la introducción de `Organization`.
- `docs/05` (modelo), `docs/06` (contrato geometría), `docs/11` (estado).

## Cierre

Rama `geo-core-001-geometria-y-organizacion`. PR draft. Sin merge. Formato AGENTS §12.
