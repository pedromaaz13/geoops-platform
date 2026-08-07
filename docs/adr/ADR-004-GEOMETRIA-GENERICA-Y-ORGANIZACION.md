# ADR-004 · Geometría genérica y organización

## Estado

Aceptado (GEO-CORE-001).

## Contexto

El producto son avisos sobre activos de terceros. Los avisos AEMET son zonas
(polígonos), los cortes DGT son líneas y las parcelas o recintos son polígonos.
Hasta ahora `Event/Observation/Asset.geometry` eran `Geometry("POINT", 4326)`, lo
que hacía imposible representarlos. Además no existía `Organization`: activos,
reglas, alertas e impactos no tenían dueño, una fuga de datos esperando a ocurrir
en un producto multiempresa.

## Decisión

1. La geometría de `events`, `observations` y `assets` pasa a
   `Geometry("GEOMETRY", 4326)` con `CHECK (ST_SRID(geometry) = 4326)`. Sin el
   CHECK, `GEOMETRY` acepta basura que revienta meses después dentro de
   `ST_DWithin`.
2. `geometry_kind` (point|line|area) y `representative_point` (`ST_PointOnSurface`)
   son **columnas GENERATED STORED**, no valores mantenidos por el normalizador.
   `ST_GeometryType` y `ST_PointOnSurface` son IMMUTABLE, así que Postgres las
   mantiene siempre coherentes.
3. Se introduce `organizations` y `organization_id NOT NULL` en `assets`,
   `alert_rules`, `alerts` e `impacts`, con backfill a una organización por
   defecto. La organización activa se fija por `GEOOPS_ORGANIZATION_ID` y se
   inyecta por dependencia de FastAPI. **No** hay autenticación: eso es
   `GEO-PROD-001`.

## Alternativa descartada

Mantener `geometry_kind`/`representative_point` en el normalizador. Se descartó:
añade una segunda fuente de verdad que puede desincronizarse (contra `AGENTS §1.7`)
y obliga a tocar el adaptador wildfire, que debe seguir funcionando igual. Con
columnas generadas, el normalizador y el adaptador escriben solo `geometry`.

## Consecuencias

- Eventos y activos no puntuales se pueden almacenar, servir y pintar (capas
  fill/line en el mapa filtradas por `geometry-type`).
- `representative_point` da un punto barato para cámara, etiquetas y clustering
  sin recalcular en el cliente.
- Aislamiento por organización verificado con un test **por endpoint**; olvidar un
  filtro es una fuga entre clientes.
- El contrato cambia: `PointGeometry` se reserva para `representative_point` y la
  geometría del evento pasa a GeoJSON genérico; `openapi.json` y `api-types.ts` se
  regeneran.
- Falta la autenticación real (usuarios, RLS): queda para `GEO-PROD-001`. Hasta
  entonces la organización es fija por entorno.
- **La migración es de ida en cuanto exista el primer polígono real.** El
  `downgrade()` revierte la geometría a `POINT` con `ST_Force2D`, lo que solo es
  correcto si toda la geometría es puntual (caso `make demo`). En cuanto una fuente
  poligonal (AEMET, perímetros) haya escrito áreas o líneas, ese `downgrade`
  perdería datos: se debe tratar como no reversible y no ejecutarse sobre una base
  con geometría no puntual.
