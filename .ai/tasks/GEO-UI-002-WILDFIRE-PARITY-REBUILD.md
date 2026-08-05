# GEO-UI-002 · Paridad wildfire y reconstruccion UI GeoOps

## Pregunta que responde
Como debe evolucionar GeoOps para que la vertical wildfire no quede por debajo del visor original y, a la vez, se vea como una consola operacional geoespacial multievento?

## Problema
GeoOps ya tiene un MVP funcional con API, PostGIS, ingesta wildfire, activos, impactos, alertas y una consola MapLibre. Sin embargo, la experiencia visible aun esta por debajo del visor `incendios_forestales_app` en densidad operacional, salud de fuentes, evolucion, filtros, capas, lista de viewport, lectura de latencias y comportamiento movil.

## Evidencia
- `docs/PROMPT_MASTER_GEOOPS_PARIDAD_WILDFIRE_Y_UI.md` exige `GeoOps >= incendios_forestales_app` para wildfire.
- `docs/design/references/current-geoops-mvp-before.png` muestra una consola actual todavia centrada en formularios/dock.
- `docs/design/references/wildfire-viewer-functional-baseline.png` muestra el minimo funcional: dos latencias, banner degradado, buscador, salud de fuentes, resumen, filtros, capas, leyenda, lista visible y ficha.
- `docs/design/references/geoops-visual-direction.png` define la direccion visual: mapa protagonista, rail, paneles densos, timeline, layers, fuentes y detalle.
- Repositorio origen inspeccionado: `../incendios_forestales_app`, commit `2d7451a38847ba48bd0fb63c6e76622407fd523c`.

## Objetivo
Reconstruir la consola GeoOps para una operacion wildfire completa, map-first, sin scroll global, con paridad funcional critica respecto al visor original y arquitectura visual preparada para eventos futuros sin implementar GEO-002+.

## Alcance
### Incluye
- Auditoria de paridad frente al visor original.
- Mejora de API de operaciones cuando falten datos ya existentes en PostGIS.
- Endpoints o campos para resumen, timeline, salud de fuentes y filtros.
- Conservacion de raw payloads, observaciones, revisiones, impactos y alertas.
- Frontend React/Vite con app shell operacional: topbar, banner, rail, contexto, mapa, capas, lista, ficha, timeline y mobile drawer.
- Registro de presentacion por tipo de evento y registro de capas.
- Pruebas backend/frontend/E2E y capturas.
- Documentacion del estado real y de las decisiones tomadas.

### No incluye
- Nuevas fuentes reales.
- Adaptadores AEMET, DGT, CAP o DATEX II.
- Prediccion de propagacion.
- deck.gl, Kepler.gl, Kafka, Kubernetes, Redis, Celery, Neo4j, WebSockets o Terraform.
- Autenticacion, organizaciones o alertas multicanal.
- Merge a `main`.
- Modificar `../incendios_forestales_app`.

## Reutilizacion
- Del visor original se reutilizan patrones, contratos visuales e invariantes: arranque degradable, latencia de dato frente a pipeline, salud de fuentes, buscador local, filtros sincronizados con mapa/lista, evolucion, leyenda, capas bajo demanda, ficha explicativa, mobile drawer y pruebas E2E.
- No se copian carpetas completas ni codigo de dominio wildfire sin adaptarlo a GeoOps.

## Diseño
- App shell oscuro tipo GIS/operaciones.
- Mapa como superficie principal.
- Paneles densos pero escaneables.
- Wildfire es una presentacion dentro de un registro multievento.
- La UI muestra incertidumbre, procedencia y degradacion en lugar de ocultarlas.

## Archivos probables
- `docs/audits/WILDFIRE-PARITY-AUDIT.md`
- `docs/09-INTERFAZ-Y-VISUALIZACION.md`
- `docs/11-ESTADO-DEL-PROYECTO.md`
- `docs/12-ERRORES-Y-SOLUCIONES.md`
- `.ai/tasks/GEO-UI-002-WILDFIRE-PARITY-REBUILD.md`
- `services/api/geoops_api/operations.py`
- `services/api/geoops_api/main.py`
- `services/api/geoops_api/wildfire_ingest.py`
- `services/ingestion/geoops_ingestion/cli.py`
- `tests/mvp/test_wildfire_mvp_integration.py`
- `apps/web/src/`
- `apps/web/tests/e2e/operations.spec.ts`
- `apps/web/package.json`
- `pnpm-lock.yaml`
- `artifacts/screenshots/`

