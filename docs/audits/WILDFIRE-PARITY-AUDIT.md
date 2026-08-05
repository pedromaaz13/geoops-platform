# Auditoria de paridad wildfire

Repositorio origen: `pedromaaz13/incendios_forestales_app`  
Ruta local inspeccionada: `../incendios_forestales_app`  
Commit inspeccionado: `2d7451a38847ba48bd0fb63c6e76622407fd523c`  
Estado inicial del origen: `?? .DS_Store` preexistente, no modificado por esta tarea.

## Criterio

Para la vertical wildfire, GeoOps no debe quedar por debajo del visor original en informacion operacional, trazabilidad, degradacion, claridad temporal, mapa, filtros, capas, ficha, movil y pruebas.

## Matriz

| Capacidad | Visor original | GeoOps actual | Accion |
|---|---|---|---|
| Dos latencias | PARIDAD: `manifest.pipeline_age_seconds` y `worst_data_age_seconds` visibles y separadas. | PARIDAD: topbar y timeline muestran edad del dato y edad del pipeline por separado. | Mantenerlo en pruebas de UI. |
| Banner degradado | PARIDAD: banner operativo cuando fuentes criticas fallan, envejecen o hay demo. | PARIDAD: banner demo/degradacion/error derivado de manifest y source health. | Anadir casos E2E de `failed/stale/partial` cuando existan fixtures. |
| Buscador | PARIDAD: buscador local por nucleo/lugar, carga diferida y centra mapa. | PENDIENTE: busqueda local por eventos y activos; no hay indice IGN/poblaciones/fincas. | Crear tarea especifica para gazetteer local cuando se incorporen fixtures de lugares. |
| Salud de fuentes | PARIDAD: lista por fuente con estado, edad, precision, registros, errores y degradacion. | PARIDAD: `/v1/sources/health` enriquecido y panel detallado. | Ampliar fixtures de fuentes con fallos reales. |
| Resumen 24 h | PARIDAD: resumen de incidentes, satelite/oficial, focos y supresiones. | PARIDAD: resumen API/UI con recientes, impactos, hotspots y FRP desde manifest/eventos. | Separar oficialmente satelite/oficial cuando el contrato exponga esos contadores por evento. |
| Evolucion | PARIDAD: evolucion diaria/temporal y avisos de dia parcial. | PARIDAD: timeline global y ficha con observaciones/revisiones. | Anadir visualizaciones agregadas por dia cuando haya historico mayor. |
| Filtros | PARIDAD: periodo, confianza, sensores, origen y mapa/lista sincronizados. | PENDIENTE: periodo, estado, fuente, impacto y alerta; faltan confianza/sensor/origen visibles. | Exponer y probar filtros de atributos wildfire cuando el contrato los estabilice. |
| Cruces | PARIDAD: cruces con capas/activos y explicacion. | PARIDAD: impactos evento-activo con distancia, razones y linea de mapa. | Incorporar cruces con capas externas en cortes posteriores. |
| Activos | PARIDAD: activos del usuario en navegador y cruces locales. | SUPERADO: GeoOps persiste activos MVP en PostGIS y recalcula impactos/alertas. | Mantener advertencia sobre persistencia MVP y privacidad futura. |
| Capas | PARIDAD: multiples capas y carga bajo demanda. | PARIDAD: registry inicial con eventos, incertidumbre, activos e impactos; futuras capas documentadas como no implementadas. | No mostrar capas futuras como datos disponibles. |
| Mapas base | PARIDAD: selector de cinco mapas base. | PENDIENTE: selector oscuro/claro/satelite; menos opciones que el visor. | Anadir mas basemaps solo si aportan lectura operacional. |
| Leyenda | PARIDAD: leyenda contextual con incertidumbre y fuentes. | PARIDAD: leyenda de severidad, precision, activos e impactos. | Hacerla dependiente de filtros avanzados futuros. |
| Lista viewport | PARIDAD: lista sincronizada con mapa visible. | PARIDAD: lista filtrada por bounds de MapLibre cuando el mapa esta disponible. | Anadir prueba de moveend/bounds. |
| Ficha | PARIDAD: ficha rica con resumen, procedencia, precision y enlace. | PARIDAD: ficha flotante con resumen, evidencias, evolucion, impactos y fuentes. | Incorporar enlace permanente visible si se decide en UI. |
| Mobile drawer | PARIDAD: panel movil con overlay, cierre y caso principal. | PARIDAD: drawer compacto sin scroll global y mapa visible. | Refinar cierre/alternancia del drawer. |
| URL | PARIDAD: seleccion y contexto compartible. | PARIDAD: `event`, `time`, `layers`, `status`, `source`, `impact`, `alert`. | Anadir bbox cuando se estabilice UX de viewport. |
| WebGL fallback | PARIDAD: mensaje explicito si WebGL/mapa falla. | PARIDAD: `mapStatus` y overlay de eventos/activos por coordenadas reales para evitar pantalla en blanco. | Mantener capturas que detecten mapa vacio. |
| Pruebas | PARIDAD: amplia suite con Vitest, pytest y Playwright. | PENDIENTE: suite incrementada pero muy inferior en volumen al visor original. | Crear tareas de regresion visual/fuentes/filtros antes de recomendar merge final. |

## Reutilizacion documentada

- Arranque degradable y mapa independiente del visor: `web/src/main.ts`.
- Separacion de latencias y salud de fuentes: `web/src/ui/paneles.ts`.
- Lista sincronizada con contexto visible: `web/src/ui/lista.ts`.
- Ficha con procedencia e incertidumbre: `web/src/ui/ficha.ts`.
- Buscador local y accesible: `web/src/ui/buscador.ts`.
- Filtros MapLibre/lista: `web/src/ui/filtros.ts`.
- Evolucion temporal: `web/src/ui/evolutivo.ts`.
- Capas y estilos MapLibre: `web/src/map/capas.ts`, `web/src/map/estilos.ts`.

## Pendientes vivos

- Buscador geografico con indice de poblaciones/lugares equivalente al visor.
- Filtros de confianza, sensor y origen si se consolidan como contrato publico.
- Mas mapas base solo si mejoran lectura operacional.
- Suite de pruebas aun muy por debajo del volumen del visor original.
- Pruebas E2E especificas para fuentes `failed`, `stale` y `partial`.

## Capturas generadas

- `artifacts/screenshots/geoops-desktop-overview.png`
- `artifacts/screenshots/geoops-source-health.png`
- `artifacts/screenshots/geoops-evolution.png`
- `artifacts/screenshots/geoops-layers.png`
- `artifacts/screenshots/geoops-event-detail.png`
- `artifacts/screenshots/geoops-assets-alerts.png`
- `artifacts/screenshots/geoops-mobile.png`

## Pendientes criticos iniciales cerrados parcialmente

- Dos latencias globales claras.
- Banner de degradacion/demo.
- Salud de fuentes completa para datos disponibles.
- Timeline/evolucion inicial.
- Layer registry y basemaps iniciales.
- Lista de viewport.
- Ficha por pestanas.
- Mobile drawer inicial.
- Pruebas y capturas iniciales.
