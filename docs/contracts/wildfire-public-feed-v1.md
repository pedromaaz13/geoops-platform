# Wildfire Public Feed v1

Contrato consumidor de GeoOps para `wildfire-public`.

## Artefactos

- `manifest.json`
- `incidents.geojson`
- `sources.json`

La ingesta local usa `tests/fixtures/wildfire_public/`. Una URL viva puede
pasarse con `geoops-ingestion wildfire-public --base-url`.

## Campos Críticos

`manifest.json`:

- `schema_version`: debe ser `1`.
- `generated_at`: hora de generación del productor.
- `run_id`: identificador de ejecución upstream.
- `counts.incidents`: número esperado de features.

`incidents.geojson`:

- `FeatureCollection` con geometrías `Point` en lon/lat.
- `properties.id`: identificador upstream estable.
- `properties.source_version`: versión del registro; si falta se usa el hash del
  payload.
- `properties.first_detected` y `properties.last_detected`: tiempos del evento.
- `properties.position_precision_m`: precisión publicada.
- `properties.status`: estado canónico si existe.
- `properties.status_origen` o `properties.confirmed_by`: procedencia del estado.
- `properties.origin`, `official_confirmed`, `satellite_confirmed`: evidencia.

`sources.json`:

- fuentes upstream registrables;
- salud y frescura de fuente cuando esté disponible.

## Validaciones

GeoOps rechaza versión desconocida, fecha futura, colección sin features, IDs
duplicados, geometrías no puntuales, precisión negativa y `status` sin fuente.

## Persistencia

Cada artefacto se conserva en `var/raw/source=wildfire-public/date=.../run=...`.
La idempotencia de observación usa:

```text
source_id + source_record_id + source_version
```

La reconciliación MVP usa:

```text
wildfire-public + upstream_incident_id
```

## Fuera De Alcance

No se implementa merge oficial-satélite avanzado, clustering FIRMS ni scraping
del repositorio de referencia.
