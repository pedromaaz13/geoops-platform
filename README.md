# GeoOps Platform

Plataforma operacional geoespacial para integrar observaciones procedentes de
fuentes heterogéneas, mantener eventos canónicos, cruzarlos con activos
puntuales, calcular impactos y activar reglas y alertas internas. Rutas y casos
forman parte de la dirección de producto, pero no están implementados.

La primera vertical consume artefactos compatibles con el feed público de
incendios forestales mediante fixture local o URL configurable. GeoOps no tiene
una dependencia de código con `incendios_forestales_app`: reutiliza
selectivamente sus contratos, fixtures, invariantes y método de ingeniería.

## Orden de lectura

1. `AGENTS.md`
2. `docs/00-LEEME-PRIMERO.md`
3. El documento indicado por el router.
4. La tarea activa en `.ai/tasks/`, cuando exista.

## Flujo actual

```text
wildfire public fixture/live artifacts
        ↓ geoops-ingestion wildfire-public
raw payloads + Observation
        ↓ reconciliation
Event + EventRevision
        ↓ PostGIS + FastAPI
Operations Console
        ↓
Asset + Impact + internal Alert
```

La demo MVP permite importar un feed wildfire reducido, consultar eventos por
API, ver lista/mapa/detalle, crear un activo puntual, calcular impacto por
proximidad, crear una regla `wildfire within distance` y reconocer la alerta.

## Estado actual

Además del bootstrap de GEO-001, el MVP wildfire entrega:

- migración PostGIS inicial con fuentes, raw, observaciones, eventos,
  revisiones, activos, impactos, reglas y alertas;
- ingesta `wildfire-public` desde fixture local o URL configurable;
- raw inmutable local en `var/raw/`;
- reconciliación wildfire por identificador upstream y, entre observaciones
  oficial/satélite, por tolerancia espacial dependiente de precisión dentro de
  una ventana temporal de seis horas;
- API `/v1` para eventos, fuentes, runs, activos, impactos, reglas y alertas;
- consola React con MapLibre, lista, detalle, procedencia y acciones básicas;
- pruebas unitarias y de integración; el E2E actual valida la interfaz con la
  API interceptada mediante mocks.

No existen todavía AEMET/DGT nativos, autenticación, multiempresa,
notificaciones externas ni infraestructura productiva.

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

Este comando levanta PostGIS, espera su healthcheck y arranca FastAPI y Vite.
Ejecuta migraciones antes si partes de una base limpia:

```bash
make migrate
```

- API: `http://127.0.0.1:8000`
- Web: Vite imprime la URL real. Normalmente `http://127.0.0.1:5173`; si el
  puerto esta ocupado puede usar `5174-5179`.
- Consola: abre `/operations` sobre la URL local impresa por Vite. No existe
  React Router: Vite sirve la misma shell de aplicación y la consola conserva
  panel, filtros y selección en la query string mediante `history.replaceState`.

La API permite CORS local para `127.0.0.1` y `localhost` en los puertos
`5173-5179`, de forma que `make demo && make dev` siga cargando datos aunque
Vite use un puerto alternativo.

`make dev` comprueba antes el puerto de API. Si `8000` está ocupado por otra
aplicación, falla con un mensaje explícito para evitar que la web cargue contra
un backend equivocado.

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

La integración real navegador-API sin mocks está prevista en `GEO-FIX-005`; no
se considera implementada por el smoke E2E actual.

## Demo MVP wildfire

```bash
make demo
make dev
```

`make demo` levanta PostGIS, espera el healthcheck, aplica migraciones, importa
`tests/fixtures/wildfire_public` y crea un activo/regla de demostración. Es
idempotente para la reingesta del fixture y reutiliza la regla demo si ya existe.

Para reiniciar la base local y los raw de demo:

```bash
make reset-demo
```

## Smoke manual

Con PostGIS levantado:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
uv run geoops-ingestion --help
uv run geoops-ingestion smoke
uv run geoops-ingestion wildfire-public --fixture tests/fixtures/wildfire_public
uv run geoops-ingestion demo-seed
```

`/ready` solo responde `200` si puede ejecutar `postgis_version()` contra la
base local.
