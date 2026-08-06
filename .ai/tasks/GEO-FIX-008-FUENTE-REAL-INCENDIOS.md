# GEO-FIX-008 · Primera fuente real de incendios

Estado: previsto, no implementado. Origen: registro canónico de `docs/11` y roadmap
M1 (`docs/10-ROADMAP-M0.md:130`).

## Pregunta que responde

¿Ingiere GeoOps datos reales de incendios de un endpoint externo, o solo el fixture
local `wildfire-public`?

## Problema

Hoy la única fuente es un fixture local; no hay adaptador real ni scheduler, así que la
consola muestra datos de demo. Es el mayor hueco de "producto".

## Evidencia

- Única fuente fixture: `services/api/geoops_api/wildfire_ingest.py:33` (`SOURCE_ID = "wildfire-public"`).
- Sin scheduler ni scraping: `docs/07-FUENTES-Y-ADAPTADORES.md:11`.
- Previsto/no conectado: `docs/11-ESTADO-DEL-PROYECTO.md:73`, `:136`.

## Objetivo

Conectar **una** fuente real de incendios tras un adaptador, normalizada al contrato
wildfire existente, para que la consola muestre eventos reales verificables.

## Alcance

### Incluye
- Un adaptador de fuente real (recomendado: **EFFIS** por licencia abierta y cobertura;
  AEMET CAP como alternativa) que descargue y normalice al contrato `wildfire-public`.
- Reutilizar las invariantes de validación y el guard de vacío sospechoso ya existentes.
- Comando de ingesta manual contra la fuente real (además del fixture).
- Fixture grabado de la respuesta real para tests de contrato (sin red en CI).

### No incluye
- Scheduler/cron productivo (queda como paso posterior; ingesta manual basta para M1).
- Segunda vertical (AEMET/DGT como tipos nativos distintos de wildfire).
- Reconciliación avanzada más allá de la actual (ver `GEO-FIX-004`).

## Reutilización

Pipeline funcional de `wildfire_ingest.py`: `_validate_feed` (`:138`),
`_store_raw_payloads` (`:296`), `_reject_suspicious_empty_feed` (`:278`),
`_find_event`/`_merge_event_snapshot`. El contrato `wildfire-public` v1
(`docs/contracts/`) es el objetivo de normalización.

## Diseño

Adaptador que mapea el feed real → el mismo GeoJSON/atributos que consume la ingesta;
`content_hash` para raw inmutable; verificación previa de endpoint, licencia y formato.

## Archivos probables

- `services/ingestion/` (nuevo adaptador de fuente real) o `services/api/geoops_api/wildfire_ingest.py`.
- `tests/fixtures/` (respuesta real grabada) y `tests/ingestion/` (contrato).
- `docs/07-FUENTES-Y-ADAPTADORES.md`, `docs/11-ESTADO-DEL-PROYECTO.md`.

## Dependencias

Requiere endpoint real accesible y verificado (licencia/formato). Se apoya en el contrato
tipado ya cerrado (`GEO-FIX-003`).

## Riesgos silenciosos

- Endpoint inestable o con licencia no reutilizable → elegir EFFIS/AEMET con verificación previa.
- Introducir red en CI: la suite debe correr contra fixture grabado, no contra la fuente.
- Desalinear el mapeo con el contrato wildfire y romper la consola.

## Plan

1. Verificar endpoint, licencia y formato de la fuente elegida; grabar fixture.
2. Implementar el adaptador (descarga + normalización al contrato wildfire).
3. Reusar validación/guards; ingesta manual funcionando.
4. Test de contrato contra el fixture grabado.
5. Documentar la fuente como conectada en `docs/07` y `docs/11`.

## Pruebas

- Ingesta contra fixture real grabado → eventos normalizados sin regresión de invariantes.
- Contrato de la fuente real (campos mínimos, geometría, precisión).

## Criterios de aceptación

- [ ] Una fuente real ingiere eventos normalizados al contrato wildfire.
- [ ] La suite corre sin red (fixture grabado).
- [ ] `docs/07`/`docs/11` reflejan la fuente como conectada.

## Documentación

- [ ] Contrato de la fuente real documentado en `docs/contracts/`.
