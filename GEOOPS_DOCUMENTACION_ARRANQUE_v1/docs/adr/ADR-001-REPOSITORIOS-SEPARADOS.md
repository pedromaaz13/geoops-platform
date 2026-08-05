# ADR-001 · Repositorios separados

## Estado

Aceptado.

## Contexto

El visor de incendios es un producto público estático y especializado. GeoOps
necesita persistencia, API, activos, reglas y espacios privados.

## Decisión

Mantener `incendios_forestales_app` y `geoops-platform` separados, conectados por
contratos versionados.

## Consecuencias

- se protege la estabilidad del visor;
- se evita mezclar dominios;
- GeoOps puede evolucionar con backend;
- se necesita contrato y tests de compatibilidad;
- el código común se extrae solo cuando exista reutilización real.
