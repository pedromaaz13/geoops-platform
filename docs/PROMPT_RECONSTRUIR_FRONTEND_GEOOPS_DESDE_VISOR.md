# GEO-UI-002 · Reconstrucción del frontend GeoOps desde el visor de incendios

## Decisión

El backend y los contratos del MVP GeoOps se conservan.

El frontend actual **no se parchea incrementalmente como diseño definitivo**.
Debe reconstruirse tomando como base:

1. La arquitectura de interacción y calidad del visor original:
   `pedromaaz13/incendios_forestales_app`.
2. La referencia visual:
   `docs/design/references/geoops-visual-direction.png`.
3. La captura del visor original:
   `docs/design/references/wildfire-viewer-functional-baseline.png`.
4. La captura actual:
   `docs/design/references/current-geoops-mvp-before.png`, únicamente como
   comparación de lo que debe ser sustituido.

El objetivo no es convertir GeoOps en “el visor de incendios con otro nombre”.
El objetivo es conservar su calidad, sus patrones operacionales y su rigor,
generalizándolos a múltiples eventos geoespaciales.

---

# 1. Repositorios

Repositorio de trabajo:

```text
pedromaaz13/geoops-platform
```

Repositorio de referencia de solo lectura:

```text
../incendios_forestales_app
```

Antes de editar:

```bash
git switch main
git pull --ff-only
git status --short
git -C ../incendios_forestales_app status --short
```

Crea:

```text
codex/geo-ui-002-rebuild-from-wildfire-viewer
```

No trabajes sobre `main`.

No modifiques el repositorio de incendios.

---

# 2. Qué debe estudiarse del visor original

Inspecciona de forma dirigida:

```text
web/index.html
web/src/main.ts
web/src/estilos.css
web/src/datos.ts
web/src/tipos.ts
web/src/map/
web/src/ui/
web/tests/
docs/ARQUITECTURA.md
docs/ESPECIFICACION.md
```

Identifica y documenta:

- layout;
- flujo de arranque;
- carga independiente del mapa;
- salud de fuentes;
- distinción entre latencia del dato y del pipeline;
- banda de degradación;
- lista y mapa sincronizados;
- URL compartible;
- buscador;
- filtros;
- evolución;
- cruces de capas;
- activos;
- capas;
- selector de mapa base;
- leyenda;
- ficha;
- mobile drawer;
- degradación sin pantalla en blanco;
- pruebas E2E y visuales.

No copies el repositorio entero.

Porta comportamientos y patrones, adaptados a React y al dominio GeoOps.

---

# 3. Problema actual

El frontend actual:

- parece una demo administrativa;
- no tiene la densidad ni jerarquía del visor original;
- desplaza el foco hacia formularios;
- reduce las capas y contexto;
- no presenta evolución;
- no explota la salud de fuentes;
- no tiene una navegación espacial coherente;
- no transmite una plataforma GeoOps escalable;
- no sirve como base visual para GeoWorld.

No mantengas el layout actual por compatibilidad visual.

Conserva únicamente:

- clientes API válidos;
- tipos útiles;
- pruebas que sigan representando comportamiento correcto;
- integración MapLibre cuando sea técnicamente correcta.

---

# 4. Visión de producto

GeoOps debe ser una consola geoespacial operacional capaz de evolucionar hacia:

```text
incendios
meteorología
inundaciones
terremotos
tráfico
infraestructura
calidad del aire
energía
agricultura
activos privados
noticias geolocalizadas
riesgos globales
```

Ahora solo existen datos wildfire y activos MVP.

La interfaz debe ser **event-type agnostic**, aunque el primer dataset sea
wildfire.

No hardcodear el producto completo como “Incendios”.

Sí se permite usar estilos específicos por tipo de evento mediante un registro
de presentación.

---

# 5. Arquitectura visual objetivo

```text
GeoOpsAppShell
├── GlobalTopBar
│   ├── marca
│   ├── ámbito
│   ├── búsqueda
│   ├── latencia del dato
│   ├── latencia del pipeline
│   ├── salud global
│   └── alertas
│
├── DegradationBanner
│
├── NavigationRail
│   ├── Operaciones
│   ├── Fuentes
│   ├── Activos
│   ├── Alertas
│   └── Capas
│
├── ContextPanel
│   ├── búsqueda
│   ├── salud de fuentes
│   ├── resumen
│   ├── evolución
│   ├── filtros
│   ├── cruces
│   ├── activos
│   ├── capas
│   └── mapas base
│
├── MapWorkspace
│   ├── MapLibreMap
│   ├── MapControls
│   ├── Legend
│   ├── FloatingLayerPanel
│   ├── FloatingDetailPanel
│   └── Timeline
│
├── EventListPanel
│
└── DataDisclaimer
```

El mapa debe ocupar siempre la mayor superficie.

---

# 6. Qué se conserva del visor original

## Cabecera

