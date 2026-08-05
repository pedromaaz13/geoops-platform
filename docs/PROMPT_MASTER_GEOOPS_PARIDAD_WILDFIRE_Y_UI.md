# Prompt maestro · Paridad wildfire + reconstrucción GeoOps tipo Palantir/GIS

## Ubicación de este archivo

Este archivo debe vivir en:

```text
docs/PROMPT_MASTER_GEOOPS_PARIDAD_WILDFIRE_Y_UI.md
```

La estructura real del repositorio es:

```text
geoops-platform/
├── AGENTS.md
├── apps/
├── services/
├── tests/
├── docs/
│   ├── 00-LEEME-PRIMERO.md
│   ├── 01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md
│   ├── 02-SISTEMA-DE-TRABAJO.md
│   ├── 03-PIPELINE-Y-TRANSFORMACIONES.md
│   ├── 04-ARQUITECTURA-BACKEND.md
│   ├── 05-ONTOLOGIA-Y-MODELO-DATOS.md
│   ├── 06-CONTRATOS-Y-APIS.md
│   ├── 07-FUENTES-Y-ADAPTADORES.md
│   ├── 08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md
│   ├── 09-INTERFAZ-Y-VISUALIZACION.md
│   ├── 10-ROADMAP-M0.md
│   ├── 11-ESTADO-DEL-PROYECTO.md
│   ├── 12-ERRORES-Y-SOLUCIONES.md
│   ├── 13-PLAN-MVP-RAPIDO.md
│   ├── PROMPT_RECONSTRUIR_FRONTEND_GEOOPS_DESDE_VISOR.md
│   ├── PROMPT_MASTER_GEOOPS_PARIDAD_WILDFIRE_Y_UI.md
│   └── design/
│       └── references/
│           ├── current-geoops-mvp-before.png
│           ├── geoops-visual-direction.png
│           └── wildfire-viewer-functional-baseline.png
└── ...
```

No busques estos archivos en `docs/prompts/`, porque actualmente están
directamente dentro de `docs/`.

---

# 1. Repositorios y origen

## Repositorio de trabajo

```text
GitHub:
https://github.com/pedromaaz13/geoops-platform

Local:
../geoops-platform
```

## Repositorio origen y referencia funcional

```text
GitHub:
https://github.com/pedromaaz13/incendios_forestales_app

Local:
../incendios_forestales_app
```

`incendios_forestales_app` es el origen de:

- las reglas de ingeniería;
- el pipeline;
- la verificación de fuentes;
- la separación de latencias;
- los invariantes;
- la publicación segura;
- el diseño map-first;
- el buscador;
- la salud de fuentes;
- la evolución;
- los filtros;
- los cruces;
- las capas;
- la leyenda;
- la lista de eventos visibles;
- la ficha;
- el comportamiento móvil;
- las pruebas de regresión.

El repositorio de origen es de solo lectura.

Antes y después de inspeccionarlo:

```bash
git -C ../incendios_forestales_app status --short
```

Debe permanecer sin cambios.

No debes:

- modificarlo;
- cambiar de rama;
- crear commits;
- instalar dependencias;
- alterar su working tree;
- copiar carpetas completas sin analizar.

---

# 2. Referencias visuales reales del proyecto

## Estado actual que debe superarse

```text
docs/design/references/current-geoops-mvp-before.png
```

Uso:

```text
anti-referencia visual
```

Sirve para identificar:

- layout administrativo;
- mapa con poco protagonismo;
- formularios permanentes;
- baja densidad;
- escasez de capas;
- falta de evolución;
- falta de salud detallada;
- falta de navegación GeoOps.

## Baseline funcional

```text
docs/design/references/wildfire-viewer-functional-baseline.png
```

Origen:

```text
pedromaaz13/incendios_forestales_app
```

Uso:

```text
referencia funcional mínima
```

GeoOps no debe quedar por debajo de esta interfaz en la vertical wildfire.

## Dirección visual

```text
docs/design/references/geoops-visual-direction.png
```

Uso:

```text
referencia de diseño
```

Define:

- tono oscuro;
- azules y cian;
- paneles densos;
- mapa protagonista;
- rail lateral;
- lista;
- ficha;
- salud;
- tabs;
- activos;
- impactos;
- móvil.

No es una captura de Palantir ni de una aplicación externa. Es un mockup
original generado para GeoOps.

---

# 3. Prompt previo disponible

Existe además:

```text
docs/PROMPT_RECONSTRUIR_FRONTEND_GEOOPS_DESDE_VISOR.md
```

Ese archivo se centra principalmente en reconstruir el frontend.

Este prompt maestro lo supera y amplía porque incluye:

- paridad funcional;
- backend;
- pipeline;
- verificación de fuentes;
- hardening;
- frontend;
- capas;
- evolución;
- activos;
- impactos;
- alertas;
- pruebas;
- capturas;
- documentación.

