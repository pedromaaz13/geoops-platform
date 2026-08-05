# GEO-MVP-001 · Wildfire end-to-end MVP

## Pregunta de negocio

¿Puede GeoOps convertir el feed público de incendios en eventos operacionales consultables, cruzarlos con un activo, explicar el impacto y generar una alerta interna verificable?

## Alcance

### Incluye

- Modelos y migración inicial PostGIS para fuentes, raw, observaciones, eventos, revisiones, activos, impactos, reglas y alertas.
- Ingesta `wildfire-public` desde fixture local o URL configurable.
- Raw inmutable en `var/raw/`.
- Normalización de `incidents.geojson` a `Observation`.
- Reconciliación MVP por `source_id + upstream_incident_id`.
- Idempotencia por `source_id + source_record_id + source_version`.
- API `/v1` para eventos, fuentes, runs, activos, impactos, reglas y alertas.
- UI `/operations` con mapa, lista, detalle, activos, regla de proximidad y acknowledge.
- Demo local reproducible.
- Pruebas backend, frontend y E2E sin red externa obligatoria.

## Fuera de alcance

- AEMET y DGT como eventos nativos.
- Autenticación y multiempresa.
- Notificaciones externas.
- Kafka, Redis, Celery, Kubernetes, Neo4j y WebSockets.
- Kepler.gl, deck.gl, Terraform y cloud productivo.
- Clustering FIRMS, merge oficial-satélite y predicción.

## Arquitectura

Monolito modular: FastAPI y CLI comparten persistencia y servicios de aplicación. PostGIS guarda estado operacional. `var/raw/` conserva payloads del feed. React consume la API local y usa MapLibre para visualizar eventos y activos.

## Contrato upstream

Fuente: `wildfire-public`.

Artefactos:

- `manifest.json`
- `incidents.geojson`
- `sources.json`

Campos críticos usados: `schema_version`, `generated_at`, `data_age_seconds`, `worst_data_age_seconds`, `features[].properties.id`, `status`, `status_origen`, `confirmed_by`, `first_detected`, `last_detected`, `position_precision_m`, `origin`, `satellite_confirmed`, `official_confirmed` y geometría `Point`.

## Fases

1. Modelo y migraciones.
2. Feed wildfire, raw e ingesta.
3. Normalización, idempotencia y reconciliación.
4. API operacional.
5. Impactos y alerta interna.
6. Frontend React + MapLibre.
7. Demo reproducible.
8. Pruebas.
9. Documentación.
10. Validación final.

## Riesgos silenciosos

- Estado afirmado sin fuente oficial.
- `ingested_at` presentado como frescura del incendio.
- Distancias calculadas en grados.
- Reingesta que duplica observaciones.
- Revisión creada por cambios técnicos sin semántica.
- Payload vacío tratado como ausencia sin contexto.
- Alerta duplicada por misma regla, evento, activo y revisión.
- Mapa en blanco por fallo de capa.

## Criterios de aceptación

- [x] Migración desde base vacía.
- [x] Raw inmutable local.
- [x] Fixture wildfire válido importado sin red.
- [x] Segunda ingesta idempotente.
- [x] Cambio relevante crea `EventRevision`.
- [x] API devuelve eventos por bbox/tiempo y detalle con procedencia.
- [x] UI muestra mapa, lista, detalle y latencias separadas.
- [x] Asset puntual crea impacto por proximidad.
- [x] Regla wildfire-distancia crea alerta interna deduplicada.
- [x] Alerta puede reconocerse.
- [x] `make demo` reproduce el flujo.
- [x] `make check` pasa.
- [x] Repo de incendios sigue intacto.

## Pruebas

- Migración base vacía.
- Feed válido, schema desconocido, payload malformado, vacío legítimo, vacío sospechoso, stale, geometría inválida, estado sin fuente y precisión negativa.
- Primera ingesta, idempotencia, revisión y no revisión sin cambio.
- API bbox, tiempo, detalle, observaciones, revisiones y health.
- Asset, distancia, regla, deduplicación y acknowledge.
- Frontend render, lista, ficha, health, asset, alerta, URL y E2E demo.

## Documentación

- `README.md`
- `docs/03-PIPELINE-Y-TRANSFORMACIONES.md`
- `docs/04-ARQUITECTURA-BACKEND.md`
- `docs/05-ONTOLOGIA-Y-MODELO-DATOS.md`
- `docs/06-CONTRATOS-Y-APIS.md`
- `docs/07-FUENTES-Y-ADAPTADORES.md`
- `docs/08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md`
- `docs/09-INTERFAZ-Y-VISUALIZACION.md`
- `docs/11-ESTADO-DEL-PROYECTO.md`
- `docs/13-PLAN-MVP-RAPIDO.md`
- `docs/sources/wildfire-public-feed.md`
- `docs/contracts/wildfire-public-feed-v1.md`

## Checklist

- [x] Preflight y rama.
- [x] Fase 1.
- [x] Fase 2.
- [x] Fase 3.
- [x] Fase 4.
- [x] Fase 5.
- [x] Fase 6.
- [x] Fase 7.
- [x] Fase 8.
- [x] Fase 9.
- [x] Fase 10.
