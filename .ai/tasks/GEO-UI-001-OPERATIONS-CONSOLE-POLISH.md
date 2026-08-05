# GEO-UI-001 · Operations Console GIS polish

## Problema

La primera consola `/operations` demuestra el flujo MVP, pero no se comporta ni
se percibe como una pantalla operacional GIS: el mapa aparece sin cartografía
base visible, hay scroll global y los controles ocupan una banda inferior de
formulario.

## Evidencia

Capturas de usuario del 2026-08-05: panel central sin mapa reconocible,
contenido partido por scroll vertical y controles grandes bajo la vista.

## Alcance

- Rediseñar únicamente `/operations`.
- Mantener API, modelo, ingesta y demo actuales.
- Añadir basemap visible en MapLibre sin nuevas dependencias.
- Convertir la vista en una pantalla fija tipo control room.
- Mantener creación de activo, regla y acknowledge, pero como herramientas
  compactas.

## Fuera de alcance

- DGT/AEMET.
- Nuevas fuentes.
- Cambios de base de datos.
- deck.gl, Kepler.gl o layer registry completo.
- Autenticación, roles o multiempresa.

## Riesgos

- Mapa aparentemente operativo pero sin tiles visibles.
- Scroll global que impide usarlo como consola.
- Pérdida de procedencia por comprimir demasiado la ficha.
- Test E2E acoplado a textos de layout viejo.

## Validación

- Vitest de render de procedencia.
- Playwright smoke del flujo asset-rule-alert.
- Build frontend.
- Inspección manual en `http://127.0.0.1:5173/operations`.

## Resultado

- [x] Layout fijo `100dvh` sin scroll global.
- [x] Basemap visible en MapLibre.
- [x] Canvas MapLibre ocupa todo el panel central.
- [x] Paneles laterales estilo consola GIS.
- [x] Dock inferior compacto y responsive.
- [x] Pruebas frontend actualizadas.
- [x] Validación frontend ejecutada.

## Plan

1. Reestructurar layout fijo de consola.
2. Añadir basemap raster y overlays de eventos/assets.
3. Compactar paneles laterales y eliminar banda inferior.
4. Ajustar estilos para `100dvh` sin scroll global.
5. Actualizar pruebas.
6. Ejecutar validación frontend.
