# Interfaz y visualización

## Estado MVP wildfire

La consola `/operations` implementa mapa MapLibre, lista de eventos, detalle con
procedencia y latencias separadas, salud de fuentes, creación de activo puntual,
regla de proximidad, alerta interna y acknowledge. No hay todavía layer registry,
timeline avanzada, deck.gl ni Kepler.gl.

Tras `GEO-UI-001`, la vista se presenta como pantalla GIS fija: no hay scroll
global, el mapa ocupa el área central con basemap visible y los controles viven
en paneles/dock compactos dentro del viewport.

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

MapLibre es el motor base:

- cámara;
- estilos;
- vector tiles;
- PMTiles;
- GeoJSON pequeño/mediano;
- carreteras;
- municipios;
- infraestructura;
- eventos;
- polígonos;
- etiquetas;
- filtros sencillos.

## 3. deck.gl

Se utiliza solo para necesidad analítica:

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

Kepler vive en `/lab`, cargado de forma diferida.

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

- carga diferida;
- consultas por bbox;
- simplificación;
- clustering;
- PMTiles/MVT para volumen;
- deck.gl cuando aporte GPU;
- presupuesto de bundle;
- medición en móvil.
