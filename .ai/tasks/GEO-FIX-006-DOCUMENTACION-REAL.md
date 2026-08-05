# GEO-FIX-006 · Documentacion que no miente

Estado: implementado y validado en `geo-fix-006-documentacion-real`; pendiente
de revision del PR draft.

## Pregunta que responde

¿Describe la documentacion de GeoOps el software que existe realmente en `c1fcb83`, separandolo de la arquitectura prevista?

## Problema

Los documentos que el router de lectura de `AGENTS.md` trata como fuentes de verdad mezclan capacidades implementadas con dependencias, rutas, paquetes, modelos y contratos que todavia no existen.

## Evidencia

| Afirmacion | Documento | Veredicto | Evidencia | Accion prevista |
|---|---|---|---|---|
| React Router, Zustand y deck.gl forman parte del frontend | `docs/01` | Falsa como estado actual | `apps/web/package.json:15` | Separar stack actual y previsto |
| Existe `packages/contracts-*`, `geo-python`, `map-layers` y `ui` | `docs/01` | Falsa | estructura del repositorio; no existe `packages/` | Mover a previsto |
| `Organization`, `Route` y `Case` existen en M1/M2 | `docs/01` | Falsa como estado actual | `services/api/geoops_api/models.py:16` | Separar modelos actuales y previstos |
| Docker Compose levanta API, ingesta y web | `docs/04` | Falsa | `docker-compose.yml:1` | Documentar que Compose solo levanta PostGIS |
| El backend ya usa capas `application/domain/infrastructure/interfaces` | `docs/04` | Falsa | `services/api/geoops_api/` | Mover estructura a prevista |
| Existe `/v1/stream` y SSE | `docs/04`, `docs/06` | Falsa | `services/api/geoops_api/main.py:71` | Mover a previsto |
| El resumen de evento tiene campos en raiz | `docs/06` | Falsa | `services/api/geoops_api/operations.py:42` | Documentar GeoJSON Feature real |
| Existe filtro `severity` | `docs/06` | Falsa | `services/api/geoops_api/main.py:99` | Eliminarlo del contrato actual |
| Los tipos TypeScript se generan desde OpenAPI | `docs/06` | Falsa | `apps/web/src/types.ts:1` | Declarar tipos manuales y generacion prevista |
| Existen `SourceAdapter` y `ObservationNormalizer` como Protocol | `docs/07` | Falsa | `services/api/geoops_api/wildfire_ingest.py:1` | Mover contratos a previsto |
| No existe layer registry | `docs/09` | Falsa | `apps/web/src/registries/layers.ts:18` | Corregir contradiccion |
| No se muestran filtros de origen, sensor y confianza | `docs/09` | Falsa | `apps/web/src/app/App.tsx:779` | Documentarlos como implementados |
| `/operations` es una ruta de React | `README`, `docs/01`, `docs/09` | Falsa | `apps/web/src/main.tsx:1`, `apps/web/src/app/App.tsx:175` | Explicar shell unica y query state |
| La reconciliacion solo usa identificador upstream | `README`, `docs/11` | Falsa tras GEO-WF-006 | `services/api/geoops_api/wildfire_ingest.py:458` | Documentar ID y tolerancia espacio-temporal |
| `make test-api`, `test-ingestion` y `test-contract` existen | `AGENTS.md` | Falsa | `Makefile:11` | Enumerar solo targets reales |

## Objetivo

Dejar una fuente de verdad verificable para que una persona o agente pueda distinguir sin inferencias entre software actual, limitaciones y diseño futuro.

## Alcance

### Incluye

- `AGENTS.md`, `README.md` y los documentos indicados por la tarea.
- Estado verificado a `2026-08-06` sobre el commit base `c1fcb83`.
- Registro de defectos de codigo fuera de alcance en `.ai/debug/`.
- Versionado de la revision externa y el brief de agente como material de referencia.

### No incluye

- Cambios en `services/`, `apps/`, `alembic/` o `tests/`.
- Implementar contratos, rutas, modelos, adapters, targets o pruebas que hoy falten.
- Modificar `apps/web/public/geoops-console.html`.

