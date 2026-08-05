# GEO-DATA-UI-001 · Escenarios de datos para validar la consola

## Pregunta que responde
Con que datos probamos que la UI tolera estados reales y no solo el fixture feliz?

## Problema
La UI se estaba validando con pocos datos y eso ocultaba cortes, autoseleccion, paneles intrusivos y estados vacios poco claros.

## Evidencia
- Capturas recientes muestran `Eventos visibles` pobre, detalle abierto sin accion y mapa sin lectura.
- Los tests E2E actuales mockean un unico evento principal.

## Objetivo
Añadir escenarios de test frontend que cubran normal, vacio, muchos eventos, nombres largos, precision ausente, fuente degradada y API caida.

## Alcance
### Incluye
- Fixtures/mocks E2E de UI.
- Pruebas de comportamiento para seleccion explicita, paneles y estados vacios.

### No incluye
- Nuevas fuentes externas.
- Migraciones de datos.
- Cambios de contrato API.

## Reutilización
Se conserva el contrato `/v1` actual y se generan respuestas mockeadas en Playwright para escenarios de interfaz.

## Diseño
Los escenarios UI viven junto a los E2E para no contaminar fixtures de ingesta.

## Archivos probables
- `apps/web/tests/e2e/operations.spec.ts`
- `apps/web/src/App.test.tsx`

## Dependencias
Ninguna nueva.

## Riesgos silenciosos
- Mockear una API que no coincide con el contrato real.
- Validar solo texto y no layout/overflow.

## Plan
1. Extraer builders de escenario dentro del test E2E.
2. Añadir caso sin autoseleccion.
3. Añadir caso empty/error/degraded.
4. Añadir comprobaciones de no scroll global y paneles cerrables.

## Pruebas
- `pnpm --filter @geoops/web test`
- `pnpm --filter @geoops/web e2e`

## Criterios de aceptación
- [x] Hay prueba de que no se abre detalle sin seleccion.
- [x] Hay prueba de paneles cerrables.
- [x] Hay prueba de empty state accionable.
- [x] Hay prueba de API no accesible mediante mensaje accionable existente y E2E mockeado.

## Documentación
- [x] `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`
