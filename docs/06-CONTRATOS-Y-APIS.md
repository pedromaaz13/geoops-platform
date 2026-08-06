# Contratos y APIs

## Estado MVP wildfire

El contrato `wildfire-public` v1 está documentado en
`docs/contracts/wildfire-public-feed-v1.md` y probado mediante fixture local. La
API `/v1` implementada cubre eventos, detalle, observaciones, revisiones,
fuentes, runs, activos, impactos, reglas y alertas. FastAPI expone OpenAPI en
runtime, pero los endpoints no declaran `response_model`; no existe esquema
versionado, cliente generado ni tipos TypeScript generados. SSE queda fuera del
MVP.

---

Los contratos versionados y las pruebas consumidor-productor son la dirección
objetivo. Hoy solo el feed `wildfire-public` tiene documento y pruebas de
invariantes; la API conserva tipos manuales en frontend.

---

## 1. Contrato del feed wildfire

GeoOps consume actualmente:

```text
manifest.json
incidents.geojson
sources.json
```

Manifiesto mínimo:

```json
{
  "schema_version": 1,
  "dataset": "wildfire_incidents_spain",
  "generated_at": "2026-08-05T00:00:00Z",
  "run_id": "20260805T000000Z",
  "counts": {
    "incidents": 65
  }
}
```

GeoOps debe rechazar:

- versión desconocida;
- fecha futura;
- colección sin `features`;
- IDs duplicados;
- geometrías inválidas;
- estado sin procedencia;
- caída sospechosa no explicada.

---

## 2. Event summary

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-4.1, 40.2]
  },
  "properties": {
    "id": "uuid",
    "type": "wildfire",
    "subtype": null,
    "title": "Incendio cerca de ...",
    "status": null,
    "status_source_id": null,
    "severity": null,
    "precision_m": 375,
    "confidence": null,
    "last_observed_at": "2026-08-05T00:00:00Z",
    "updated_at": "2026-08-05T00:10:00Z",
    "sources": ["wildfire-public"],
    "attributes": {}
  }
}
```

## 3. Event detail

Añade:

```text
observations_count
revisions_count
impacts_count
```

`summary`, `attributes` y la procedencia ya forman parte de `properties` en el
listado. El detalle no incluye actualmente `source_health` ni `links`.

---

## 4. Endpoints M0

```http
GET /v1/events
GET /v1/events/{event_id}
GET /v1/events/{event_id}/observations
GET /v1/events/{event_id}/revisions
GET /v1/events/{event_id}/timeline
GET /v1/operations/summary
GET /v1/sources
GET /v1/sources/health
GET /v1/source-runs
GET /v1/assets
GET /v1/assets/{asset_id}
POST /v1/assets
DELETE /v1/assets/{asset_id}
GET /v1/events/{event_id}/impacts
GET /v1/alert-rules
POST /v1/alert-rules
GET /v1/alerts
POST /v1/alerts/{alert_id}/acknowledge
GET /health
GET /ready
```

`GET /v1/sources/health` expone salud operacional por fuente. Campos relevantes:

```text
freshness_status
last_download_at
download_age_seconds
latest_observed_at
data_age_seconds
last_success_at
ttl_seconds
stale_reason
last_run
```

`freshness_status="stale"` significa que la fuente puede responder, pero la edad
de descarga o del dato supera el TTL configurado/declarado. Un ultimo run
`failed` no borra `last_success_at` ni el ultimo dato observado valido.

`GET /v1/operations/summary` incluye `source_health` con listas agregadas de
fuentes stale/failed y peores edades de dato/descarga.

Filtros:

```text
bbox
types
origins
sensors
min_confidence
status
sources
from
to
updated_after
has_impact
has_alert
limit
cursor
```

Filtros wildfire:

- `origins`: lista separada por comas con `satelite`, `oficial` o `ambos`.
- `sensors`: lista separada por comas; busca coincidencia declarada en el campo `sensors`.
- `min_confidence`: valor decimal entre `0` y `1`.

Estos filtros no inventan confianza. Solo operan cuando la observacion/evento la declara.

---

## 5. Respuesta cartográfica

Para listados:

```json
{
  "type": "FeatureCollection",
  "features": [],
  "meta": {
    "next_cursor": null,
    "generated_at": "...",
    "partial": false
  }
}
```

Las geometrías pesadas pueden servirse en endpoint separado o teselas.

Limitación verificada: `meta.partial` permanece `false` incluso cuando
`next_cursor` indica truncamiento. Es un defecto abierto de `GEO-FIX-001`, no
una garantía del contrato actual.

---

## 6. Errores

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "descripcion del ValueError",
    "request_id": "..."
  }
}
```

Este es el único envoltorio estable implementado por el manejador global de
`ValueError`. Los errores tipados por dominio, detalles por campo y catálogo de
códigos permanecen previstos.

---

## 7. Versionado

Implementado actualmente:

- prefijo `/v1` para la API;
- `schema_version=1` para el feed wildfire.

### Previsto, no implementado — 2026-08-06

- cambios compatibles no requieren versión mayor;
- renombrar/eliminar campos sí;
- la deprecación se documenta;
- tests de contrato entre productor y consumidor.

---

## 8. SSE

### Previsto, no implementado — 2026-08-06

No existe el endpoint `/v1/stream`. El siguiente contrato conserva la intención
de diseño:

```http
GET /v1/stream
Accept: text/event-stream
```

Eventos:

```text
event.created
event.updated
source.degraded
impact.created
alert.created
```

Cada mensaje lleva ID para reanudación.

---

## 9. Tipos TypeScript

Los tipos del frontend se mantienen manualmente en `apps/web/src/types.ts`.

### Previsto, no implementado — 2026-08-06

Generarlos desde un OpenAPI versionado y dejar de mantener dos contratos
equivalentes a mano.

---

## 10. Criterios

```text
[x] OpenAPI runtime de FastAPI.
[x] Fixture y ejemplos del feed wildfire validados.
[ ] OpenAPI versionado con `response_model`.
[ ] Test real frontend-API sin mocks.
[ ] Errores de dominio versionados.
[ ] Nulos documentados.
[ ] Límites y paginación.
[ ] Geometría y SRID.
[ ] Compatibilidad productor–consumidor.
```