Utiliza este prompt maestro como instrucción principal.

---

# 4. Regla no negociable

GeoOps no puede considerarse terminado ni fusionarse si, para la vertical
wildfire, queda por debajo del visor original en:

- densidad de información;
- claridad de fuentes;
- separación entre edad del dato y edad del pipeline;
- degradación visible;
- buscador;
- resumen;
- evolución;
- filtros;
- cruces;
- capas;
- mapas base;
- leyenda;
- lista de eventos visibles;
- precisión;
- incertidumbre;
- activos;
- navegación móvil;
- manejo de fallos;
- pruebas;
- documentación;
- honestidad sobre lo conocido y lo desconocido.

La nueva aplicación debe ser:

```text
como mínimo tan útil y fiable como incendios_forestales_app
+
más escalable
+
multievento
+
con backend operacional
+
con diseño moderno map-first
```

No aceptes:

```text
lista + mapa + popup + formularios
```

como resultado final.

---

# 5. Objetivo

Construir una consola GeoOps que combine:

```text
ingeniería del visor original
+ backend GeoOps existente
+ Observation/Event
+ fuentes verificables
+ evolución temporal
+ capas geoespaciales
+ activos e impactos
+ alertas
+ interfaz moderna tipo Palantir/GIS
```

GeoOps debe poder evolucionar hacia:

```text
incendios
meteorología
inundaciones
terremotos
tráfico
infraestructura
energía
calidad del aire
agricultura
activos privados
noticias geolocalizadas
riesgos globales
```

En esta fase solo se implementa completamente `wildfire`, pero la arquitectura
visual y de contratos debe ser agnóstica al tipo de evento.

---

# 6. Preparación Git

Ejecuta:

```bash
git switch main
git pull --ff-only
git status --short
```

Confirma que el working tree está limpio.

Crea:

```text
codex/geoops-wildfire-parity-and-ui-rebuild
```

No trabajes directamente sobre `main`.

No hagas merge.

---

# 7. Documentación obligatoria

Lee:

```text
AGENTS.md
docs/00-LEEME-PRIMERO.md
docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md
docs/02-SISTEMA-DE-TRABAJO.md
docs/03-PIPELINE-Y-TRANSFORMACIONES.md
docs/04-ARQUITECTURA-BACKEND.md
docs/05-ONTOLOGIA-Y-MODELO-DATOS.md
docs/06-CONTRATOS-Y-APIS.md
docs/07-FUENTES-Y-ADAPTADORES.md
docs/08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md
docs/09-INTERFAZ-Y-VISUALIZACION.md
docs/11-ESTADO-DEL-PROYECTO.md
docs/12-ERRORES-Y-SOLUCIONES.md
docs/13-PLAN-MVP-RAPIDO.md
docs/PROMPT_RECONSTRUIR_FRONTEND_GEOOPS_DESDE_VISOR.md
```

Lee también las tres imágenes de:

```text
docs/design/references/
```

Del visor original inspecciona de forma dirigida:

```text
AGENTS.md
CLAUDE.md
docs/ARQUITECTURA.md
docs/ESPECIFICACION.md
docs/ESTADO-DEL-PROYECTO.md
web/index.html
web/src/main.ts
web/src/estilos.css
web/src/datos.ts
web/src/tipos.ts
web/src/map/
web/src/ui/
web/tests/
src/incendios/
tests/
.github/workflows/
```

---

# 8. Auditoría de paridad

Antes de editar código crea:

```text
docs/audits/WILDFIRE-PARITY-AUDIT.md
```

Matriz mínima:

| Capacidad | Visor original | GeoOps actual | Acción |
|---|---:|---:|---|
| Dos latencias | | | |
| Banner degradado | | | |
| Buscador | | | |
| Salud de fuentes | | | |
| Resumen 24 h | | | |
| Evolución | | | |
| Filtros | | | |
| Cruces | | | |
| Activos | | | |
| Capas | | | |
| Mapas base | | | |
| Leyenda | | | |
| Lista viewport | | | |
| Ficha | | | |
| Mobile drawer | | | |
| URL | | | |
| WebGL fallback | | | |
| Pruebas | | | |

Estados:

```text
PARIDAD
SUPERADO
PENDIENTE
NO APLICA
```

Ningún pendiente crítico puede quedar oculto.

---

# 9. Ingeniería backend

## Pipeline

```text
SourceAdapter
→ RawPayload
→ Normalizer
→ Observation
→ Validation
→ EventReconciliation
→ Event
→ EventRevision
→ Enrichment
→ Impact
→ RuleEvaluation
→ Alert
→ API/Snapshot
```

## SourceRun

Todo run termina en:

```text
success
partial
empty
stale
failed
disabled
```

