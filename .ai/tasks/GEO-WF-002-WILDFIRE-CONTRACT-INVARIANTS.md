# GEO-WF-002 · Invariantes de contrato wildfire

## Pregunta que responde
Que validaciones impiden que un feed wildfire corrupto se convierta en `Observation` y `Event` canonicos?

## Problema
GeoOps tenia validaciones MVP, pero no una puerta de contrato comparable al visor original. Faltaban invariantes de origen, tiempos, bbox, precision obligatoria, vocabulario y coherencia entre estado y fuente oficial.

## Evidencia
- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md` marca como pendiente la suite de invariantes.
- `services/api/geoops_api/wildfire_ingest.py` valida duplicados y algunos casos, pero no todos los invariantes del contrato wildfire.
- `../incendios_forestales_app/src/incendios/validate.py` aborta publicacion ante violaciones de contrato.

## Objetivo
Fortalecer `_validate_feed` y cubrirlo con tests de regresion para rechazar feeds wildfire incoherentes antes de crear observaciones/eventos.

## Alcance
### Incluye
- IDs unicos y obligatorios.
- `origin` y flags `satellite_confirmed`/`official_confirmed` coherentes.
- Geometria Point valida dentro de bbox Espana+Canarias.
- `position_precision_m` obligatorio y positivo.
- `first_detected <= last_detected`.
- `status` dentro de vocabulario permitido.
- Ningun estado sin `official_confirmed`, `confirmed_by` y `status_origen=oficial`.
- `n_hotspots=0` solo para origen oficial.

### No incluye
- Guard ampliado de salida vacia sospechosa con historico previo.
- Stale real por fuente.
- Reconciliacion oficial/satelite por tolerancia.
- Nuevos endpoints o nuevas fuentes.

## Reutilización
Se porta comportamiento conceptual de `../incendios_forestales_app/src/incendios/validate.py`, no codigo ni carpetas completas.

## Diseño
La validacion sigue viviendo cerca de la ingesta `wildfire-public` porque el contrato actual es un feed especifico.

## Archivos probables
- `services/api/geoops_api/wildfire_ingest.py`
- `tests/ingestion/test_wildfire_contract_invariants.py`
- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`

## Dependencias
Ninguna nueva.

## Riesgos silenciosos
- Rechazar un caso legitimo por vocabulario demasiado estrecho.
- Validar solo el primer error y ocultar corrupciones adicionales.
- Confundir ausencia real de incendios con fallo de fuente; queda para tarea separada.

## Plan
1. Anadir tests unitarios de invariantes del feed.
2. Fortalecer `_validate_feed`.
3. Ejecutar prueba especifica.
4. Ejecutar suite ingestion/integration.
5. Actualizar auditoria y estado.

## Pruebas
- `uv run pytest tests/ingestion/test_wildfire_contract_invariants.py -q`
- `uv run pytest tests/ingestion tests/mvp -q`
- `make test`
- `make check`

## Criterios de aceptación
- [x] Feed valido pasa sin errores.
- [x] Duplicado, bbox invalido, precision invalida, tiempo invertido, origen incoherente y estado sin fuente fallan.
- [x] La ingesta no crea observaciones/eventos si el feed viola contrato.
- [x] Documentacion actualizada.

## Documentación
- [x] `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
- [x] `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`
