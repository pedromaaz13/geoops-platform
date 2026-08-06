# GEO-UI-005 · UX de marcadores del mapa

Estado: previsto, no implementado. Origen: auditoría UI/UX (PR #16), no estaba fichado.

## Pregunta que responde

¿Puede el usuario interactuar con los marcadores de incendio en el mapa (hover y click)
de forma que se sienta clicable?

## Problema

El handler de click existe sobre la capa `events`, pero **no hay feedback de hover
(cursor pointer) ni área de acierto ampliada**, y el círculo es pequeño. Resultado:
clicar el punto en el mapa "no funciona" en la práctica (solo funciona desde la lista).

## Evidencia

- Click cableado a la capa `events`: `apps/web/src/features/map/OperationsMap.tsx` (`map.on('click', 'events', …)`).
- No hay `mouseenter`/`mouseleave` que cambie el cursor ni capa de hit-area ampliada.
- Confirmado en pruebas de navegador: click desde la lista abre ficha; click en el
  marcador del mapa rara vez acierta el píxel.

## Objetivo

Que los marcadores respondan como elementos interactivos: cursor pointer al pasar, área
de acierto cómoda y realce visual en hover, manteniendo el click → selección.

## Alcance

### Incluye
- `mouseenter`/`mouseleave` sobre la capa `events` que fijen `cursor: pointer`.
- Área de acierto ampliada (capa de círculo transparente mayor, o radio mínimo mayor).
- Realce sutil en hover (opacidad/stroke) coherente con la paleta.

### No incluye
- Reconciliación ni cambios de datos; solo interacción del frontend.
- Clustering de marcadores (queda para cuando haya volumen real de eventos).

## Reutilización

Capa `events` y `onSelectEvent` ya existentes en `OperationsMap.tsx`; el patrón de
`map.on(...)` del click actual.

## Diseño

Capa de hit-area transparente por encima del círculo visible (radio mayor), handlers de
hover que cambian el cursor vía `map.getCanvas().style.cursor`, y un estado de hover que
resalta el marcador.

## Archivos probables

- `apps/web/src/features/map/OperationsMap.tsx`.
- `apps/web/src/styles.css` (si el realce necesita tokens).

## Dependencias

Ninguna. Independiente del backend.

## Riesgos silenciosos

- Un hit-area demasiado grande solapa marcadores cercanos → dimensionar por zoom.
- Fugas de listeners de hover si no se limpian al desmontar.

## Plan

1. Añadir capa de hit-area ampliada sobre `events`.
2. Handlers de hover → cursor pointer + realce.
3. Verificar en navegador que el click en el marcador abre la ficha de forma fiable.

## Pruebas

- E2E/manual: hover cambia el cursor; click en el marcador selecciona el evento.

## Criterios de aceptación

- [ ] Cursor pointer al pasar sobre un marcador.
- [ ] Click en el marcador del mapa abre la ficha de forma fiable.
- [ ] Realce de hover coherente con la paleta.

## Documentación

- [ ] Nota en `docs/09-INTERFAZ-Y-VISUALIZACION.md` si cambia la interacción documentada.
