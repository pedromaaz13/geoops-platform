# Hallazgos GEO-CORE-001 (no bloqueantes)

De la revisión externa del PR #19. Ninguno bloquea el merge; se registran para
las tareas que los van a encontrar.

## 1 · `ST_PointOnSurface` sobre geometría nula/vacía revienta en base

`representative_point` es `GENERATED ALWAYS AS (ST_PointOnSurface(geometry)) STORED`.
`ST_PointOnSurface` sobre una geometría **nula o vacía** lanza error de PostGIS, así
que un `INSERT` con geometría vacía falla **en la base**, no en la API, con un
mensaje que no le dice nada al cliente.

- **Cuándo pega:** al conectar AEMET (`GEO-FIX-008`), un CAP con polígono degenerado
  o vacío lo va a encontrar.
- **Salida limpia:** validar/normalizar la geometría en el adaptador antes del
  `INSERT` (rechazar vacías, `ST_MakeValid`), y/o traducir el error de base a una
  causa accionable. Abordar en `GEO-FIX-008`.

## 2 · La migración `0002` es de ida tras el primer polígono real

El `downgrade()` revierte a `POINT` con `ST_Force2D`, correcto solo si toda la
geometría es puntual (caso `make demo`). En cuanto una fuente poligonal escriba
áreas/líneas, el `downgrade` perdería datos.

- **Estado:** documentado ya en `docs/adr/ADR-004` como consecuencia. No ejecutar el
  `downgrade` sobre una base con geometría no puntual.
