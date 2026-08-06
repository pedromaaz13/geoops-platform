# Interfaz y visualización

## Estado MVP wildfire

La consola `/operations` implementa mapa MapLibre, lista de eventos, detalle con
procedencia y latencias separadas, salud de fuentes, creación de activo puntual,
regla de proximidad, alerta interna y acknowledge. Existe un layer registry
inicial; no hay todavía timeline con reproducción, deck.gl ni Kepler.gl.

Tras `GEO-UI-001`, la vista se presenta como pantalla GIS fija: no hay scroll
global, el mapa ocupa el área central con basemap visible y los controles viven
en paneles/dock compactos dentro del viewport.

Tras `GEO-UI-002`, la consola se reconstruye como pantalla operacional
map-first:

- topbar con eventos, activos, alertas, fuentes degradadas, edad del dato y edad
  del pipeline;
- banner de degradación/demo;
- rail lateral;
- panel contextual con búsqueda local, resumen, filtros, salud de fuentes,
  capas, mapas base, activos y alertas;
- mapa persistente con `setData`, capas de eventos, incertidumbre, activos e
  impactos, y overlay de fallback con coordenadas reales para evitar pantalla en
  blanco si WebGL o tiles fallan;
- lista de eventos visibles en viewport;
- ficha flotante con pestañas `Resumen`, `Evidencias`, `Evolución`, `Impactos`
  y `Fuentes`;
- query string sincronizada mediante `history.replaceState` para selección,
  filtros principales, ventana temporal y capas; no existe React Router;
- layout móvil sin scroll global y con mapa visible.

Limitaciones vivas: el buscador no incorpora todavía un índice IGN/poblaciones
equivalente al visor original, el E2E intercepta la API con mocks y la suite de
pruebas sigue siendo más pequeña que la del visor heredado. Los filtros de
origen, sensor y confianza sí están implementados.

Tras `GEO-UI-003`, la consola recibe un pase de calidad visual e interaccion:

- CORS local preparado para Vite en `5173-5179` y errores accionables de API,
  CORS, datos vacios o demo no sembrada;
- rail izquierdo colapsable/expandible con iconos, badges, estado activo y
  tooltips;
- rail principal para `Home`, `Operaciones`, `Fuentes`, `Activos`, `Alertas`,
  `Capas`, `Analisis` y `Configuracion`, con drawer contextual cerrable;
- tabs de ficha con semantica `tablist` y persistencia en URL;
- controles compactos para selects, switches, capas y filtros;
- empty states accionables cuando no hay datos o los filtros ocultan eventos;
- reglas de calidad UI en `docs/design/GEOOPS_UI_QUALITY_RULES.md`.

---

La consola operacional se inspira en el patrón de Disaster Ninja: mapa central,
lista de eventos, detalle, capas, leyenda, herramientas y tiempo. No copia su
marca ni su implementación completa.

---

## 1. Operations

```text
TopBar
NavigationRail
EventListPanel
GeoOpsMap
EventDetailPanel
LayerPanel
LegendPanel
Timeline
SourceHealthIndicator
```

Lista, mapa, URL y ficha comparten selección.

## 2. MapLibre

MapLibre es el motor base implementado para:

- cámara;
- estilos de mapa base externos;
- GeoJSON pequeño/mediano;
- eventos;
- incertidumbre puntual;
- activos e impactos;
- filtros sencillos.

### Previsto, no implementado — 2026-08-06

- vector tiles propios y PMTiles/MVT;
- carreteras, municipios e infraestructura gobernados por GeoOps;
- polígonos de evento;
- clustering para volumen.

## 3. deck.gl

### Previsto, no implementado — 2026-08-06

deck.gl no está instalado. Solo se incorporará ante una necesidad analítica
medida:

| Caso | Capa |
|---|---|
| histórico de hotspots | HeatmapLayer / HexagonLayer |
| celdas H3 | H3HexagonLayer |
| trayectorias de ganado | TripsLayer |
| rutas | PathLayer |
| evento–activo | ArcLayer / LineLayer |
| rayos | ScreenGridLayer |
| grandes polígonos | MVTLayer |
| raster | BitmapLayer / TileLayer |

No se añade “porque parece moderno”.

## 4. Kepler.gl

### Previsto, no implementado — 2026-08-06

Kepler.gl no está instalado y no existe una ruta `/lab`. La dirección de
producto prevista es cargarlo de forma diferida en un laboratorio separado.

Uso:

- subir CSV, GeoJSON o Parquet;
- explorar;
- filtrar;
- agregar;
- cruzar;
- prototipar;
- guardar configuración.

Separación:

```text
Operations → datos gobernados, eventos, reglas y decisiones
Data Lab   → exploración e hipótesis
```

Una capa del laboratorio necesita revisión, contrato y pruebas antes de pasar a
Operations.

## 5. Layer registry

Cada capa declara:

```text
id
title
group
renderer
defaultVisible
minZoom
maxZoom
loader
legend
source
freshness
permissions
```

Añadir una capa no debe requerir modificar múltiples paneles.

Estado actual: existe un registry inicial en `apps/web/src/registries/layers.ts`
con eventos, incertidumbre, activos e impactos. Las capas futuras aparecen
documentadas como preparadas, no como datos existentes.

## 6. Diseño semántico

- colores cálidos para peligro térmico;
- fríos para infraestructura;
- desconocido visible;
- fuente y antigüedad;
- leyenda contextual;
- carga diferida;
- el mapa no queda en blanco por fallo de una capa;
- móvil como caso principal, no residual.

## 7. Ficha del evento

Pestañas:

```text
Resumen
Evidencias
Impactos
Evolución
Fuentes
```

Debe mostrar:

- estado y fuente;
- observed_at;
- ingested_at;
- precisión;
- geometría;
- observaciones;
- revisiones;
- activos;
- razones de impacto.

## 8. Timeline

M0:

- 6 h, 24 h, 3 d, 7 d;
- ahora;
- datos parciales;
- filtro temporal.

M1:

- reproducción;
- velocidad;
- revisiones;
- snapshots.

## 9. Rendimiento

Implementado actualmente:

- consultas de eventos con `bbox` fijo de cobertura España desde frontend;
- actualización de fuentes GeoJSON con `setData`;
- build con aviso vivo por el tamaño del chunk de MapLibre.

### Previsto, no implementado — 2026-08-06

- carga diferida;
- consultas por bbox del viewport;
- simplificación;
- clustering;
- PMTiles/MVT para volumen;
- deck.gl cuando aporte GPU;
- presupuesto de bundle;
- medición en móvil.
