# Producto y arquitectura inicial de GeoOps

**Versión:** 1.0  
**Repositorio de referencia:** `pedromaaz13/incendios_forestales_app`  
**Nuevo repositorio:** `pedromaaz13/geoops-platform`

Este documento responde **qué construimos y cómo debe nacer el producto**.
El método diario de trabajo está en `02-SISTEMA-DE-TRABAJO.md`; el detalle del
pipeline está en `03-PIPELINE-Y-TRANSFORMACIONES.md`.

## Estado de este documento

Verificado contra `main@c1fcb83` el 2026-08-06. Este documento conserva la
dirección de producto, pero distingue expresamente el software existente de la
arquitectura prevista. El estado operativo vigente está únicamente en
`11-ESTADO-DEL-PROYECTO.md`.

---

## 1. Decisión de producto

GeoOps será una plataforma operacional geoespacial que responda:

- qué está ocurriendo;
- dónde y desde cuándo;
- qué fuente lo afirma;
- qué antigüedad y precisión tiene la información;
- qué activos, rutas, parcelas o poblaciones pueden verse afectados;
- qué reglas se han activado;
- qué acciones se han realizado.

La propuesta de valor inicial es:

> Integrar eventos geoespaciales externos, cruzarlos con activos privados y
> convertirlos en impactos, alertas y flujos operativos verificables.

---

## 2. Relación con el repositorio de incendios

No se transforma ni se clona el repositorio actual.

```text
incendios_forestales_app
    producto público especializado
    pipeline wildfire
    generador de artefactos
    laboratorio de calidad
              │
              │ contrato versionado
              ▼
geoops-platform
    ontología genérica
    estado operacional
    API
    activos
    impactos
    reglas
    alertas
    consola operacional
```

El visor de incendios conserva:

- FIRMS, VIIRS, MODIS y MTG;
- limpieza y deduplicación térmica;
- clustering de focos;
- perímetros;
- fusión oficial–satélite;
- estados y vocabulario wildfire;
- publicación pública de alta resiliencia.

GeoOps reutiliza actualmente:

- salud de fuentes;
- distinción entre tiempos;
- fixtures reales;
- validaciones;
- cálculos geoespaciales;
- pruebas y principios de honestidad.

### Previsto, no implementado — 2026-08-06

- contratos `SourceAdapter` y `ObservationNormalizer` separados;
- publicación y snapshots;
- exportación Parquet/PMTiles;
- carga diferida del pipeline.

---

## 3. Ontología operacional

La unidad de diseño deja de ser “una capa del mapa”.

```text
Source
  ejecuta SourceRun
  produce SourcePayload
  normalizado como Observation
             │
             ├── soporta
             ├── actualiza
             ├── contradice
             ▼
           Event
             │
             ├── afecta a Asset
             ├── intersecta Route
             ├── produce Impact
             ▼
          AlertRule
             ▼
           Alert
             ▼
            Case
```

Objetos persistidos actualmente:

- `Source`
- `SourceRun`
- `SourcePayload`
- `Observation`
- `Event`
- `EventObservation`
- `EventRevision`
- `Asset`
- `Impact`
- `AlertRule`
- `Alert`

### Previsto, no implementado — 2026-08-06

- `Organization`
- `Route`
- `Case`

---

## 4. Primera vertical y evolución

### M0 — Incendios

GeoOps consume un fixture o una URL con artefactos compatibles con el contrato
del visor y los convierte en observaciones y eventos persistentes. No importa
código ni consulta directamente el repositorio de referencia.

### M1 — Eventos independientes

#### Previsto, no implementado — 2026-08-06

- avisos AEMET;
- cortes e incidencias DGT;
- terremotos IGN;
- activaciones Copernicus EMS;
- avisos hidrológicos.

AEMET y DGT dejan de ser solo “contexto de un incendio”: existen como eventos
propios aunque no haya fuego.

### M2 — Activos e impacto

Implementado: activos puntuales, impacto por distancia y una regla wildfire de
proximidad. Los siguientes tipos y geometrías siguen previstos:

- campings;
- subestaciones;
- plantas solares o eólicas;
- fincas;
- almacenes;
- torres;
- rutas;
- parcelas;
- explotaciones ganaderas.

### M3 — Reglas y alertas

Implementado de forma interna: creación de regla de proximidad, alerta y
acknowledge. Casos, acciones, cooldown material, resolución automática y
notificación externa permanecen previstos.

```text
Evento
  ↓
Impacto calculado
  ↓
Regla
  ↓
Alerta
  ↓
Acuse / caso / acción
```

---

## 5. Arquitectura inicial

Implementado actualmente:

```text
fixture o URL configurable
        ↓ CLI wildfire-public
raw local + Observation
        ↓ reconciliación
Event + EventRevision
        ↓ PostgreSQL/PostGIS
FastAPI + consola React
        ↓
Asset + Impact + AlertRule + Alert internos
```

### Previsto, no implementado — 2026-08-06

El siguiente diagrama es la arquitectura objetivo, no la topología desplegada:

