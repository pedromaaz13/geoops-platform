# Ontología y modelo de datos

## Estado MVP wildfire

La migración `0001_mvp_core` materializa el núcleo mínimo: `Source`,
`SourceRun`, `RawPayload`, `Observation`, `Event`, `EventObservation`,
`EventRevision`, `Asset`, `Impact`, `AlertRule` y `Alert`.

Desde `GEO-CORE-001` (migración `0002`, ver `docs/adr/ADR-004`): la geometría de
`Event`, `Observation` y `Asset` es genérica `GEOMETRY(4326)` (point/line/area) con
`CHECK` de SRID y dos columnas generadas `geometry_kind` y `representative_point`.
Existe `Organization` y `organization_id` en `Asset`, `AlertRule`, `Alert` e
`Impact`, fijado por entorno. Aún no hay usuarios, autenticación (auth es
`GEO-PROD-001`), casos ni canales externos.

---

La ontología es el lenguaje común de GeoOps. No debe intentar representar todo
el mundo en M0; debe modelar con precisión los objetos que ya tienen procesos.

---

## 1. Principios

- Observación y evento son objetos distintos.
- La fuente nunca desaparece.
- Los cambios generan revisiones.
- Los impactos son relaciones calculadas.
- Las alertas se explican mediante reglas.
- Los atributos críticos se modelan; JSONB queda para extensiones.
- Los vocabularios son versionados.
- Nulo significa desconocido, no cero.

---

## 2. Source

Implementado (`services/api/geoops_api/models.py:16`):

```text
id
name
kind
enabled
criticality
created_at
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`owner`, `region`, `license`, `configuration_reference`.

No contiene secretos.

## 3. SourceRun

Implementado (`services/api/geoops_api/models.py:27`):

```text
id
source_id
started_at
finished_at
status
records_downloaded
records_accepted
records_rejected
latest_observed_at
raw_payload_count
error_type
error_message
```

El raw se localiza vía `RawPayload.content_hash` / `storage_uri`
(`models.py:44`), no con `payload_hash` / `raw_uri` en el run. Estos dos campos
son **previstos, no implementados** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)).

Estados:

```text
success
partial
empty
stale
failed
disabled
```

## 4. Observation

Implementado (`services/api/geoops_api/models.py:57`):

```text
id
source_id
source_record_id
source_version
event_type
observed_at
published_at
ingested_at
geometry
precision_m
confidence
attributes
raw_payload_id
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`time_precision` y `spatial_precision`. Hoy solo existe `precision_m`.

Es inmutable.

## 5. Event

Implementado íntegro (`services/api/geoops_api/models.py:75`); la columna real
de `type` es `event_type`. `valid_from` y `valid_to` **existen** (`models.py:90`).

```text
id
type            # columna: event_type
subtype
title
summary
status
status_source_id
severity
severity_source_id
geometry
precision_m
confidence
valid_from
valid_to
last_observed_at
created_at
updated_at
attributes
```

## 6. EventObservation

```text
event_id
observation_id
relation_type
score
created_at
reconciliation_version
```

Relaciones:

```text
supports
updates
contradicts
locates
confirms_status
confirms_severity
```

## 7. EventRevision

```text
event_id
revision_number
changed_at
changed_fields
previous_snapshot
new_snapshot
reason
source_observation_ids
```

## 8. Asset

Implementado (`services/api/geoops_api/models.py:123`); la columna real de `type`
es `asset_type`:

```text
id
name
type            # columna: asset_type
geometry
criticality
created_at
updated_at
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`organization_id`, `tags`, `valid_from`, `valid_to`, `attributes`. A diferencia de
`Event`, el `Asset` actual **no** tiene ventanas de validez.

## 9. Route

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)): la
entidad `Route` no existe en `models.py`. Puede ser subtipo de Asset o entidad
independiente cuando necesite segmentos, origen, destino y ventanas.

## 10. Impact

Implementado (`services/api/geoops_api/models.py:135`):

```text
id
event_id
asset_id
impact_type
distance_m
intersects
score
reasons
calculated_at
calculation_version
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`expires_at`.

Tipos iniciales:

```text
proximity
intersection
route_disruption
weather_exposure
population_exposure
```

## 11. AlertRule

Implementado (`services/api/geoops_api/models.py:150`). El modelo M0 es más simple
que el diseño objetivo: una regla apunta a un `asset_id` con umbral de distancia,
no a vocabularios ni canales:

```text
id
name
enabled
event_type          # singular, no event_types
asset_id            # un asset, no asset_types
distance_threshold_m
cooldown_minutes
created_at
updated_at
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`organization_id`, `event_types`, `asset_types`, `conditions`, `channels`. Las
condiciones se validan mediante esquema; no guardar SQL arbitrario.

## 12. Alert

Implementado (`services/api/geoops_api/models.py:164`):

```text
id
rule_id
event_id
asset_id
impact_id
status
message
deduplication_key
created_at
acknowledged_at
resolved_at
```

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)):
`sent_at`, `delivery_attempts` (dependen de la entrega por canales externos, aún
no modelada).

## 13. Case

**Previsto, no implementado** (estado en [`docs/11`](11-ESTADO-DEL-PROYECTO.md)): la
entidad `Case` no existe en `models.py`. Diseño objetivo:

```text
id
organization_id
title
status
priority
event_ids
asset_ids
owner_user_id
opened_at
closed_at
```

---

## 14. Ejemplo wildfire

```text
Observation
  source: wildfire-public-spain
  type: wildfire
  observed_at: última detección
  precision: 375 m
       │ supports
       ▼
Event
  type: wildfire
  status: controlled
  status_source: jcyl
       │ affects
       ▼
Asset
  type: camping
       │
       ▼
Impact
  proximity: 7.4 km
       │ matches
       ▼
AlertRule
  wildfire < 10 km
       ▼
Alert
```

---

## 15. Vocabularios

No crear un `status` universal que fuerce todos los dominios.

Núcleo:

```text
unknown
open
closed
```

Dominio wildfire:

```text
detected
active
stabilized
controlled
extinguished
```

Weather warning:

```text
upcoming
active
expired
cancelled
```

La API puede devolver `status_family` además del estado de dominio.

---

## 16. Identidad

Prioridad:

1. ID estable de la fuente.
2. ID estable compuesto y documentado.
3. Hash canónico.
4. Reconciliación espacio–temporal.

No derivar identidad únicamente de un centroide redondeado.

Aliases:

```text
event_aliases
source_id
external_id
event_id
valid_from
valid_to
```

---

## 17. Reglas de nulabilidad

- `observed_at`: nulo cuando la fuente no lo proporciona.
- `ingested_at`: obligatorio.
- `status`: nulo sin fuente.
- `precision_m`: nulo si no se conoce.
- `confidence`: nulo si no existe una escala comparable.
- `valid_to`: nulo para evento abierto.

No rellenar huecos con valores “razonables”.
