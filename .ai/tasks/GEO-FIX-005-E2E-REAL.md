# GEO-FIX-005 · Un test de integración real front↔back

Estado: previsto, no implementado. Fuente de diseño: `docs/GEOOPS-REVISION-2.md §7`.

## Pregunta que responde

¿Existe al menos un E2E sin mocks que verifique que la consola muestra un evento servido
por la API real?

## Problema

Los E2E actuales usan `page.route` para mockear la API, así que no detectan drift real
entre frontend y backend. Además `AGENTS.md` promete `make test-contract`, que no existe.

## Evidencia

- No existe target `test-contract`: `Makefile:11` (lista de `.PHONY` sin él); `AGENTS.md:396`.
- Existe `make demo` para levantar datos: `Makefile:11`.

## Objetivo

Un único E2E real, lento, que levante datos reales y verifique el evento del fixture en
la consola.

## Alcance

### Incluye
- Un E2E sin `page.route`: `make demo` levanta datos reales, la API real responde,
  Playwright verifica el evento del fixture en la consola.
- Target `make test-contract` que lo ejecute, añadido a `make check`.

### No incluye
- Ampliar la cobertura E2E más allá de ese único test.

## Reutilización

Reaprovecha `make demo`/`reset-demo` y la suite Playwright existente; añade un spec sin
mocks y el target que falta.

## Diseño

Spec Playwright que arranca contra la API real levantada por `demo`; target
`test-contract` en el Makefile; integración en `check` y CI.

## Archivos probables

- `apps/web/` (spec Playwright sin mocks)
- `Makefile` (target `test-contract`)
- workflow de CI

## Dependencias

Requiere PostGIS y `demo`. Se apoya en GEO-FIX-003 para contratos estables.

## Riesgos silenciosos

- Test lento y flakey si no se espera correctamente a datos/estado.
- Fixture de demo que se desincronice del assert.

## Plan

1. Crear el spec E2E real contra la API levantada por `demo`.
2. Añadir el target `test-contract`.
3. Incorporarlo a `make check` y CI.

## Pruebas

El propio E2E: la consola muestra el evento del fixture servido por la API real.

## Criterios de aceptación

- [ ] Un E2E sin `page.route` verde.
- [ ] `make test-contract` existe y está en `make check`.

## Documentación

- [ ] `AGENTS.md` y `docs/08` describen `test-contract` como target real.
