# Validacion de incidencia y proximos pasos

Fecha: 2026-08-05.

Rama: `codex/geoops-ui-quality-system-pass`.

## 1. Incidencia validada

La pantalla sin datos no se debia solo al frontend. El puerto local `8000`
estaba ocupado por otra API:

```text
python3 -m uvicorn dataops_copilot.platform.api:app --reload --port 8000
```

Por eso `/health` respondia:

```json
{"status":"ok","metadata_store":"supabase"}
```

Eso no es GeoOps. La API correcta responde:

```json
{"status":"ok","service":"geoops-api","environment":"development"}
```

Se pararon los procesos locales conflictivos identificados y se relanzo GeoOps
desde la rama actual.

## 2. Estado validado localmente

Comandos ejecutados:

```bash
git switch codex/geoops-ui-quality-system-pass
git pull --ff-only
pnpm install
make demo
make dev
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/ready
curl -fsS http://127.0.0.1:8000/v1/operations/summary
```

Resultados:

- PostGIS: `healthy`.
- `/health`: `service=geoops-api`.
- `/ready`: `status=ready`, `dependency=postgis`.
- `/v1/operations/summary`:
  - `events_total=2`;
  - `assets_total=1`;
  - `open_alerts=1`;
  - `sources_total=3`;
  - `demo=true`.
- UI `/operations`: carga datos y no muestra `API no accesible`.

Se anadio `make preflight-dev-ports` para evitar que `make dev` arranque si el
puerto de API ya esta ocupado por otro servicio o por una instancia previa de
GeoOps.

## 3. Que tenemos hoy en GeoOps

### Backend y pipeline

Flujo MVP actual:

```text
tests/fixtures/wildfire_public/
  incidents.geojson
  manifest.json
  sources.json
        ↓
geoops-ingestion wildfire-public
        ↓
services/api/geoops_api/wildfire_ingest.py
        ↓
RawPayload + SourceRun + Observation
        ↓
Event + EventObservation + EventRevision
        ↓
PostGIS
        ↓
FastAPI /v1
        ↓
web /operations
```

Piezas existentes:

- modelos `Source`, `SourceRun`, `RawPayload`, `Observation`, `Event`,
  `EventObservation`, `EventRevision`, `Asset`, `Impact`, `AlertRule`, `Alert`;
- migracion PostGIS inicial;
- raw local en `var/raw/`;
- ingesta `wildfire-public` desde fixture o URL configurable;
- reconciliacion MVP por `source_id + upstream_incident_id`;
- endpoint `/v1/operations/summary`;
- endpoints de eventos, fuentes, observaciones, timeline, impactos, activos y
  alertas;
- demo seed de activo y regla de proximidad;
- pruebas MVP de idempotencia, raw, rechazo de estado sin fuente, revisiones,
  impactos, reglas y alertas.

### Frontend

Piezas existentes:

- consola `/operations`;
- MapLibre con fallback visual si tiles/WebGL fallan;
- lista de eventos visibles;
- ficha flotante con tabs;
- salud de fuentes;
- capas iniciales;
- activos y alertas demo;
- rail colapsable;
- CORS local para Vite `5173-5179`;
- pruebas React y E2E desktop/mobile.

## 4. Que no tenemos todavia

### Paridad wildfire pendiente

- No hay paridad completa con `incendios_forestales_app`.
- No hay gazetteer IGN ni buscador territorial equivalente.
- No estan los filtros de sensor, confianza, origen y precision al nivel del
  visor.
- No esta portada toda la logica de verificacion de fuentes del visor.
- No hay suite de invariantes tan amplia como la del visor original.
- No hay adaptadores reales AEMET/DGT ni segunda vertical.

### UI pendiente

Tras `GEO-UI-004` la UI deja de autoseleccionar eventos y recupera un enfoque
map-first: la busqueda, filtros y capas son paneles cerrables; la ficha solo se
abre con seleccion explicita; el rail es la navegacion principal; y las capturas
desktop/mobile demuestran datos visibles. Sigue siendo un corte de consola, no
un producto final.

Pendientes:

- afinar topbar y metric strip si se amplian KPIs;
- sustituir el fallback aproximado por teselas fiables o proveedor configurable;
- convertir formularios de activos/reglas en paneles operacionales maduros;
- pulir estados vacios y loading;
- ampliar mobile con drawer de eventos y gesto de cierre;
- revisar espaciado, pesos tipograficos, bordes y jerarquia visual contra
  `docs/design/references/geoops-visual-direction.png`.

Capturas de este pase:

- `artifacts/screenshots/geoops-operational-console-redesign-desktop.png`
- `artifacts/screenshots/geoops-operational-console-redesign-search.png`
- `artifacts/screenshots/geoops-operational-console-redesign-detail.png`
- `artifacts/screenshots/geoops-operational-console-redesign-layers.png`
- `artifacts/screenshots/geoops-operational-console-redesign-mobile.png`

## 5. Que reutilizar del visor de incendios

Repositorio de referencia:

```text
../incendios_forestales_app
```

No se debe copiar completo. Se debe reutilizar comportamiento, contratos y
criterios.

### Reglas de `AGENTS.md`

Adoptar con fuerza en GeoOps:

- no inventar endpoints;
- no publicar salidas vacias si el historico indicaba actividad;
- una fuente rota no tumba todo el pipeline;
- publicar siempre latencia de dato y latencia de ejecucion por separado;
- nada se afirma sin fuente;
- buscar antes de leer;
- mas de un fichero implica plan;
- validar especifico primero y suite despues;
- no declarar exito sin salida de comando;
- convertir payload roto en fixture antes de corregir parser.

