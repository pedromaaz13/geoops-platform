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
medicion de precision por fuente, cuotas por fuente y pipeline satelite/oficial
completo.

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
| Sensor/confianza/origen | `instrument`, `confidence_pct`, `origin`, `official_confirmed`, `satellite_confirmed`. | `GEO-WF-005` expone `origins`, `sensors` y `min_confidence` en `/v1/events` y UI. | Paridad MVP | Ampliar vocabulario cuando haya fuentes reales. |
| Falso positivo | `clean` excluye antorchas industriales y baja confianza. | No hay pipeline FIRMS real ni exclusion list. | Fuera de alcance actual | Portar solo cuando exista fuente FIRMS real/fixture. |
| Cluster satelital | `cluster` agrupa hotspots en incendio candidato. | MVP ingiere incidentes ya agregados. | Pendiente | Tarea futura si GeoOps consume hotspots, no `incidents.geojson`. |
| Fusion oficial/satelite | `merge` usa tolerancia por precision de fuente y ventana temporal. | `GEO-WF-006` fusiona observaciones wildfire oficial/satelite por ventana 6h y tolerancia basada en precision. | Paridad MVP | Formalizar motor generico si aparece segundo adaptador real. |
| Salida vacia sospechosa | `AGENTS.md` y publicacion evitan interpretar cero como ausencia si historico tenia datos. | `GEO-WF-003` rechaza `features=[]` tras actividad wildfire reciente, conserva raw y ultimo estado valido. | Paridad MVP | Afinar por TTL/fuente cuando haya fuentes reales. |
| Salud de fuentes | `SourceHealth` distingue descarga, dato fresco, stale, cuota, separacion medida. | `GEO-WF-004` separa descarga, dato, ultimo exito, TTL y razon stale para `/v1/sources/health`. | Paridad MVP | Anadir cuotas por fuente si aplica. |
| Publicacion segura | `validate_or_abort` impide publicar corrupto y conserva ejecucion anterior. | API lee PostGIS; no hay snapshot publico ni guard de publicacion. | Pendiente | Definir `PublicSnapshot` cuando vuelva la publicacion estatica. |
| Smoke de pipeline | `scripts/smoke_test.py` genera datos sinteticos y valida exclusiones. | `make demo` ingiere fixture y seed de activo/regla. | Parcial | Anadir escenario demo con muchos eventos y fuente degradada. |
| Pruebas | Suite amplia de invariantes, fuentes, merge, export, E2E visual. | Pytest MVP + Vitest + Playwright; `GEO-WF-002` anade invariantes, `GEO-WF-003` cubre vacio sospechoso y `GEO-WF-004` cubre stale real. | Parcial | Priorizar filtros y reconciliacion. |

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

1. `GEO-WF-007 · Fixtures wildfire ampliados`.
   - Muchos eventos, textos largos, fuentes degradadas, baja confianza y casos
   de frontera para filtros/reconciliacion.

2. `GEO-WF-008 · Reproceso desde raw`.
   - Verificar que un raw payload puede reconstruir observaciones/eventos sin
   depender de estado temporal.

## Riesgos vivos

- La UI puede parecer mas madura que el pipeline real.
- `incidents.geojson` ya llega agregado; no prueba limpieza FIRMS, clustering ni
  exclusion de falsos positivos.
- La fuente demo es util para desarrollo, pero no sustituye fixtures mas ricos
  de muchos eventos, cuotas y degradaciones por fuente real.
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

## GEO-WF-003 cerrado

Se anadio una guardia de salida vacia sospechosa para `wildfire-public`:

- `features=[]` en base limpia se acepta como `status="empty"`;
- `features=[]` con actividad wildfire previa en las ultimas 72h se rechaza;
- la ingesta vacia sospechosa conserva los tres raw payloads para auditoria;
- el `SourceRun` queda `status="failed"` y `error_type="suspicious_empty"`;
- no se crean ni modifican `Observation`/`Event`;
- la API conserva el ultimo estado valido existente.

El umbral de 72h es conservador y provisional para detectar cero sospechoso; el
stale visible de fuentes queda separado en `GEO-WF-004`.

## GEO-WF-004 cerrado

Se anadio source health con stale real:

- `last_download_at` y `download_age_seconds` describen la ultima descarga/run;
- `latest_observed_at` y `data_age_seconds` describen la edad del fenomeno/dato;
- `last_success_at` se conserva aunque el ultimo run falle;
- `ttl_seconds` decide stale cuando existe;
- `stale_reason` explica la degradacion;
- `/v1/operations/summary` agrega `stale_sources`, `failed_sources`,
  `worst_data_age_seconds` y `worst_download_age_seconds`.

No se anadieron fuentes externas ni migraciones. Las cuotas por fuente quedan
pendientes hasta que exista una fuente real que las declare.

## GEO-WF-005 cerrado

Se anadieron filtros wildfire:

- `origins` en `/v1/events`;
- `sensors` en `/v1/events`;
- `min_confidence` en `/v1/events`;
- controles equivalentes en la UI operacional;
- propagacion de `confidence` desde payload a `Observation` y `Event`.

## GEO-WF-006 cerrado

Se anadio reconciliacion MVP oficial/satelite:

- exact match por `upstream_incident_id` sigue siendo prioritario;
- si los IDs difieren, se permite fusionar observaciones wildfire dentro de 6h;
- la distancia admisible usa la precision declarada con minimo 1000 m;
- el evento fusionado conserva `upstream_incident_ids`, `origins`, sensores y
  ambas relaciones `EventObservation`;
- una observacion sin estado oficial no borra un estado oficial anterior.
