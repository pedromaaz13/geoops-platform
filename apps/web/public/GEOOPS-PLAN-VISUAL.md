# GeoOps · del backend correcto a la interfaz de producto

Estado verificado en `main` = `2a28d5f` (PR #15 mergeado).

---

## 0. Corrección de premisa

> «necesitamos ya conectar la api, el pipeline y el back con la interfaz»

Ya están conectados. `make demo` ingiere, reconcilia, calcula impactos y evalúa
reglas; la API sirve 18 endpoints tipados; la consola los pinta en un mapa. Eso
funciona hoy.

Lo que separa a GeoOps de Disaster Ninja no es el cableado. Son tres cosas, y
sólo una es de interfaz:

1. **Geometría.** Todo lo que hace que Disaster Ninja parezca serio son
   polígonos: áreas de exposición a 60/90/120 km/h, conos de incertidumbre,
   trazas de ciclón, zonas de aviso. `Event.geometry` es `POINT`. Con puntos no
   se puede dibujar ese lenguaje visual, por muy bonito que sea el CSS.
2. **Una capa analítica propia.** El impacto visual de Kontur son las celdas
   H3 con población y edificación, y el número de cabecera: *«20.232.025
   personas, 152.339 km²»*. GeoOps calcula impacto sólo contra los activos del
   cliente. Sin una malla de exposición, un evento no tiene cifra que enseñar.
3. **Densidad y movimiento en la UI.** Registro de capas con toggles, leyenda
   bivariante, línea temporal con reproducción, panel lateral denso. Esto es lo
   más barato de los tres.

El orden importa: hacer la 3 antes que la 1 y la 2 produce una interfaz preciosa
enseñando círculos y nada más.

---

## 1. Qué es realmente Disaster Ninja

Desglose de las capturas, por coste de implementación:

| Elemento | Qué es | Coste |
|---|---|---|
| Panel de eventos con severidad, población, área, % gaps | UI + una cifra calculada por evento | bajo, si existe la cifra |
| Formas de evento: centroide, áreas de exposición, traza, cono | **polígonos y líneas** por evento | requiere GEO-CORE-001 |
| Celdas hexagonales bicolor | H3 res 7-8 con población y objetos OSM, teselado | medio-alto |
| Leyenda bivariante 3×3 | componente puro | bajo |
| Panel de capas con radios y toggles | registro de capas; **ya tienes `registries/layers.ts`** | bajo |
| Botón de chat sobre los datos | agente con acceso a la API | medio |
| Enlaces a GDACS | procedencia; **ya la tienes mejor que ellos** | hecho |

La conclusión incómoda: el 70% del efecto es **una capa de datos**, no diseño.
Kontur publica su malla de población H3 bajo licencia abierta (CC-BY), y es
justo lo que pinta ahí. Puedes usarla.

Y una ventaja tuya que ellos no tienen: procedencia por campo y revisiones. Ellos
enseñan *qué* pasa; tú puedes enseñar *quién lo dijo, cuándo cambió y por qué*.
Eso es lo que vende a una aseguradora o a un operador de red.

---

## 2. Plan

### Bloque A · Verdad antes que píxeles (1-2 semanas)

**GEO-FIX-001 · Paginación honesta.** Ya fichada. Con fixture no se nota; con
fuente real y una malla de exposición encima, un mapa que muestra 200 eventos
aleatorios y jura estar completo es indefendible. Va primero.

**GEO-CORE-001 · Geometría genérica + `Organization`.** El desbloqueo real. Sin
esto no hay áreas de exposición, ni zonas AEMET, ni parcelas de cliente, ni
multiempresa. Ojo: rompe `PointGeometry` en `schemas.py` y todo `api-types.ts`
generado — la ficha debe decirlo, y la puerta `openapi-check` lo va a cazar,
que es exactamente para lo que se puso.

### Bloque B · La capa que da el número (2-3 semanas)

**GEO-VIZ-001 · Malla de exposición H3.**
- Ingerir la malla de población de Kontur (H3, licencia abierta) recortada a
  España como fuente más, con su `SourceRun` y su doc — la misma disciplina que
  cualquier otra fuente, no un fichero suelto.
- Tabla `exposure_cell(h3_index, population, buildings, geometry)`.
- Servir como **PMTiles**, no como GeoJSON. Ya sabes hacerlo del repo de
  incendios: es reutilización directa, no aprendizaje nuevo.

**GEO-VIZ-002 · Exposición por evento.**
- `ST_Intersects` entre la geometría del evento (ya poligonal) y las celdas →
  `event_exposure(event_id, population, area_km2, buildings, calculation_version)`.
- Es el mismo patrón que `Impact`, con la malla en lugar de los activos del
  cliente. Reutiliza `calculation_version`.
- Sale de aquí el titular: *«118.400 personas, 410 km²»* en cada tarjeta.

### Bloque C · La interfaz (2-4 semanas)

**GEO-FIX-007 · Trocear `App.tsx`** (1.337 líneas). Prerrequisito estructural.
Conservar `friendlyLoadError`, el fallback de mapa y los registries.

**GEO-VIZ-003 · Panel de capas real.** Extender `registries/layers.ts` con
grupos, exclusividad (radio) y visibilidad. La UI se genera del registro: añadir
una fuente nueva no debe tocar JSX.

**GEO-VIZ-004 · Leyenda bivariante y malla en el mapa.** deck.gl `H3HexagonLayer`
sobre MapLibre, o capa `fill` con PMTiles si prefieres no meter deck.gl todavía.
Empieza por PMTiles: menos dependencias y ya lo dominas.

**GEO-VIZ-005 · Línea temporal con reproducción.** Barrer las últimas 72 h y ver
crecer los eventos. Es lo que produce la sensación de "vivo", y es barato: ya
tienes `EventRevision` con marca temporal, así que la reproducción es real, no
una animación decorativa.

**GEO-VIZ-006 · Layout de 1920.** Rejilla de cuatro columnas (rail de iconos,
panel de eventos, mapa, panel de capas), tipografía tabular en cifras, densidad
alta. La maqueta adjunta es la referencia.

### Bloque D · Después

Chat sobre los datos (aquí sí encaja tu trabajo de `agent-core`), fuente AEMET
nativa, entrega de alertas, despliegue con cron.

---

## 3. Referencias

**Para copiar el patrón de producto**
- Kontur Disaster Ninja — el frontend está publicado por Kontur en GitHub bajo
  licencia abierta. Merece la pena leer su registro de capas antes de diseñar el
  tuyo. *No he podido verificar la URL exacta; búscala como `konturio`.*
- Kepler.gl (`kepler.gl`) — el estándar de panel de capas + configuración visual.
- Palantir Blueprint (`blueprintjs.com`) — sistema de diseño abierto de Palantir.
  Es literalmente de dónde sale el "look Palantir": densidad, tipografía tabular,
  componentes para datos.

**Para el movimiento**
- Windy y Zoom Earth — reproducción temporal y partículas de viento.
- NASA Worldview — control temporal sobre capas satelitales; la barra inferior
  es el patrón que copia todo el mundo.

**Para lo técnico**
- deck.gl: `H3HexagonLayer`, `TripsLayer`, `ScatterplotLayer` sobre MapLibre.
- PMTiles + `protomaps` — ya lo usas en incendios.
- Observable Plot para los gráficos pequeños del panel.

**Datos aprovechables en España**
- Malla de población H3 de Kontur (global, CC-BY).
- SIGPAC para parcelas agrarias — define el activo del ganadero.
- Catastro (INSPIRE) para edificación.
- IGN: núcleos de población, callejero — ya lo tocaste en incendios.

> No tengo acceso a búsqueda web en esta sesión: verifica licencias y URLs antes
> de depender de cualquiera de estas fuentes.

---

## 4. Advertencia

La maqueta adjunta enseña un producto con una malla de exposición, polígonos y
72 h de historia. Nada de eso existe todavía en el repo. Es un objetivo, no una
promesa: si la interfaz se construye antes que los bloques A y B, quedará una
consola bonita pintando puntos sin cifras — que es peor que la actual, porque
promete algo que los datos no sostienen.

Es la misma regla que acabas de meter en `AGENTS.md §10.1`, aplicada al diseño.
