# Hallazgo diferido · `total_matched` hace un COUNT por petición

Origen: revisión de GEO-FIX-001 (PR #18). No bloquea; se difiere a **GEO-VIZ**.

## Observación

`list_events` (`services/api/geoops_api/operations.py`) calcula
`meta.total_matched` con `SELECT count(*)` sobre el `WHERE` filtrado en **cada**
petición. Al volumen actual (decenas de eventos) es irrelevante.

## Por qué importará después

Cuando entren la **malla de exposición** (GEO-VIZ-001/002) y una **fuente real**
con muchos eventos, ese `COUNT` sobre un `WHERE` con **filtro espacial**
(`ST_Intersects`/bbox) se nota: es una segunda pasada cara sobre el índice.

## Salida limpia (para GEO-VIZ)

Contar solo cuando se ha truncado. Si la primera página (sin cursor) devuelve
**menos de `limit`** filas, ya conoces el total sin preguntar:
`total_matched = len(features)` y `partial = false`, sin `COUNT`. El `COUNT` solo
es necesario cuando la página va llena y hay más. Así el caso común (pocos
eventos) no paga la segunda query.

Nota: con cursor keyset stateless no se conoce el total en páginas posteriores
sin COUNT; valorar si `total_matched` solo se garantiza en la primera página o si
se acepta un coste acotado. Decidir al abordar GEO-VIZ.