Conservar el principio de dos tiempos separados:

```text
Última observación del dato
Última ejecución del pipeline
```

No sustituirlo por “actualizado hace X”.

La cabecera GeoOps debe añadir:

- número de eventos;
- activos;
- alertas;
- fuentes degradadas;
- ámbito actual.

## Banda de degradación

Debe aparecer cuando:

- una fuente crítica falla;
- una fuente está stale;
- la ingesta es parcial;
- los datos son demo;
- la colección puede estar incompleta.

El mapa sigue navegable.

## Panel contextual

El panel izquierdo original es una referencia funcional de gran valor.

Generaliza sus secciones:

```text
Busca un lugar
Estado de fuentes
Resumen
Evolución
Filtros
Cruces de capas
Activos
Capas
Mapa base
Atribución
```

No es necesario mostrar todas simultáneamente.

Pueden organizarse mediante:

- tabs;
- acordeones;
- workspaces;
- drawers;

pero deben seguir disponibles.

## Lista de eventos

La lista derecha debe mostrar los eventos visibles en el viewport.

Cada elemento:

- tipo;
- título;
- ubicación;
- estado;
- fuente del estado;
- última observación;
- precisión;
- severidad si existe;
- calidad o salud;
- indicadores de activo/impacto.

## Leyenda

Debe explicar:

- colores;
- intensidad o severidad;
- procedencia;
- confirmación;
- incertidumbre;
- agrupaciones;
- activos;
- impactos.

Debe ser contextual por capa.

## Ficha

La ficha flotante debe incluir:

```text
Resumen
Evidencias
Evolución
Impactos
Fuentes
```

El mapa permanece visible.

## Móvil

Conservar el principio del visor:

- mapa visible;
- panel accesible mediante drawer;
- lista accesible;
- ficha como bottom sheet;
- aviso legal visible;
- ninguna capacidad principal inaccesible.

---

# 7. Generalización GeoOps

Crea registros declarativos.

## EventPresentationRegistry

Por tipo:

```ts
interface EventPresentation {
  type: string;
  label: string;
  icon: string;
  color: string;
  statusVocabulary: Record<string, StatusPresentation>;
  defaultLayers: string[];
  detailSections: string[];
}
```

Primer registro:

```text
wildfire
```

Futuro:

```text
weather_warning
road_incident
earthquake
flood
air_quality
news_event
```

## LayerRegistry

Cada capa declara:

```text
id
title
group
renderer
source
visibleByDefault
minZoom
maxZoom
legend
freshness
loadingState
permissions
```

Capas iniciales:

```text
Eventos
Incertidumbre
Activos
Impactos
```

Capas heredables más adelante:

```text
Hotspots
Perímetros
Viento
Aire
Tráfico
Avisos
Suelo
Infraestructura eléctrica
Ferrocarril
Áreas protegidas
Población
Noticias
```

No implementes datos inexistentes como si existieran.

Sí deja el registro preparado para incorporarlos de forma coherente.

---

# 8. Evolución y tiempo

La nueva interfaz debe tener dos escalas temporales.

## Ventana operacional

```text
6 h
24 h
3 d
7 d
```

Filtra mapa y lista.

## Evolución del evento

Dentro de la ficha:

- observaciones;
- revisiones;
- cambios de estado;
- cambios geométricos;
- fuentes;
- timestamps.

Añade un componente de timeline real.

No necesita animación compleja todavía.

---

# 9. Capas y datos en tiempo real

La interfaz debe distinguir:

```text
live
recent
stale
historical
demo
failed
```

Cada capa debe mostrar:

- fuente;
- timestamp;
- estado;
- cobertura;
- unidad;
- precisión.

No llamar “tiempo real” a datos que no lo son.

Usar:

- polling controlado;
- `updated_after`;
- ETag cuando exista;
- SSE únicamente cuando el backend lo implemente realmente.

---

# 10. Diseño visual

Usa como dirección:

```text
docs/design/references/geoops-visual-direction.png
```

Y como baseline funcional:

```text
docs/design/references/wildfire-viewer-functional-baseline.png
```

## Paleta

```text
--ground:        #07101A
--surface-1:     #0B1622
--surface-2:     #101E2D
--surface-3:     #16283A
--line:          #263B50

--ink:           #F2F6FA
--muted:         #91A5B8
--primary:       #4C9BFF
--cyan:          #2CC7D4

--fire-low:      #FFD24A
--fire-medium:   #FF9E2C
--fire-high:     #FF5C35
--fire-extreme:  #E7354F

--ok:            #2ED29A
--warn:          #F4B843
--bad:           #FF5364
--unknown:       #718398
```

La paleta fría deja que los eventos calientes destaquen, igual que en el visor
original.

## Tipografía

- sans legible para interfaz;
- mono para timestamps, coordenadas, IDs y métricas;
- jerarquía compacta;
- alta densidad sin parecer saturada.

## Componentes

