# GEO-001 · Bootstrap del repositorio GeoOps

## Pregunta que responde

¿Cómo puede una persona levantar, validar y desarrollar GeoOps Platform desde una máquina limpia con comandos locales reproducibles y equivalentes a CI?

## Problema

El repositorio contiene el paquete documental de arranque, pero todavía no existe una base ejecutable en la raíz: faltan monorepo, web, API, CLI de ingesta, PostGIS local, gestores reproducibles, lockfiles, comandos, CI y pruebas mínimas.

## Evidencia

- `docs/10-ROADMAP-M0.md` declara `GEO-001 · Bootstrap` como primer bloque de M0.
- `docs/11-ESTADO-DEL-PROYECTO.md` se actualiza durante el cierre de `GEO-001`.
- La documentación de arranque fue promovida a la raíz y la carpeta contenedora duplicada fue eliminada.
- El repositorio de referencia `../incendios_forestales_app` demuestra el patrón de comandos locales alineados con CI, pruebas por capas y documentación temporal en `.ai/`.

## Objetivo

Crear una base mínima, reproducible y verificable para GeoOps con web React/Vite, API FastAPI, CLI de ingesta mínima, PostGIS local, `uv`, `pnpm`, Makefile, CI, pruebas mínimas y documentación de instalación.

## Alcance

### Incluye

- Monorepo en raíz.
- `apps/web` con React, TypeScript, Vite, Vitest, Testing Library y Playwright preparado.
- `services/api` con FastAPI y endpoints `/health` y `/ready`.
- `services/ingestion` con CLI mínima y smoke/help command.
- Docker Compose con PostgreSQL + PostGIS y healthcheck.
- Entorno Python reproducible con `uv`.
- Workspace frontend con `pnpm`.
- Makefile con comandos equivalentes a `setup`, `dev`, `lint`, `typecheck`, `test` y `build`.
- `.env.example` sin secretos.
- GitHub Actions con las mismas puertas que local.
- README de instalación.
- ADR iniciales y estructura `.ai/` en raíz.
- Lockfiles.

### No incluye

- Lógica real de incendios.
- Modelos `Observation`, `Event`, `SourceRun`, `SourcePayload` o revisiones.
- Migraciones funcionales de dominio.
- Adaptadores de fuentes.
- Reconciliación.
- AEMET, DGT, activos, alertas u organizaciones.
- Autenticación.
- Kafka, Kubernetes, Redis, Celery, Neo4j o WebSockets.
- Kepler.gl, deck.gl, Terraform o infraestructura cloud productiva.

## Reutilización

- De `incendios_forestales_app`: patrón de CI por puertas, `ruff` explícito, pruebas rápidas antes de E2E, fixtures sin red, `.ai/` para trabajo temporal y documentación honesta del estado real.
- No se copiará lógica wildfire ni carpetas completas.
- Se reutilizarán convenciones, no dominio.

## Diseño

El bootstrap será un monolito modular mínimo. La API y la ingesta vivirán como servicios Python separados dentro del mismo repositorio, con configuración común solo cuando exista consumo real. La web será una app React aislada bajo `apps/web`. La base de datos local será PostGIS por Docker Compose, preparada para healthchecks, sin crear tablas de dominio.

Los endpoints de salud no afirmarán capacidades futuras: `/health` comprobará vida del proceso y `/ready` disponibilidad de dependencias configuradas. La CLI de ingesta solo demostrará que el paquete y el comando cargan correctamente.

## Archivos probables