## Dependencias
- Se evaluara `@tanstack/react-query` porque el prompt maestro lo pide para estado servidor. Alternativa: fetch manual con `useEffect`. Coste: nueva dependencia runtime; uso actual: cache y revalidacion de eventos/fuentes/activos/alertas.
- No se anadiran librerias visuales complejas sin consumidor inmediato.

## Riesgos silenciosos
- Mezclar `observed_at`, `published_at`, `ingested_at` y `updated_at` en la UI.
- Mostrar fuente fallida como ausencia de eventos.
- Mantener una capa visible en UI pero no en mapa.
- Re-crear el mapa en cada render y perder estado/camara.
- Que la lista no represente el viewport visible.
- Que el modo movil dependa de scroll global.
- Que una fuente parcial o demo no quede visible para el usuario.

## Plan
1. Completar inspeccion dirigida del visor original y del estado GeoOps actual.
2. Crear auditoria de paridad con acciones por capacidad.
3. Endurecer API/operaciones para resumen, timeline, salud de fuentes enriquecida y filtros necesarios.
4. Reconstruir frontend por componentes: app shell, topbar, banner, rail, contexto, mapa, lista, ficha y timeline.
5. Anadir registros de presentacion y capas.
6. Integrar buscador local, filtros, basemap selector, leyenda, source health, activos, impactos y alertas en una unica pantalla.
7. Preparar responsive/mobile drawer.
8. Actualizar pruebas unitarias, integracion y E2E.
9. Ejecutar validaciones obligatorias y corregir fallos propios.
10. Generar capturas requeridas.
11. Actualizar documentacion y cerrar auditoria con pendientes reales.
12. Crear commits pequenos y abrir PR draft si GitHub CLI esta autenticado.

## Pruebas
- `make lint`
- `make typecheck`
- `make test`
- `make build`
- `make e2e`
- `make check`
- `make demo`
- Smoke manual/API: `/health`, `/ready`, `/v1/events`, `/v1/sources/health`.
- Capturas Playwright en desktop y mobile.

## Criterios de aceptacion
- [x] Existe auditoria de paridad con matriz completa.
- [x] El repositorio origen queda sin cambios nuevos.
- [x] La consola no trabaja sobre `main`.
- [x] La UI no tiene scroll global.
- [x] El mapa es protagonista y no queda en blanco sin mensaje.
- [x] La UI muestra dos latencias separadas.
- [x] Hay banner de degradacion/demo/parcial cuando aplica.
- [x] Existe buscador local operacional para eventos y activos.
- [x] Existe salud de fuentes detallada.
- [x] Existe resumen 24 h.
- [x] Existe evolucion/timeline.
- [x] Existen filtros que afectan API/mapa/lista.
- [x] Existen capas, mapas base y leyenda.
- [x] La lista representa el contexto operativo visible.
- [x] La ficha tiene resumen, evidencias, impactos, evolucion y fuentes.
- [x] Activos, impactos y alertas se conservan sin formularios permanentes dominando la pantalla.
- [x] Hay comportamiento responsive/mobile inicial.
- [x] Backend y frontend tienen pruebas actualizadas.
- [x] Capturas requeridas generadas.
- [x] `make check` termina correctamente.
- [x] No se implementan fuentes ni funcionalidades fuera del prompt maestro.

Pendientes no cerrados para declarar paridad total: buscador geografico con
indice tipo IGN, filtros de sensor/confianza/origen y suite de pruebas comparable
en amplitud a `incendios_forestales_app`.

## Documentacion
- [ ] `docs/audits/WILDFIRE-PARITY-AUDIT.md`
- [ ] `docs/09-INTERFAZ-Y-VISUALIZACION.md`
- [ ] `docs/11-ESTADO-DEL-PROYECTO.md`
- [ ] `.ai/tasks/GEO-UI-002-WILDFIRE-PARITY-REBUILD.md`
