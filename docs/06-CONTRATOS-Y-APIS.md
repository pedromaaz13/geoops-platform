# Contratos y APIs

Los contratos separan los repositorios, los servicios y el frontend. Todo
contrato público tiene versión y pruebas.

---

## 1. Contrato del feed wildfire

GeoOps consumirá inicialmente:

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
  "id": "uuid",
  "type": "wildfire",
  "subtype": null,
  "title": "Incendio cerca de ...",
  "status": null,
  "status_source_id": null,
  "severity": null,
  "geometry": {
    "type": "Point",
    "coordinates": [-4.1, 40.2]
  },
  "precision_m": 375,
  "last_observed_at": "2026-08-05T00:00:00Z",
  "updated_at": "2026-08-05T00:10:00Z",
  "sources": ["wildfire-public-spain"]
}
```

## 3. Event detail

Añade:

```text
summary
attributes
observations_count
revisions_count
impacts_count
source_health
links
```

---

## 4. Endpoints M0

```http
GET /v1/events
GET /v1/events/{event_id}
GET /v1/events/{event_id}/observations
GET /v1/events/{event_id}/revisions
GET /v1/sources
GET /v1/sources/health
GET /health
GET /ready
```

Filtros:

```text
bbox
types
status
severity
from
to
updated_after
limit
cursor
```

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

---

## 6. Errores

```json
{
  "error": {
    "code": "UNSUPPORTED_SCHEMA_VERSION",
    "message": "Unsupported wildfire schema version",
    "details": {
      "received": 2,
      "supported": [1]
    },
    "request_id": "..."
  }
}
```

Códigos estables, mensajes humanos y `request_id`.

---

## 7. Versionado

- `/v1` para API.
- `schema_version` para datasets.
- cambios compatibles no requieren versión mayor;
- renombrar/eliminar campos sí;
- la deprecación se documenta;
- tests de contrato entre productor y consumidor.

---

## 8. SSE

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

Los tipos del frontend se generan desde OpenAPI o JSON Schema. No se mantienen a
mano dos contratos equivalentes.

---

## 10. Criterios

```text
[ ] OpenAPI generado.
[ ] Ejemplos válidos.
[ ] Tests de contrato.
[ ] Errores versionados.
[ ] Nulos documentados.
[ ] Límites y paginación.
[ ] Geometría y SRID.
[ ] Compatibilidad productor–consumidor.
```