```text
Panel
PanelHeader
Metric
StatusBadge
FreshnessBadge
Tabs
Accordion
Drawer
BottomSheet
Tooltip
LayerToggle
LegendItem
EventListItem
SourceHealthItem
Timeline
EmptyState
ErrorState
Skeleton
```

No crear un design system independiente.

---

# 11. Arquitectura React

Estructura orientativa:

```text
apps/web/src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── components/
│   ├── layout/
│   └── ui/
├── features/
│   ├── events/
│   ├── map/
│   ├── layers/
│   ├── sources/
│   ├── timeline/
│   ├── assets/
│   └── alerts/
├── registries/
├── hooks/
├── lib/
├── styles/
└── types/
```

Reglas:

- TanStack Query para estado de servidor;
- URL para selección, bbox, tiempo, filtros y capas;
- estado local para paneles;
- no añadir Zustand sin necesidad;
- mapa persistente mediante `useRef`;
- `setData` para actualizar fuentes;
- no recrear mapa por selección.

---

# 12. Implementación por fases

## Fase 0 · auditoría y golden baseline

- comparar tres capturas;
- documentar gaps;
- registrar dimensiones;
- crear pruebas visuales baseline.

## Fase 1 · shell y paridad funcional

- cabecera;
- latencias;
- banner;
- panel contextual;
- mapa;
- lista;
- footer/disclaimer;
- mobile drawer.

## Fase 2 · detalle y evolución

- ficha;
- tabs;
- observaciones;
- revisiones;
- impactos;
- fuentes;
- timeline.

## Fase 3 · capas y fuentes

- LayerRegistry;
- panel de capas;
- leyenda;
- mapa base;
- source health;
- degradación.

## Fase 4 · activos y alertas

- integrar en paneles;
- no formularios permanentes;
- selección y centrado;
- reglas;
- alertas.

## Fase 5 · generalización

- EventPresentationRegistry;
- textos agnósticos;
- iconografía;
- evitar hardcode wildfire fuera del registro.

## Fase 6 · responsive y accesibilidad

- desktop;
- tablet;
- móvil;
- teclado;
- foco;
- reduced motion.

## Fase 7 · capturas y validación

- E2E;
- full-stack;
- visual;
- documentación.

---

# 13. Capturas obligatorias

Genera:

```text
artifacts/screenshots/geoops-desktop-overview.png
artifacts/screenshots/geoops-event-detail.png
artifacts/screenshots/geoops-layers-sources.png
artifacts/screenshots/geoops-evolution.png
artifacts/screenshots/geoops-assets-alerts.png
artifacts/screenshots/geoops-mobile.png
```

Comparar con:

```text
wildfire-viewer-functional-baseline.png
geoops-visual-direction.png
```

No se exige pixel-perfect.

Se exige que la nueva interfaz sea claramente superior al visor original en:

- coherencia;
- navegación;
- escalabilidad;
- detalle;
- diseño.

Y nunca inferior en:

- densidad de información;
- visibilidad de fuentes;
- evolución;
- mapas y capas;
- claridad de latencias;
- degradación;
- facilidad de encontrar eventos.

---

# 14. Definition of Done

```text
[ ] El mapa vuelve a ser el centro.
[ ] El frontend no parece una demo administrativa.
[ ] Conserva dos latencias separadas.
[ ] Tiene banda de degradación.
[ ] Tiene panel contextual.
[ ] Tiene buscador.
[ ] Tiene salud de fuentes detallada.
[ ] Tiene resumen.
[ ] Tiene evolución.
[ ] Tiene filtros.
[ ] Tiene capas y mapa base.
[ ] Tiene lista de eventos visibles.
[ ] Tiene leyenda.
[ ] Tiene ficha flotante.
[ ] Tiene activos integrados.
[ ] Tiene alertas integradas.
[ ] Tiene URL compartible.
[ ] Tiene responsive real.
[ ] Tiene pruebas visuales.
[ ] Tiene capturas.
[ ] El backend GeoOps sigue funcionando.
[ ] El repositorio original sigue intacto.
```

---

# 15. Validación

Ejecuta:

```bash
make lint
make typecheck
make test
make build
make e2e
make check
make demo
```

Verifica además:

```bash
git -C ../incendios_forestales_app status --short
```

No hagas merge.

Abre PR draft:

```text
feat: rebuild GeoOps operations console from wildfire viewer baseline
```

---

# 16. Respuesta final

Devuelve:

## Resultado
## Comparación antes/después
## Elementos reutilizados del visor original
## Elementos generalizados
## Arquitectura frontend
## Capas y mapas
## Evolución temporal
## Fuentes y degradación
## Activos y alertas
## Responsive
## Pruebas
## Capturas
## Commits
## Pull request
## Diferencias justificadas
## Riesgos vivos
## Recomendación de merge

No declares listo si la nueva UI sigue siendo menos completa que el visor
original.
