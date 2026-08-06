# Arquitectura backend

## Estado MVP wildfire

El backend actual es un monolito modular FastAPI. La API y la CLI comparten
modelos SQLAlchemy, sesiones de base de datos y servicios de aplicación. Alembic
crea la migración inicial PostGIS. Los endpoints `/health` y `/ready` siguen
siendo la puerta operacional mínima, y `/v1` expone eventos, fuentes, activos,
impactos, reglas y alertas internas.

Verificado contra `main@c1fcb83` el 2026-08-06. La modularidad actual se limita
a módulos Python planos (`main.py`, `operations.py`, `models.py` y
`wildfire_ingest.py`). No existe todavía una separación física por capas de
dominio, aplicación, infraestructura e interfaces.

---

Este documento convierte el pipeline conceptual en una estructura implementable.

---

## 1. Objetivos

Dirección objetivo del backend:

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

El repositorio actual es un monolito desplegable, no microservicios:

```text
services/
├── api/
│   └── geoops_api/
│       ├── main.py
│       ├── models.py
│       ├── operations.py
│       └── wildfire_ingest.py
│
└── ingestion/
    └── geoops_ingestion/
        └── cli.py
```

La CLI importa hoy la implementación y los modelos de `geoops_api`; no existe un
paquete compartido independiente.

### Previsto, no implementado — 2026-08-06

La separación `application/domain/infrastructure/interfaces` y las carpetas
`adapters/normalizers/pipelines/reconcilers` son la dirección modular prevista.

---

## 3. Capas

### Previsto, no implementado — 2026-08-06

Las siguientes capas describen una frontera objetivo. No existen como paquetes
ni garantizan hoy independencia respecto a FastAPI o SQLAlchemy.

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

### Previsto, no implementado — 2026-08-06

Estas reglas describen la dirección de dependencias deseada; la implementación
actual comparte modelos SQLAlchemy y servicios entre API y CLI.

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

Tablas implementadas:

```text
sources
source_runs
raw_payloads
observations
events
event_observations
event_revisions
assets
impacts
alert_rules
alerts
```

### Previsto, no implementado — 2026-08-06

`organizations`, `users`, `asset_groups`, `routes`, `cases` y `case_actions` no
existen en `models.py` ni en la migración `0001_mvp_core`.

Índices:

```sql
CREATE INDEX ix_observations_geometry
ON observations USING GIST (geometry);

CREATE INDEX ix_events_geometry
ON events USING GIST (geometry);

CREATE INDEX ix_events_type_updated
ON events (event_type, updated_at DESC);

CREATE UNIQUE INDEX ux_observation_source_record_version
ON observations (source_id, source_record_id, source_version);
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

Esta sección define invariantes objetivo. La ingesta actual usa una sesión por
ejecución y conserva raw local; no existe todavía outbox ni una infraestructura
de jobs aislados por fuente.

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

Endpoints implementados:

```text
/health
/ready
/v1/events
/v1/operations/summary
/v1/events/{id}
/v1/events/{id}/observations
/v1/events/{id}/revisions
/v1/events/{id}/timeline
/v1/sources
/v1/sources/health
/v1/source-runs
/v1/assets
/v1/assets/{id}
/v1/events/{id}/impacts
/v1/alert-rules
/v1/alerts
/v1/alerts/{id}/acknowledge
```

### Previsto, no implementado — 2026-08-06

No existen `/v1/stream`, un endpoint genérico `/v1/impacts`, resolución de
alertas ni rutas de casos.

Comportamiento actual:

- límite máximo de 200 eventos;
- cursor basado en UUID de evento;
- `bbox` opcional;
- filtro `updated_after`;
- listado y detalle separados;
- errores `ValueError` con código `INVALID_REQUEST`.

### Previsto, no implementado — 2026-08-06

Principios pendientes:

- cursor compuesto y estable para paginación;
- bbox obligatorio para consultas cartográficas amplias;
- ETag;
- geometría simplificada según endpoint;
- errores de dominio con códigos estables;
- OpenAPI como contrato.

---

## 8. Tiempo real

### Previsto, no implementado — 2026-08-06

La consola usa peticiones HTTP mediante TanStack Query. No existe SSE ni
WebSocket. SSE se mantiene como opción futura para:

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

- TanStack Query está implementado en cliente.
- No existe caché de servidor, CDN, snapshots ni ETag/Last-Modified.

### Previsto, no implementado — 2026-08-06

- CDN para snapshots.
- ETag/Last-Modified.
- No añadir Redis hasta medir una consulta que lo necesite.
- Las consultas espaciales deben resolverse primero con índices y contratos
  correctos.

---

## 10. Despliegue

Local:

```text
Docker Compose → PostgreSQL/PostGIS
host local     → FastAPI, CLI de ingesta y Vite
```

### Previsto, no implementado — 2026-08-06

No existe despliegue cloud ni infraestructura productiva. Dirección inicial:

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

Implementado actualmente:

- CORS restringido a orígenes locales configurados;
- no se renderiza HTML de usuario;
- secretos fuera del repositorio mediante variables de entorno;
- dependencias bloqueadas en lockfiles.

### Previsto, no implementado — 2026-08-06

- límites de request;
- validación de GeoJSON;
- secretos en gestor administrado;
- logs redactados;
- CodeQL;
- Dependabot/Renovate;
- CSP;
- auditoría de licencias.

Autenticación, multiempresa y `organization_id` no están implementados, aunque
ya existan activos puntuales locales en el MVP.

---

## 12. Criterios de calidad

```text
[ ] Dominio separado de frameworks.
[x] Migraciones reproducibles.
[x] OpenAPI runtime, sin contrato tipado.
[x] Idempotencia del fixture wildfire.
[x] Errores y salud por fuente.
[x] Logging estructurado mínimo.
[ ] Métricas.
[x] Tests de integración con PostGIS.
[x] Docker healthcheck de PostGIS.
[x] Build reproducible.
[x] Ninguna dependencia futura sin consumidor actual.
```