Guardar:

- started_at;
- finished_at;
- status;
- descargados;
- aceptados;
- rechazados;
- latest_observed_at;
- error_type;
- error_message;
- raw payloads.

## Tiempos

Mantener:

```text
observed_at
published_at
ingested_at
updated_at
```

Mostrar por separado:

```text
edad del dato
edad del pipeline
```

## Fuente del estado

No inventar `status_source_id`.

## Precisión

```text
ausente → null
positiva → valor
cero/negativa → rechazo
texto inválido → partial
```

## Idempotencia

Una segunda ingesta idéntica:

- no duplica observaciones;
- no duplica eventos;
- no crea revisiones;
- registra SourceRun;
- conserva raw.

## Impactos y alertas

Cuando llega o cambia un evento:

```text
recalcular impactos
→ evaluar reglas
→ crear/actualizar/resolver alertas
```

Aplicar:

- deduplicación;
- cooldown;
- resolución;
- explicación estructurada.

## API

- Pydantic;
- OpenAPI;
- bbox;
- fechas;
- status;
- tipos;
- coordenadas;
- umbrales;
- cooldown;
- criticidad;
- 404/422;
- evitar N+1 evidentes.

---

# 10. Paridad funcional del visor

Debe portar o superar:

## Cabecera

```text
GeoOps
ámbito
eventos
activos
alertas
fuentes degradadas
última observación
última ingesta
```

## Banner de degradación

Visible ante:

- fuente crítica fallida;
- stale;
- partial;
- demo;
- datos incompletos.

## Buscador geográfico

- lugar;
- población;
- finca;
- activo;
- centrar mapa;
- mantener contexto.

## Salud de fuentes

- nombre;
- organismo;
- status;
- último éxito;
- última observación;
- registros;
- error;
- latencia;
- precisión;
- cobertura.

## Resumen

- eventos;
- por estado;
- por fuente;
- recientes;
- con impacto;
- con alerta.

## Evolución

- evolución global;
- observaciones;
- revisiones;
- cambios de estado;
- cambios geométricos.

## Filtros

- tipo;
- estado;
- fuente;
- tiempo;
- frescura;
- precisión;
- impacto;
- alerta.

## Cruces

MVP:

```text
eventos cerca de activos
eventos dentro del bbox
eventos con impacto
eventos con alerta
```

## Capas

Iniciales:

```text
Eventos
Incertidumbre
Activos
Impactos
```

Preparadas para:

```text
Hotspots
Perímetros
Viento
Aire
Tráfico
Avisos
Suelo
Red eléctrica
Ferrocarril
Áreas protegidas
Población
Noticias
```

## Mapas base

- oscuro;
- claro;
- proveedor configurable;
- fallback para tests.

## Leyenda

- tipos;
- estados;
- intensidad;
- procedencia;
- incertidumbre;
- activos;
- impactos;
- unidades.

## Lista viewport

Cada fila:

- tipo;
- título;
- ubicación;
- estado;
- fuente;
- observación;
- precisión;
- severidad si existe;
- salud;
- impacto;
- alerta.

## Ficha

```text
Resumen
Evidencias
Evolución
Impactos
Fuentes
```

## Móvil

- mapa visible;
- drawer;
- lista bottom sheet;
- ficha bottom sheet;
- capas accesibles;
- disclaimer visible.

---

# 11. Dirección visual

Usa:

```text
docs/design/references/geoops-visual-direction.png
```

Baseline:

```text
docs/design/references/wildfire-viewer-functional-baseline.png
```

Debe superar:

```text
docs/design/references/current-geoops-mvp-before.png
```

Layout:

```text
GeoOpsAppShell
├── GlobalTopBar
├── DegradationBanner
├── NavigationRail
├── ContextPanel
├── MapWorkspace
│   ├── MapLibreMap
│   ├── FloatingDetail
│   ├── LayerPanel
│   ├── Legend
│   └── Timeline
├── EventListPanel
└── Disclaimer
```

Paleta base:

```text
ground:         #07101A
surface-1:      #0B1622
surface-2:      #101E2D
surface-3:      #16283A
line:           #263B50

ink:            #F2F6FA
muted:          #91A5B8
primary:        #4C9BFF
cyan:           #2CC7D4

fire-low:       #FFD24A
fire-medium:    #FF9E2C
fire-high:      #FF5C35
fire-extreme:   #E7354F

ok:             #2ED29A
warn:           #F4B843
bad:            #FF5364
unknown:        #718398
```

---

# 12. Arquitectura frontend

