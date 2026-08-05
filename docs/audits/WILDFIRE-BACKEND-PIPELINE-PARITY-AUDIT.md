# Auditoria backend/pipeline wildfire

Fecha: 2026-08-05.

Repositorio origen: `pedromaaz13/incendios_forestales_app`  
Ruta local inspeccionada: `../incendios_forestales_app`  
Commit inspeccionado: `2d7451a38847ba48bd0fb63c6e76622407fd523c`  
Estado del origen durante la inspeccion: `?? .DS_Store` preexistente. No se modifico.

## Resumen

GeoOps ya tiene un MVP vertical wildfire con raw persistence, `Observation`,
`Event`, revisiones, impactos, alertas y endpoints `/v1`. No alcanza todavia la
paridad backend del visor original: faltan invariantes de publicacion amplios,
controles de salida vacia sospechosa, filtros sensor/confianza/origen,
medicion de precision por fuente, salud de fuentes con cuota y stale real, y
pipeline satelite/oficial completo.

## Matriz de capacidades

| Capacidad | Visor de incendios | GeoOps actual | Estado | Proxima accion |
|---|---|---|---|---|
| Endpoints inventados | `AGENTS.md` prohibe URLs falsas; adaptadores dejan `url=""` cuando falta fuente. | `AGENTS.md` lo prohibe; wildfire MVP usa fixture/local URL. | Parcial | Mantener bloqueo por fuente nueva en `docs/sources/`. |
| Raw inmutable | Exporta artefactos y conserva ultimo estado publicado. | `RawPayload` + `var/raw/` por ingesta. | Paridad MVP | Probar reproceso desde raw en tarea pipeline. |
| Observacion vs evento | Hotspot/parte se fusionan en incidente. | `Observation` reconciliada a `Event`. | Paridad MVP | Formalizar `EventReconciliation` si aparece segundo adaptador real. |
| Separacion temporal | `first_detected`, `last_detected`, latencia de dato y ejecucion. | `observed_at`, `published_at`, `ingested_at`, `updated_at`, edades en summary. | Paridad MVP | Anadir invariantes de tiempos invertidos. |
| Estado sin fuente | Invariante 9 aborta si hay estado sin parte oficial. | Test MVP rechaza status sin official/source. | Parcial | Ampliar a suite de invariantes por evento/observacion. |
| Geometria valida | Invariante bbox Espana + Canarias; aborta `(0,0)`. | `GEO-WF-002` valida Point dentro de bbox Espana+Canarias antes de ingestar. | Paridad MVP | Ampliar si futuras verticales salen de Espana. |
| Precision positiva | Invariante 6 aborta precision nula/cero. | `GEO-WF-002` exige `position_precision_m` obligatorio y positivo en wildfire-public. | Paridad MVP | Medir precision por fuente real en tareas posteriores. |
| Sensor/confianza/origen | `instrument`, `confidence_pct`, `origin`, `official_confirmed`, `satellite_confirmed`. | Atributos MVP existen en raw/attributes, no como filtros publicos completos. | Pendiente | Exponer filtros wildfire `origin`, `sensor`, `confidence` cuando se estabilice contrato. |
| Falso positivo | `clean` excluye antorchas industriales y baja confianza. | No hay pipeline FIRMS real ni exclusion list. | Fuera de alcance actual | Portar solo cuando exista fuente FIRMS real/fixture. |
| Cluster satelital | `cluster` agrupa hotspots en incendio candidato. | MVP ingiere incidentes ya agregados. | Pendiente | Tarea futura si GeoOps consume hotspots, no `incidents.geojson`. |
| Fusion oficial/satelite | `merge` usa tolerancia por precision de fuente y ventana temporal. | Reconciliacion MVP por `source_id + upstream_incident_id`. | Pendiente | Portar comportamiento cuando haya dos observaciones para un mismo evento. |
| Salida vacia sospechosa | `AGENTS.md` y publicacion evitan interpretar cero como ausencia si historico tenia datos. | No hay guard especifico contra caida sospechosa del feed. | Pendiente critico | Bloquear actualizacion canonica si fixture/feed cae a cero sin razon declarada. |
| Salud de fuentes | `SourceHealth` distingue descarga, dato fresco, stale, cuota, separacion medida. | `/v1/sources/health` distingue success/partial/stale/failed/disabled demo con edades basicas. | Parcial | Anadir `latest_data_at`, cuota si aplica, y stale por TTL real de fuente. |
| Publicacion segura | `validate_or_abort` impide publicar corrupto y conserva ejecucion anterior. | API lee PostGIS; no hay snapshot publico ni guard de publicacion. | Pendiente | Definir `PublicSnapshot` cuando vuelva la publicacion estatica. |
| Smoke de pipeline | `scripts/smoke_test.py` genera datos sinteticos y valida exclusiones. | `make demo` ingiere fixture y seed de activo/regla. | Parcial | Anadir escenario demo con muchos eventos y fuente degradada. |
| Pruebas | Suite amplia de invariantes, fuentes, merge, export, E2E visual. | Pytest MVP + Vitest + Playwright; `GEO-WF-002` anade invariantes unitarios de contrato wildfire. | Parcial | Priorizar salida vacia sospechosa, stale real y E2E degradados. |

## Rutas origen consultadas

- `../incendios_forestales_app/AGENTS.md`
- `../incendios_forestales_app/CLAUDE.md`
- `../incendios_forestales_app/src/incendios/sources/adapters.py`
- `../incendios_forestales_app/src/incendios/merge.py`
- `../incendios_forestales_app/src/incendios/validate.py`
- `../incendios_forestales_app/src/incendios/export.py`
- `../incendios_forestales_app/src/incendios/health.py`
- `../incendios_forestales_app/scripts/build_demo_data.py`
- `../incendios_forestales_app/scripts/smoke_test.py`
- `../incendios_forestales_app/tests/test_invariants.py`

## Tareas recomendadas

1. `GEO-WF-003 · Guard de salida vacia sospechosa`.
   - Si una ingesta nueva trae cero eventos y la ejecucion anterior tenia
     actividad reciente, marcar fuente `failed/partial` y conservar estado.

2. `GEO-WF-004 · Source health con stale real`.
   - Separar edad de descarga, edad del dato, TTL por fuente, razon stale y
     ultimo exito.

3. `GEO-WF-005 · Filtros wildfire de origen/sensor/confianza`.
   - Solo si el contrato expone esos campos de forma estable.

4. `GEO-WF-006 · Reconciliacion multiobservacion wildfire`.
   - Portar la idea de tolerancia por precision y ventana temporal cuando
     existan observaciones oficiales y satelitales separadas.

## Riesgos vivos

- La UI puede parecer mas madura que el pipeline real.
- `incidents.geojson` ya llega agregado; no prueba limpieza FIRMS, clustering ni
  exclusion de falsos positivos.
- La fuente demo es util para desarrollo, pero no sustituye tests de cero
  sospechoso ni stale real por fuente.
- No declarar paridad wildfire completa hasta cerrar las tareas anteriores.

## GEO-WF-002 cerrado

Se anadio una puerta de contrato wildfire que rechaza:

- IDs ausentes o duplicados;
- `origin` incoherente con `satellite_confirmed` y `official_confirmed`;
- geometria no `Point` o fuera del bbox operativo Espana+Canarias;
- `position_precision_m` ausente, cero o negativo;
- `first_detected` posterior a `last_detected`;
- `status` fuera de vocabulario;
- `status` sin `official_confirmed`, `confirmed_by` y `status_origen=oficial`;
- `n_hotspots=0` cuando el origen no es oficial.