GeoOps ya recoge varias en `AGENTS.md`, pero debe endurecer la parte operativa
de fuentes y publicacion vacia.

### Router de `CLAUDE.md`

El visor usa un router simple:

| Pregunta | Documento |
|---|---|
| que debe hacer | especificacion |
| que funciona hoy | estado |
| que se rompio antes | errores |
| que falta para datos reales | fuentes |
| que parametro tocar | config |
| fusion oficial/satelite | modulo concreto |

GeoOps deberia crear un equivalente mas estricto en `AGENTS.md` o
`docs/00-LEEME-PRIMERO.md`, por ejemplo:

| Pregunta del agente | Fuente de verdad GeoOps |
|---|---|
| producto/arquitectura | `docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md` |
| estado real | `docs/11-ESTADO-DEL-PROYECTO.md` |
| pipeline | `docs/03-PIPELINE-Y-TRANSFORMACIONES.md` |
| APIs | `docs/06-CONTRATOS-Y-APIS.md` |
| fuentes | `docs/07-FUENTES-Y-ADAPTADORES.md` y `docs/sources/` |
| UI | `docs/09-INTERFAZ-Y-VISUALIZACION.md` y `docs/design/` |
| errores | `docs/12-ERRORES-Y-SOLUCIONES.md` |
| tarea activa | `.ai/tasks/` |

### Plantillas `.ai`

El visor separa:

- tarea antes de empezar;
- debug cuando algo falla;
- handoff si se corta contexto;
- ADR para decisiones que se preguntaran dentro de un año.

GeoOps ya tiene `.ai/`, pero conviene endurecer las plantillas con secciones
obligatorias del visor:

- resultado observable unico;
- comportamiento actual y reproduccion;
- criterios de aceptacion;
- alcance y fuera de alcance;
- restricciones por modulo;
- validacion especifica;
- requiere aprobacion;
- no repetir en handoffs.

## 8. Auditoria backend/pipeline

La auditoria especifica vive en:

```text
docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md
```

Conclusiones:

- GeoOps tiene flujo MVP wildfire end-to-end, no paridad completa.
- Falta suite de invariantes equivalente al visor.
- Falta guard de salida vacia sospechosa.
- Falta stale real por fuente con edad de descarga y edad de dato.
- Falta exponer filtros wildfire de origen/sensor/confianza.
- Falta reconciliacion oficial/satelite por tolerancia y ventana temporal.

Actualizacion `GEO-WF-002`:

- Ya existe una suite inicial de invariantes de contrato wildfire.
- La ingesta rechaza origen incoherente, bbox invalido, precision ausente o no
  positiva, tiempos invertidos, estado sin fuente oficial y vocabulario de
  estado no permitido.
- Sigue pendiente el guard historico de salida vacia sospechosa y stale real por
  fuente.


### CI y pruebas

Patrones reutilizables del visor:

- CI separada por backend/pipeline y frontend;
- artefactos de demo subidos como evidencia;
- E2E con capturas;
- presupuesto de bundle;
- aviso explicito contra servidores preview viejos;
- cobertura minima para el pipeline.

GeoOps ya ejecuta `make check`, pero debe evolucionar hacia:

- upload de capturas E2E en CI;
- presupuesto de bundle inicial;
- cobertura minima para pipeline critico;
- jobs separados para pipeline/API/frontend cuando crezca.

## 6. Propuestas priorizadas

### P0 · Cerrar incidencia local dev

Estado: iniciado.

Criterios:

- `make dev` falla con mensaje claro si `8000` lo ocupa otra API.
- docs explican como diagnosticar puertos.
- captura con datos cargados.

### P1 · UI fit-and-finish antes de merge visual

Objetivo: que `/operations` deje de parecer cruda.

Tareas:

- redisenar topbar;
- resolver paneles cortados;
- establecer layout desktop 1280, 1440 y mobile;
- screenshots comparativas;
- tests de no overflow global y topbar sin texto cortado.

### P2 · Auditoria de paridad wildfire backend

Objetivo: saber con precision que comportamiento del visor ya esta en GeoOps y
que falta.

Tareas:

- revisar `incendios_forestales_app` solo en modulos de pipeline, merge,
  exportacion, tests e invariantes;
- crear matriz de paridad;
- anotar codigo generico portable;
- crear tareas pequenas para portar validaciones.

### P3 · Reglas de agente GeoOps

Objetivo: que cada agente desarrolle con el mismo rigor del visor.

Tareas:

- actualizar `AGENTS.md` con router de lectura;
- reforzar plantillas `.ai`;
- definir formato obligatorio de cierre;
- exigir reproduccion, prueba especifica y suite;
- documentar cuando buscar endpoints/API y cuando bloquear.

### P4 · Pipeline wildfire realista

Objetivo: pasar del fixture MVP a un pipeline wildfire mas cercano al visor.

Tareas:

- fuente documentada y verificable;
- fixtures ampliados;
- validacion de vacios sospechosos;
- source health por adaptador;
- no sobrescribir ultimo estado valido con ingesta invalida;
- revisiones explicables.

## 7. Regla operativa para siguientes agentes

Antes de tocar codigo:

1. Leer tarea activa.
2. Leer router documental.
3. Reproducir el fallo.
4. Localizar punto de entrada con `rg`.
5. Escribir plan si toca mas de dos modulos.
6. Implementar el minimo cambio correcto.
7. Ejecutar prueba especifica.
8. Ejecutar suite del area.
9. Ejecutar `make check` si afecta a contrato, UI, pipeline o CI.
10. Actualizar estado y errores si cambia comportamiento visible.

Si falta endpoint, contrato, licencia, frecuencia, clave, payload o semantica de
una fuente, la tarea se bloquea. No se inventa.