```text
apps/web/src/
├── app/
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

## EventPresentationRegistry

Implementa `wildfire` y prepara:

```text
weather_warning
road_incident
earthquake
flood
air_quality
news_event
```

## LayerRegistry

Campos:

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

## Estado

- TanStack Query para servidor;
- URL para selección, bbox, filtros, tiempo y capas;
- estado local para paneles;
- mapa persistente;
- `setData`;
- no recrear mapa por selección.

---

# 13. Tiempo y datos

Clasificar:

```text
live
recent
stale
historical
demo
failed
```

Cada capa:

- fuente;
- timestamp;
- frecuencia;
- precisión;
- estado;
- unidad.

Ventanas:

```text
6 h
24 h
3 d
7 d
```

No llamar “tiempo real” a datos que no lo son.

---

# 14. Fases

## Fase 0
Auditoría y baseline.

## Fase 1
Hardening backend.

## Fase 2
Shell map-first.

## Fase 3
Paridad funcional del visor.

## Fase 4
Generalización multievento.

## Fase 5
Tiempo y evolución.

## Fase 6
Responsive y accesibilidad.

## Fase 7
E2E, capturas, documentación y PR.

Después de cada fase:

1. pruebas específicas;
2. tarea `.ai`;
3. commit;
4. continuar.

---

# 15. Pruebas

## Backend

- failed;
- partial;
- stale;
- empty;
- caída sospechosa;
- precisión nullable;
- status sin fuente;
- idempotencia;
- revisión;
- impactos al ingerir;
- cooldown;
- resolución;
- bbox;
- filtros;
- concurrencia.

## Frontend

- shell;
- latencias;
- degradación;
- buscador;
- salud;
- resumen;
- evolución;
- filtros;
- cruces;
- capas;
- mapa base;
- leyenda;
- lista;
- ficha;
- URL;
- mapa persistente;
- incertidumbre en metros;
- responsive;
- accesibilidad.

## Full-stack E2E

```text
PostGIS
→ migración
→ fixture
→ API real
→ frontend
→ buscar lugar
→ seleccionar evento
→ comprobar tiempos
→ filtro
→ capa
→ evolución
→ activo
→ impacto
→ regla
→ alerta
→ acknowledge
```

Sin Internet.

---

# 16. Capturas

Genera:

```text
artifacts/screenshots/geoops-desktop-overview.png
artifacts/screenshots/geoops-source-health.png
artifacts/screenshots/geoops-evolution.png
artifacts/screenshots/geoops-layers.png
artifacts/screenshots/geoops-event-detail.png
artifacts/screenshots/geoops-assets-alerts.png
artifacts/screenshots/geoops-mobile.png
```

---

# 17. Definition of Done

```text
[ ] Auditoría completa.
[ ] Sin pendientes críticos.
[ ] Pipeline documentado.
[ ] SourceRun honesto.
[ ] Fuentes verificables.
[ ] Dos latencias.
[ ] Banner degradado.
[ ] Buscador.
[ ] Salud detallada.
[ ] Resumen.
[ ] Evolución.
[ ] Filtros.
[ ] Cruces.
[ ] Activos.
[ ] Capas.
[ ] Mapas base.
[ ] Leyenda.
[ ] Lista viewport.
[ ] Ficha flotante.
[ ] Tiempo.
[ ] Impactos.
[ ] Alertas.
[ ] URL.
[ ] Responsive.
[ ] Full-stack E2E.
[ ] Capturas.
[ ] Documentación.
[ ] Repo original limpio.
```

No declarar terminado si GeoOps ofrece menos que el visor original para
wildfire.

---

# 18. Validación

```bash
make setup
docker compose config
make lint
make typecheck
make test
make build
make e2e
make check
make demo
```

---

# 19. Documentación final

Actualiza:

```text
README.md
docs/03-PIPELINE-Y-TRANSFORMACIONES.md
docs/04-ARQUITECTURA-BACKEND.md
docs/05-ONTOLOGIA-Y-MODELO-DATOS.md
docs/06-CONTRATOS-Y-APIS.md
docs/07-FUENTES-Y-ADAPTADORES.md
docs/08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md
docs/09-INTERFAZ-Y-VISUALIZACION.md
docs/11-ESTADO-DEL-PROYECTO.md
docs/12-ERRORES-Y-SOLUCIONES.md
docs/audits/WILDFIRE-PARITY-AUDIT.md
.ai/tasks/
```

---

# 20. Pull request

Abre una PR draft:

```text
feat: restore wildfire parity and rebuild GeoOps operations console
```

No hagas merge.

---

# 21. Respuesta final

Devuelve:

## Resultado
## Auditoría de paridad
## Ingeniería reutilizada
## Backend corregido
## Pipeline
## Fuentes y verificación
## Layout
## Capas
## Evolución
## Activos e impactos
## Alertas
## Generalización multievento
## Responsive
## Pruebas
## Capturas
## Commits
## Pull request
## Pendientes
## Riesgos
## Recomendación de merge

No recomiendes merge si existe un pendiente crítico de paridad wildfire.
