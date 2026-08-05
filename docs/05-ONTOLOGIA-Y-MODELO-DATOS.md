# Ontología y modelo de datos

## Estado MVP wildfire

La migración `0001_mvp_core` materializa el núcleo mínimo: `Source`,
`SourceRun`, `RawPayload`, `Observation`, `Event`, `EventObservation`,
`EventRevision`, `Asset`, `Impact`, `AlertRule` y `Alert`. Las geometrías
puntuales viven en PostGIS con SRID 4326. No existen todavía organizaciones,
usuarios, casos, canales externos ni modelos de otros tipos de evento.

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

```text
id
name
kind
owner
region
license
criticality
enabled
configuration_reference
```

No contiene secretos.

## 3. SourceRun

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
payload_hash
raw_uri
error_type
error_message
```

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

```text
id
source_id
source_record_id
source_version
event_type
observed_at
published_at
ingested_at
time_precision
geometry
spatial_precision
precision_m
confidence
attributes
raw_payload_id
```

Es inmutable.

## 5. Event

```text
id
type
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

```text
id
organization_id
type
name
geometry
criticality
tags
valid_from
valid_to
attributes
```

## 9. Route

Puede ser subtipo de Asset o entidad independiente cuando necesite segmentos,
origen, destino y ventanas.

## 10. Impact

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
expires_at
```

Tipos iniciales:

```text
proximity
intersection
route_disruption
weather_exposure
population_exposure
```

## 11. AlertRule

```text
id
organization_id
name
enabled
event_types
asset_types
conditions
channels
cooldown_minutes
created_at
updated_at
```

Las condiciones se validan mediante esquema; no guardar SQL arbitrario.

## 12. Alert

```text
id
rule_id
event_id
asset_id
impact_id
status
message
created_at
sent_at
acknowledged_at
resolved_at
deduplication_key
delivery_attempts
```

## 13. Case

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
