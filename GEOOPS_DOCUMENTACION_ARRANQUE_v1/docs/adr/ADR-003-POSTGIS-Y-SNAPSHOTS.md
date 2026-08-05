# ADR-003 · PostGIS operacional y snapshots públicos

## Estado

Aceptado.

## Decisión

PostGIS mantiene estado operacional. Los portales públicos pueden consumir
snapshots inmutables desde almacenamiento objeto y CDN.

## Motivo

Combina consultas privadas y reglas con la resiliencia probada del visor
estático ante picos.
