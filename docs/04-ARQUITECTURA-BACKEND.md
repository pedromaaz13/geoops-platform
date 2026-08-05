# Arquitectura backend

## Estado MVP wildfire

El backend actual es un monolito modular FastAPI. La API y la CLI comparten
modelos SQLAlchemy, sesiones de base de datos y servicios de aplicación. Alembic
crea la migración inicial PostGIS. Los endpoints `/health` y `/ready` siguen
siendo la puerta operacional mínima, y `/v1` expone eventos, fuentes, activos,
impactos, reglas y alertas internas.

---

Este documento convierte el pipeline conceptual en una estructura implementable.

---

## 1. Objetivos

El backend debe:

- ingerir fuentes heterogéneas;
- conservar raw;
- normalizar observaciones;
- reconciliar eventos;
- consultar espacio y tiempo;
- mantener revisiones;
- calcular impactos;
- ejecutar reglas;
- exponer API;
- publicar snapshots;
- degradarse por fuente sin caer por completo.

---

## 2. Modular monolith primero

M0 será un monolito modular, no microservicios.

```text
services/
├── api/
│   └── geoops_api/
│       ├── application/
│       ├── domain/
│       ├── infrastructure/
│       ├── interfaces/
│       └── main.py
│
└── ingestion/
    └── geoops_ingestion/
        ├── adapters/
        ├── normalizers/
        ├── pipelines/
        ├── reconcilers/
        └── cli.py
```

API e ingesta pueden compartir paquetes de dominio y persistencia sin copiar
modelos.

---

## 3. Capas

### Domain

- entidades;
- value objects;
- invariantes;
- decisiones de reconciliación;
- cálculo puro;
- sin FastAPI ni SQLAlchemy cuando sea posible.

### Application

- casos de uso;
- transacciones;
- orquestación;
- puertos;
- autorización;
- servicios de aplicación.

### Infrastructure

- SQLAlchemy/PostGIS;
- R2/GCS;
- HTTP;
- email;
- adaptadores;
- logging;
- métricas.

### Interfaces

- FastAPI;
- CLI;
- jobs;
- DTO;
- OpenAPI.

---

## 4. Dependencias

```text
interfaces → application → domain
infrastructure → application/domain
domain → nada externo salvo tipos mínimos
```

Evitar:

- modelos SQLAlchemy usados como respuestas API;
- lógica de negocio en routers;
- requests HTTP desde el dominio;
- imports circulares;
- contratos duplicados sin generación.

---

## 5. Base de datos

Tablas M0:

```text
sources
source_runs
raw_payloads
observations
events
event_observations
event_revisions
```

M2:

```text
organizations
users
assets
asset_groups
impacts
alert_rules
alerts
cases
case_actions
```

Índices:

```sql
CREATE INDEX ix_observations_geometry
ON observations USING GIST (geometry);

CREATE INDEX ix_events_geometry
ON events USING GIST (geometry);

CREATE INDEX ix_events_type_updated
ON events (event_type, updated_at DESC);

CREATE UNIQUE INDEX ux_observation_source_record_version
ON observations (source_id, source_record_id, source_version)
WHERE source_record_id IS NOT NULL;
```

Reglas:

- EPSG:4326 en almacenamiento.
- `geography` o proyección apropiada para distancia.
- timestamps UTC.
- observaciones inmutables.
- soft delete solo donde tenga sentido de negocio.
- migraciones Alembic versionadas.
- ninguna migración destructiva sin plan y backup.

---

## 6. Transacciones

### Ingesta

Una unidad de trabajo por fuente y run.

- fallo de una fuente no revierte otras;
- raw se guarda antes de normalizar;
- observaciones válidas pueden persistir aunque existan registros rechazados;
- `partial` debe explicitar cuántos se rechazaron.

### Reconciliación

Por observación o lote pequeño:

- bloquear evento candidato cuando se actualiza;
- evitar carreras;
- revisión y actualización en la misma transacción;
- idempotency key.

### Impactos y alertas

- impacto calculado con `calculation_version`;
- regla con cooldown;
- unique key para evitar duplicado de alerta;
- envío fuera de la transacción principal mediante outbox cuando se implemente.

---

## 7. API

FastAPI:

```text
/v1/events
/v1/events/{id}
/v1/events/{id}/observations
/v1/events/{id}/revisions
/v1/sources
/v1/sources/health
/v1/assets
/v1/impacts
/v1/alert-rules
/v1/alerts
/v1/stream
```

Principios:

- cursor pagination;
- bbox obligatorio para consultas cartográficas amplias;
- límite máximo;
- ETag o `updated_after`;
- geometría simplificada según endpoint;
- detalle separado de listado;
- errores con código estable;
- OpenAPI como contrato.

---

## 8. Tiempo real

M0 usa polling o SSE.

SSE es suficiente para:

```text
event.created
event.updated
source.degraded
impact.created
alert.created
```

WebSocket solo se adopta si existe comunicación bidireccional o colaboración en
tiempo real.

---

## 9. Caché

- TanStack Query en cliente.
- CDN para snapshots.
- ETag/Last-Modified.
- No añadir Redis hasta medir una consulta que lo necesite.
- Las consultas espaciales deben resolverse primero con índices y contratos
  correctos.

---

## 10. Despliegue

Local:

```text
Docker Compose:
postgres-postgis
api
ingestion
web
```

Cloud inicial:

```text
Cloud Run service  → API
Cloud Run job      → ingesta
Cloud SQL          → PostGIS
R2/GCS             → raw y snapshots
CDN                → portal público
```

Separar configuración por entorno. Secretos nunca en repositorio.

---

## 11. Seguridad inicial

- CORS restrictivo.
- límites de request;
- validación de GeoJSON;
- no renderizar HTML de usuario;
- secretos en gestor;
- logs redactados;
- dependencia lockeada;
- CodeQL;
- Dependabot/Renovate;
- CSP;
- auditoría de licencias.

Autenticación y multiempresa entran cuando existan activos privados. El diseño
de tablas debe prever `organization_id`, pero no se implementa una plataforma
IAM completa en M0.

---

## 12. Criterios de calidad

```text
[ ] Dominio separado de frameworks.
[ ] Migraciones reproducibles.
[ ] API OpenAPI.
[ ] Idempotencia.
[ ] Errores por fuente.
[ ] Logging estructurado.
[ ] Métricas.
[ ] Tests de integración con PostGIS.
[ ] Docker healthchecks.
[ ] Build reproducible.
[ ] Ninguna dependencia futura sin consumidor.
```
