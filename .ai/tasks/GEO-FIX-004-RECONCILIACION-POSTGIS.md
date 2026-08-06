# GEO-FIX-004 · Reconciliación sobre PostGIS

Estado: previsto, no implementado. Fuente de diseño: `docs/GEOOPS-REVISION-2.md §7`.
Es la única de este bloque que toca la migración.

## Pregunta que responde

¿Se calculan los candidatos de reconciliación en la base con PostGIS, o en Python sobre
coordenadas duplicadas en `attributes`?

## Problema

La reconciliación duplica coordenadas en `attributes["geometry_coordinates"]` y calcula
distancias en Python, en vez de usar el índice espacial GiST y filtrar la ventana
temporal en SQL.

## Evidencia

- Coordenadas duplicadas en `attributes`: `services/api/geoops_api/wildfire_ingest.py:530`, `:653`, `:685`.
- Distancia calculada en Python: `services/api/geoops_api/wildfire_ingest.py:433` (`_distance_m`), usada en `:482`.
- Lectura de coords derivadas: `services/api/geoops_api/wildfire_ingest.py:411`, `:443`.

## Objetivo

Reconciliación espacial en la base, sin coordenadas derivadas, con parámetros por
`event_type`.

## Alcance

### Incluye
- Eliminar `attributes["geometry_coordinates"]` y `_distance_m`.
- Candidatos por `ST_DWithin` sobre el índice GiST, filtrando ventana temporal en SQL.
- Parámetros de reconciliación por `event_type`, en tabla o configuración.

### No incluye
- Cambiar la semántica de eventos/revisiones más allá de la selección de candidatos.

## Reutilización

Reaprovecha `Event.geometry` (PostGIS, SRID 4326, `models.py:87`) y el índice GiST;
sustituye el cálculo en Python.

## Diseño

Consulta `ST_DWithin` con ventana temporal en el `WHERE`; tabla o config de tolerancias
por `event_type`; migración si hace falta índice/columna.

## Archivos probables

- `services/api/geoops_api/wildfire_ingest.py` (`_find_event`, `_merge_event_snapshot`)
- `alembic/` (índice GiST / parámetros si aplica)

## Dependencias

Requiere PostGIS operativo en pruebas. Base para GEO-FIX-002 (distancias correctas).

## Riesgos silenciosos

- Regresión en los casos actuales del fixture al cambiar el criterio de candidatos.
- SRID o unidades incorrectas en `ST_DWithin`.

## Plan

1. Añadir consulta `ST_DWithin` con ventana temporal en SQL.
2. Parametrizar tolerancias por `event_type`.
3. Eliminar coords duplicadas y `_distance_m`.
4. Test de no regresión con el fixture actual.

## Pruebas

No regresión con los casos actuales del fixture de reconciliación.

## Criterios de aceptación

- [ ] Sin `attributes["geometry_coordinates"]` ni `_distance_m`.
- [ ] Candidatos por `ST_DWithin` + ventana temporal en SQL.
- [ ] Tolerancias por `event_type`.

## Documentación

- [ ] `docs/03` y `docs/07` describen la reconciliación real sobre PostGIS.
