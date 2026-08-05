# GEO-UI-004 · Rediseño de consola operacional map-first

## Pregunta que responde
Como convertimos `/operations` en una consola operacional usable, sin paneles invasivos, sin navegacion duplicada y con mapa real como protagonista?

## Problema
La UI actual funciona parcialmente, pero se percibe cruda: topbar comprimida, panel de busqueda fijo, detalle autoseleccionado, tabs duplicadas y mapa poco visible.

## Evidencia
- Capturas de usuario del 2026-08-05.
- `apps/web/src/app/App.tsx` autoselecciona `events[0]`.
- `GlobalTopBar` duplica navegacion del rail con `workspaceTabs`.

## Objetivo
Redisenar la consola para que el rail sea la navegacion principal, el mapa tenga prioridad, los paneles sean cerrables y el detalle solo aparezca tras seleccion explicita.

## Alcance
### Incluye
- Layout map-first.
- Rail principal tipo consola.
- Busqueda/filtros/capas en drawers o paneles cerrables.
- Lista/historico de eventos accionable.
- Detalle cerrable con tabs.
- Estados empty/error/degraded.
- Capturas desktop/mobile.

### No incluye
- Nuevas verticales.
- deck.gl, Kepler.gl o dependencias UI pesadas.
- Nuevas fuentes externas.
- Merge a `main`.

## Reutilización
Se mantiene React, MapLibre, `lucide-react`, hooks de datos y endpoints existentes.

## Diseño
La consola debe acercarse a `docs/design/references/geoops-visual-direction.png`: oscura, densa, profesional y mapa protagonista.

## Archivos probables
- `apps/web/src/app/App.tsx`
- `apps/web/src/features/map/OperationsMap.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/App.test.tsx`
- `apps/web/tests/e2e/operations.spec.ts`

## Dependencias
Ninguna nueva.

## Riesgos silenciosos
- Que el mapa falle por tiles externos y parezca vacio.
- Que el bbox o filtros oculten eventos reales.
- Que mobile reintroduzca scroll global.

## Plan
1. Quitar autoseleccion.
2. Eliminar tabs superiores duplicadas.
3. Convertir contexto en drawer cerrable.
4. Convertir detalle en panel cerrable tras seleccion.
5. Mejorar lista de eventos y estados.
6. Ajustar mapa/fallback y layout responsive.
7. Probar con datos y navegador.

## Pruebas
- React Testing Library.
- Playwright desktop/mobile.
- Browser real con `make demo && make dev`.

## Criterios de aceptación
- [x] No hay ficha abierta al cargar sin `event` en URL.
- [x] La lista permite seleccionar evento y abre ficha.
- [x] La ficha se puede cerrar.
- [x] Busqueda/filtros/capas no ocupan espacio fijo permanente.
- [x] No hay scroll global en pruebas E2E.
- [x] KPIs no se cortan en capturas desktop validadas.
- [x] El mapa muestra marcadores fallback con datos reales cuando las teselas no son visibles.

## Documentación
- [x] `docs/design/GEOOPS_UI_QUALITY_RULES.md`
- [x] `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`
