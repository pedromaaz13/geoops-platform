# GeoOps Platform

Plataforma operacional geoespacial para integrar observaciones procedentes de
fuentes heterogéneas, mantener eventos canónicos, cruzarlos con activos y rutas,
calcular impactos y activar reglas, alertas y casos.

La primera vertical es la aplicación pública de incendios forestales de España.
GeoOps no sustituye ese repositorio: lo consume como primera fuente y reutiliza
selectivamente su arquitectura, sus contratos, sus fixtures, sus invariantes y
su método de ingeniería.

## Orden de lectura

1. `AGENTS.md`
2. `docs/00-LEEME-PRIMERO.md`
3. El documento indicado por el router.
4. La tarea activa en `.ai/tasks/`, cuando exista.

## Primera meta

```text
incendios_forestales_app
        ↓ artefactos versionados
GeoOps ingestion
        ↓
Observation
        ↓ reconciliación
Event
        ↓
PostGIS + API
        ↓
Operations Console
```

La primera demo debe permitir consultar incendios por espacio y tiempo, conocer
qué observaciones los respaldan, qué fuente afirma su estado, la antigüedad y
precisión del dato y su evolución.

## Estado actual

GEO-001 prepara únicamente el entorno de desarrollo. Hoy existen:

- API FastAPI con `GET /health` y `GET /ready`;
- PostGIS local mediante Docker Compose;
- CLI mínima `geoops-ingestion`;
- web React/Vite con pantalla inicial honesta;
- pruebas mínimas de backend, CLI, frontend y E2E smoke.

No existen todavía modelos de dominio, adaptadores reales, ingesta wildfire,
eventos persistidos, activos ni alertas.

## Requisitos

- Python 3.12 compatible.
- `uv`.
- Node.js 22 compatible.
- `pnpm` 10.30.1.
- Docker con Docker Compose.

## Instalación

```bash
cp .env.example .env
make setup
```

`make setup` crea `.env` si falta, sincroniza Python con `uv`, instala el
workspace frontend con `pnpm` e instala Chromium para Playwright.

## Desarrollo local

```bash
make dev
```

Este comando levanta PostGIS, espera su healthcheck y arranca FastAPI y Vite:

- API: `http://127.0.0.1:8000`
- Web: `http://127.0.0.1:5173`

Para detener PostGIS:

```bash
make stop
```

## Comandos

```bash
make lint
make typecheck
make test
make test-unit
make test-integration
make build
make e2e
make check
```

`make check` representa las puertas de CI: Compose válido, lint, typecheck,
tests, build y smoke E2E.

## Smoke manual

Con PostGIS levantado:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
uv run geoops-ingestion --help
uv run geoops-ingestion smoke
```

`/ready` solo responde `200` si puede ejecutar `postgis_version()` contra la
base local.
