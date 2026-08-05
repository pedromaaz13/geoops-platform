# Wildfire Public Feed

## Organismo

Fuente agregada producida por el visor público de incendios de referencia. El
repositorio productor permanece separado y no se modifica desde GeoOps.

## Finalidad

Convertir incendios observados en eventos operacionales consultables, con
procedencia, precisión y tiempos separados.

## Endpoint

Fixture local por defecto para tests y demo:

```bash
tests/fixtures/wildfire_public
```

URL configurable:

```bash
geoops-ingestion wildfire-public --base-url <url>
```

## Autenticación

No aplica para el fixture. No se guardan credenciales.

## Frecuencia

La ingesta se ejecuta manualmente en el MVP. No hay scheduler.

## Formato

`manifest.json`, `incidents.geojson` y `sources.json`, documentados en
`docs/contracts/wildfire-public-feed-v1.md`.

## Identificador

`properties.id` del incidente upstream. La observación usa además
`source_version`.

## Tiempos

- `observed_at`: `last_detected`.
- `published_at`: `manifest.generated_at`.
- `ingested_at`: hora local de ingesta en GeoOps.

Estos tiempos no son intercambiables en API ni UI.

## Geometría

Punto `EPSG:4326`. Las distancias de impacto se calculan con PostGIS mediante
`ST_DistanceSphere`, no en grados.

## Precisión

`position_precision_m` se conserva en observación y evento.

## Estados

Un `status` solo se acepta si existe fuente explícita en `status_origen` o
`confirmed_by`. Un incidente satelital sin estado oficial puede crear evento con
estado desconocido.

## Respuesta Vacía

El MVP no trata todavía una caída brusca a cero como señal operacional completa.
El fixture contiene eventos para demo reproducible.

## Errores Observados

- `status` sin procedencia.
- geometría no puntual.
- precisión negativa.
- `schema_version` no soportado.

## Riesgos

- interpretar `ingested_at` como frescura del fuego;
- duplicar observaciones por reingesta;
- presentar estado oficial sin fuente;
- generar alertas duplicadas al reevaluar la misma regla.
