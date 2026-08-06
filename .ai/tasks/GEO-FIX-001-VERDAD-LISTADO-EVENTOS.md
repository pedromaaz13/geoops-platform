# GEO-FIX-001 · Verdad en el listado de eventos

Estado: **implementado** en `geo-fix-001-listado-veraz` (PR draft). Fuente de diseño:
`docs/GEOOPS-REVISION-2.md §7`. Evidencia: `operations.py` (orden/cursor/total_matched),
`main.py` (400 params desconocidos), `tests/api/test_events_pagination.py`.

## Pregunta que responde

¿Refleja `/v1/events` de forma honesta cuántos eventos existen, en qué orden y si la
página está truncada?

## Problema

El listado ordena por UUID, pagina sobre `id` y declara `partial` fijo, así que un
cliente no puede saber si faltan resultados ni recorrer páginas de forma estable.

## Evidencia

- Orden por UUID: `services/api/geoops_api/operations.py:158` (`order_by(Event.id)`).
- Cursor sobre `id`: `services/api/geoops_api/operations.py:155` (`Event.id > cursor`).
- `partial` codificado a `False`: `services/api/geoops_api/operations.py:167`.
- Parámetros desconocidos ignorados en vez de rechazados (sin validación de query).

## Objetivo

Que el listado sea veraz: orden estable, cursor consistente, truncamiento declarado y
rechazo explícito de parámetros inválidos.

## Alcance

### Incluye
- `meta.partial = true` al truncar por `limit`, más `meta.total_matched`.
- Orden estable por `(last_observed_at DESC, id)`.
- Cursor sobre esa clave compuesta, no sobre `id`.
- El front consume `next_cursor` y muestra «mostrando N de M».
- Rechazo con 400 de parámetros desconocidos.

### No incluye
- Cambios de esquema en la migración.
- Contratos tipados (`response_model`): eso es GEO-FIX-003.

## Reutilización

Reaprovecha la paginación por cursor ya presente en `operations.list_events`; cambia la
clave de orden y la semántica de `meta`.

## Diseño

Clave compuesta de orden y cursor; `total_matched` con `COUNT` filtrado; validación de
query params que devuelva el campo concreto en el error.

## Archivos probables

- `services/api/geoops_api/operations.py`
- `services/api/geoops_api/main.py` (validación de query)
- `apps/web/src/app/App.tsx` (consumo de `next_cursor` y contador)

## Dependencias

Ninguna nueva. Conviene coordinar con GEO-FIX-003 para tipar la respuesta.

## Riesgos silenciosos

- Cursor inestable si dos eventos comparten `last_observed_at` sin desempate por `id`.
- `total_matched` costoso sin índice adecuado.

## Plan

1. Cambiar orden y cursor a la clave compuesta.
2. Añadir `total_matched` y `partial` reales a `meta`.
3. Rechazar parámetros desconocidos con 400 y campo concreto.
4. Consumir `next_cursor` y contador en la consola.

## Pruebas

250 eventos → dos páginas, `partial=true` en la primera, sin duplicados.

## Criterios de aceptación

- [x] Orden estable y cursor sobre `(last_observed_at DESC, id)`.
- [x] `meta.partial` y `meta.total_matched` veraces.
- [x] Parámetros desconocidos → 400 `INVALID_REQUEST`.
- [x] El front muestra «Mostrando N de M».

## Documentación

- [x] `docs/06-CONTRATOS-Y-APIS.md` actualizado con la nueva semántica de `meta`.
- [x] `docs/11-ESTADO-DEL-PROYECTO.md` marca el defecto como cerrado.