```mermaid
flowchart LR
    SRC[Fuentes externas] --> ING[Ingestion adapters]
    ING --> RAW[Raw inmutable · R2/GCS]
    ING --> OBS[Observation]
    OBS --> REC[Event reconciliation]
    REC --> EVT[(PostgreSQL/PostGIS)]
    EVT --> IMP[Impact calculation]
    IMP --> RULE[Rule evaluation]
    EVT --> API[FastAPI]
    RULE --> API
    API --> WEB[React Operations Console]
    EVT --> SNAP[Snapshots públicos]
    SNAP --> CDN[CDN]
```

### Stack

Frontend implementado:

```text
React
TypeScript
Vite
MapLibre GL JS
TanStack Query
Vitest
Testing Library
Playwright
```

Backend implementado:

```text
Python 3.12+
FastAPI
SQLAlchemy
Alembic
PostgreSQL + PostGIS
GeoAlchemy2
pytest
```

Los endpoints actuales no usan modelos Pydantic de request/response ni
`response_model`; OpenAPI se genera en runtime a partir de firmas con
`dict[str, Any]`.

### Previsto, no implementado — 2026-08-06

- React Router y rutas independientes de cliente;
- Zustand si aparece estado global que no cubran React y TanStack Query;
- deck.gl cuando exista una necesidad analítica medida;
- clientes y tipos generados desde OpenAPI.

Persistencia implementada:

```text
PostGIS      estado operacional y consultas espaciales
filesystem   payloads raw locales en var/raw
```

### Previsto, no implementado — 2026-08-06

R2/GCS, histórico Parquet, snapshots, PMTiles y CDN no forman parte del
repositorio ni del despliegue actual.

No entran en M0:

- Kafka;
- Kubernetes;
- Neo4j;
- Redis;
- Celery;
- WebSockets;
- microservicios independientes por dominio;
- IA predictiva.

---

## 6. Estructura inicial del repositorio

Estructura implementada:

```text
geoops-platform/
├── apps/web/
├── services/api/
├── services/ingestion/
├── alembic/
├── docs/
├── scripts/
├── tests/
└── .ai/
```

### Previsto, no implementado — 2026-08-06

El siguiente árbol conserva la dirección modular. No existe todavía la carpeta
`packages/` ni sus paquetes compartidos:

```text
geoops-platform/
├── AGENTS.md
├── README.md
├── Makefile
├── docker-compose.yml
├── .env.example
│
├── apps/
│   └── web/
│
├── services/
│   ├── api/
│   └── ingestion/
│
├── packages/
│   ├── contracts-python/
│   ├── contracts-ts/
│   ├── geo-python/
│   ├── map-layers/
│   └── ui/
│
├── infrastructure/
├── docs/
├── scripts/
├── tests/
└── .ai/
```

Aunque aparezcan varias carpetas, M0 funciona con:

- una API;
- una CLI o job de ingesta;
- una base de datos;
- una aplicación web.

No se separa un servicio hasta que exista una necesidad medida.

---

## 7. Interfaz de producto

El patrón visual se inspira en Disaster Ninja, no se copia literalmente.

```text
┌──────────────────────────────────────────────────────────────────┐
│ GeoOps · ámbito · tiempo · búsqueda · fuentes · organización     │
├─────┬──────────────────┬────────────────────┬─────────────────────┤
│ NAV │ EVENTOS          │ MAPA               │ CAPAS / LEYENDA     │
│     │ filtros          │                    │                     │
│ 🔥  │ incendio         │                    │ eventos             │
│ ⚠️  │ aviso            │                    │ meteorología        │
│ 🚧  │ corte            │                    │ infraestructura     │
│ 🌊  │ inundación       │                    │ activos             │
├─────┴──────────────────┴────────────────────┴─────────────────────┤
│ TIMELINE / ESTADO DE CARGA / REPRODUCCIÓN                        │
└──────────────────────────────────────────────────────────────────┘
```

Áreas conceptuales:

- `/operations`: eventos gobernados y operación;
- `/sources`: salud y calidad;
- `/assets`: activos privados;
- `/alerts`: reglas y alertas;
- `/lab`: exploración libre con Kepler.gl o laboratorio propio.

### Estado actual — 2026-08-06

La aplicación no usa React Router ni ofrece esas áreas como rutas independientes.
Existe una única shell, normalmente abierta en `/operations`, con rail y drawers
para Home, Operaciones, Fuentes, Activos, Alertas, Capas, Análisis y
Configuración. El panel y los filtros se reflejan en la query string.

---

## 8. Primera definición de terminado

GeoOps M0 termina cuando:

```text
[x] El repositorio se instala desde cero.
[ ] PostGIS, API y web arrancan con Docker Compose (solo PostGIS usa Compose).
[x] Se importa un fixture o URL compatible con el feed público del visor.
[x] La segunda ejecución es idempotente.
[x] Se almacenan observaciones inmutables.
[x] Se crean eventos canónicos y revisiones.
[x] La API consulta por bbox, tiempo y tipo.
[x] La UI tiene mapa, lista, ficha, capas y fuentes.
[x] Observed_at e ingested_at se muestran separados.
[x] El estado conserva su procedencia.
[x] La precisión y la incertidumbre son visibles.
[x] CI ejecuta pruebas, typecheck, build y E2E mockeado.
[ ] Existe una demo desplegada.
```

El detalle de ejecución se encuentra en `10-ROADMAP-M0.md`.