- `AGENTS.md`
- `README.md`
- `Makefile`
- `.env.example`
- `docker-compose.yml`
- `pyproject.toml`
- `uv.lock`
- `package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `.github/workflows/ci.yml`
- `.ai/README.md`
- `.ai/tasks/GEO-001-BOOTSTRAP.md`
- `.ai/tasks/TEMPLATE.md`
- `.ai/handoffs/TEMPLATE.md`
- `.ai/debug/TEMPLATE.md`
- `docs/**`
- `services/api/**`
- `services/ingestion/**`
- `apps/web/**`

## Dependencias

- Producción Python: FastAPI y servidor ASGI para exponer healthchecks; alternativa sería librería estándar HTTP, pero FastAPI está decidido en la arquitectura y se usa ahora.
- Producción Python: `psycopg` para que `/ready` valide PostGIS con una consulta real; alternativa sería devolver disponibilidad sin base, pero no cumpliría el criterio de readiness.
- Desarrollo Python: `pytest`, `ruff` y `mypy` como type checker único.
- Producción frontend: React y React DOM para la pantalla inicial decidida; alternativa sería Vite vanilla, pero React está fijado para GeoOps.
- Desarrollo frontend: TypeScript, Vite, Vitest, Testing Library, Playwright.
- Infraestructura local: imagen Docker oficial de PostGIS. En Apple Silicon se usa `POSTGIS_PLATFORM=linux/amd64` por defecto porque la etiqueta oficial seleccionada no publica manifest arm64 nativo.

## Riesgos silenciosos

- Que `make dev` arranque parcialmente y parezca listo sin PostGIS saludable.
- Que `/ready` devuelva éxito aunque la base no esté disponible.
- Que CI ejecute comandos distintos a local.
- Que el README prometa capacidades futuras.
- Que se añadan dependencias de dominio sin consumidor actual.
- Que Playwright quede configurado pero sin smoke verificable.
- Que la documentación de estado duplique información del roadmap.

## Plan

1. Crear rama de trabajo.
2. Promover el paquete documental mínimo a la raíz respetando las fuentes de verdad.
3. Preparar estructura `.ai/` y mantener esta tarea como contrato activo.
4. Añadir configuración Python con `uv`, Ruff, type checking y pytest.
5. Crear API FastAPI mínima con `/health`, `/ready` y prueba.
6. Crear CLI mínima de ingesta y prueba.
7. Añadir Docker Compose con PostGIS y healthcheck.
8. Añadir workspace frontend con React, Vite, TypeScript, Vitest, Testing Library y Playwright.
9. Añadir Makefile con comandos locales reproducibles.
10. Añadir CI con las mismas puertas que el Makefile.
11. Actualizar README, ADR/estado si procede y esta tarea.
12. Ejecutar validaciones específicas y luego la suite completa.

## Pruebas

- Test de API para `/health` y `/ready`.
- Test de CLI para ayuda o smoke command.
- Test de componente o render mínimo de la web.
- Smoke E2E de Playwright para la pantalla inicial.
- `make lint`.
- `make typecheck`.
- `make test`.
- `make build`.

## Criterios de aceptación

- [x] `make setup` funciona en una máquina limpia con requisitos documentados.
- [x] `make dev` arranca los componentes locales previstos o documenta claramente cómo hacerlo.
- [x] `make lint` ejecuta Ruff y lint frontend si aplica.
- [x] `make typecheck` valida Python y TypeScript.
- [x] `make test` ejecuta pytest, Vitest e integración de PostGIS; Playwright se ejecuta con `make e2e` y `make check`.
- [x] `make build` compila los artefactos previstos.
- [x] PostGIS tiene healthcheck.
- [x] FastAPI expone `/health` y `/ready`.
- [x] La web muestra una pantalla inicial de GeoOps.
- [x] La CLI de ingesta tiene ayuda o smoke command.
- [x] Backend y frontend tienen prueba mínima.
- [x] CI ejecuta las mismas puertas que local.
- [x] README permite instalar desde máquina limpia.
- [x] No hay secretos.
- [x] No se afirma que una función existe si solo está preparada para futuro.

## Documentación

- [x] `README.md`
- [x] `docs/11-ESTADO-DEL-PROYECTO.md`
- [x] `docs/13-PLAN-MVP-RAPIDO.md`
- [x] ADR afectados si aparece una decisión nueva. No hizo falta crear uno nuevo.
- [x] `.ai/tasks/GEO-001-BOOTSTRAP.md`