## Reutilizacion

Se conserva la arquitectura objetivo ya documentada, reclasificandola de forma explicita como `Previsto, no implementado` cuando no exista evidencia en el codigo.

## Diseno

Cada documento tendra una frontera visible entre estado actual y direccion futura. `docs/11-ESTADO-DEL-PROYECTO.md` seguira siendo la unica fuente del estado operativo; la revision y el brief son diagnostico y guia.

## Archivos probables

- `AGENTS.md`, `README.md`.
- `docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md`.
- `docs/04-ARQUITECTURA-BACKEND.md`.
- `docs/06-CONTRATOS-Y-APIS.md`.
- `docs/07-FUENTES-Y-ADAPTADORES.md`.
- `docs/09-INTERFAZ-Y-VISUALIZACION.md`.
- `docs/11-ESTADO-DEL-PROYECTO.md`.
- `docs/GEOOPS-REVISION-2.md`, `docs/GEOOPS-BRIEF-AGENTE.md`.
- `.ai/debug/GEO-FIX-006-HALLAZGOS-FUERA-DE-ALCANCE.md`.

## Dependencias

Ninguna dependencia nueva. No se modifica el Makefile: el contrato de agente se alinea con sus targets reales.

## Riesgos silenciosos

- Conservar una frase aspiracional en presente puede seguir induciendo implementaciones incorrectas.
- Confundir OpenAPI runtime con un contrato tipado y versionado.
- Confundir una URL aceptada por Vite con enrutado de cliente.
- Presentar el E2E mockeado como integracion real entre frontend y API.
- Duplicar el estado actual fuera de `docs/11` y volver a generar drift.

## Plan

1. Verificar cada afirmacion contra dependencias, estructura, modelos, migracion, endpoints, UI y Makefile.
2. Corregir solo las frases falsas y mover la intencion futura a bloques fechados.
3. Actualizar el contrato de agente y registrar defectos de codigo fuera de alcance.
4. Ejecutar busquedas de regresion, validaciones de documentacion y puertas completas.
5. Revisar el diff, publicar un PR draft y esperar aprobacion sin merge.

## Pruebas

- `git diff --check`.
- Inventario de targets mediante `make -qp`.
- Busquedas con `rg` de dependencias, paquetes, rutas, Protocols y capacidades futuras.
- `make lint`, `make typecheck`, `make test`, `make check`.

## Criterios de aceptacion

- [x] Cada afirmacion actual tiene evidencia en codigo o configuracion.
- [x] Cada capacidad futura esta marcada `Previsto, no implementado — 2026-08-06`.
- [x] `AGENTS.md` contiene las clausulas 1.7, 8.5 y 10.1.
- [x] Los comandos de `AGENTS.md` existen en el Makefile.
- [x] `docs/11` refleja `main@c1fcb83` y GEO-WF-002 a GEO-WF-006.
- [x] No se modifican codigo, migraciones, tests ni el HTML nuevo del usuario.
- [x] La suite completa termina correctamente.
- [ ] Existe un unico PR draft sin merge.

## Documentacion

- [x] README y documentos de arquitectura, contratos, fuentes, UI y estado corregidos.
- [x] Revision y brief identificados como material auxiliar, no fuente de estado.
- [x] Hallazgos fuera de alcance registrados en `.ai/debug/`.

## Validacion ejecutada

- `git diff --check` → sin errores.
- inventario `make -qp` → existen `lint`, `typecheck`, `test-unit`,
  `test-integration`, `test`, `build`, `e2e` y `check`; no existen los tres
  targets retirados del contrato.
- `make lint` → Ruff y ESLint correctos.
- `make typecheck` → mypy sin errores en 12 archivos y TypeScript correcto.
- `make test` → 14 pytest unitarios, 5 Vitest y 15 pytest de integracion pasan.
- `make check` → Compose valido, lint, typecheck, tests, builds y 2 E2E pasan.
- warnings vivos: chunk MapLibre de 1.053,44 kB y avisos
  `NO_COLOR`/`FORCE_COLOR` de Playwright.
