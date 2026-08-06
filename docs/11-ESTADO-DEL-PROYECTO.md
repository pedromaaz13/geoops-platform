# Estado del proyecto

**Fecha de verificación:** 2026-08-06.
**Commit verificado:** `main@c1fcb83`.

Este documento es la única fuente del estado real. Se actualiza al cerrar cada
hito, no al planificarlo. Los documentos de arquitectura conservan también
intención futura, marcada expresamente como no implementada.

## Repositorio

```text
Nombre: geoops-platform
Rama de producción: main
Producción desplegada: no
Primera vertical: wildfire-public
```

## Estado por bloque

| Bloque | Estado | Evidencia |
|---|---|---|
| GEO-001 Bootstrap | integrado en `main` | `Makefile`, `pyproject.toml`, `apps/web`, `services/api`, `services/ingestion`, Compose y CI |
| GEO-MVP-001 Wildfire end-to-end | integrado en `main` | migración `0001_mvp_core`, fixture wildfire, API `/v1`, consola y pruebas MVP |
| GEO-002 a GEO-010 | absorbidos por el MVP | modelos, persistencia, ingesta, normalización, reconciliación, API, shell, mapa/lista y ficha |
| GEO-UI-002 Paridad wildfire/UI | integrado, paridad parcial | PR #6; auditorías, consola map-first, source health, timeline, capas, lista y ficha |
| GEO-UI-003 Quality system pass | integrado | PR #6; CORS local, rail, tooltips, controles, estados de error y reglas visuales |
| GEO-WF-002 Invariantes wildfire | integrado | PR #7; pruebas de contrato y validaciones del feed |
| GEO-WF-003 Salida vacía sospechosa | integrado | PR #8; conserva estado válido y marca run fallido |
| GEO-WF-004 Source health stale real | integrado | PR #9; edades de descarga/dato, último éxito, TTL y razón stale |
| GEO-WF-005 Filtros wildfire | integrado | PR #11; `origins`, `sensors` y `min_confidence` en API y consola |
| GEO-WF-006 Reconciliación oficial/satélite | integrado | PR #11; ID upstream o tolerancia espacial dependiente de precisión dentro de seis horas |
| GEO-011 Capas | inicial | registry de eventos, incertidumbre, activos e impactos; no hay hotspots, perímetros, viento ni tráfico nativos |
| GEO-012 CI | operativo | GitHub Actions invoca `make check`, igual que local |

## Software implementado

- PostgreSQL/PostGIS en Docker Compose; FastAPI, CLI y Vite se ejecutan en host.
- Raw local inmutable en `var/raw`, observaciones, eventos y revisiones.
- Ingesta manual `wildfire-public` desde fixture o URL configurable y replay de raw.
- Eventos y activos con geometría `POINT`; impactos por proximidad.
- Reglas wildfire internas, alertas y transición a `acknowledged`.
- API para salud, eventos, timeline, fuentes, runs, activos, impactos, reglas y alertas.
- Consola React/MapLibre en una shell única con rail, drawers, lista, mapa y ficha.
- Source health con estados degradados y tiempos separados.

## Pruebas

Configurado y verificado en el ciclo hasta `c1fcb83`:

- pytest unitario para API, CLI e invariantes de ingesta;
- pytest de integración con PostGIS para readiness y vertical wildfire;
- Vitest + Testing Library para la consola;
- Playwright para interacción desktop/mobile con API interceptada;
- lint Ruff/ESLint, mypy/TypeScript, builds Python/frontend y Compose config;
- `make check` como puerta compartida por local y CI.

El E2E navegador-API real, sin `page.route`, no existe todavía y está definido
como `GEO-FIX-005`.

Warnings vivos conocidos:

- chunk de MapLibre superior al presupuesto recomendado por Vite;
- avisos `NO_COLOR`/`FORCE_COLOR` en Playwright;
- el primer `make check` posterior a PR #11 sufrió un timeout local del webserver;
  `make e2e` aislado y la repetición completa terminaron correctamente.

## Fuentes conectadas

- `wildfire-public`: fixture local y URL configurable. No descarga fuentes
  externas durante tests y no tiene scheduler.

AEMET, DGT, IGN, GDACS, Copernicus y demás fuentes permanecen previstas, no
conectadas.

## Limitaciones verificadas

- No existen autenticación, organizaciones, multiempresa, rutas ni casos.
- `Event.geometry` y `Asset.geometry` solo admiten `POINT`.
- No hay scheduler, notificaciones externas ni infraestructura productiva.
- Los endpoints no declaran `response_model`; OpenAPI runtime no constituye un
  contrato versionado y el frontend mantiene tipos manuales.
- `/v1/events` limita a 200 por página, pero declara el truncamiento
  (`meta.partial`, `meta.total_matched`), ordena por `(last_observed_at DESC, id)`
  con cursor keyset y rechaza params desconocidos con 400 (`GEO-FIX-001`, cerrado).
- El motor de alertas no aplica todavía cooldown material ni resolución
  automática; seguimiento en `GEO-FIX-002`.
- La reconciliación espacial actual calcula candidatos en Python y duplica
  coordenadas derivadas en `attributes`; seguimiento en `GEO-FIX-004`.
- El buscador no incorpora gazetteer IGN y la cobertura de pruebas sigue por
  debajo de `incendios_forestales_app`.
- El mapa depende de teselas externas y mantiene un fallback declarado.

Los detalles y evidencias de estos defectos están en
`docs/GEOOPS-REVISION-2.md` y, para esta corrección documental, en
`.ai/debug/GEO-FIX-006-HALLAZGOS-FUERA-DE-ALCANCE.md`.

## Previsto, no implementado

Registro canónico único de capacidades diseñadas pero **no** presentes en
`main@c1fcb83`. El resto de documentos marca lo aspiracional y **apunta aquí**; no
deben mantener su propia lista (ver `AGENTS.md §11`).

**Modelo de datos** (`services/api/geoops_api/models.py`):
- Entidades inexistentes: `Organization`, `Route`, `Case`, usuarios y multiempresa.
- `Source`: `owner`, `region`, `license`, `configuration_reference`.
- `SourceRun`: `payload_hash`, `raw_uri` (hoy el raw se localiza vía `RawPayload`).
- `Observation`: `time_precision`, `spatial_precision` (hoy solo `precision_m`).
- `Asset`: `organization_id`, `tags`, `valid_from`, `valid_to`, `attributes`.
- `Impact`: `expires_at`.
- `AlertRule`: `organization_id`, `event_types`, `asset_types`, `conditions`, `channels`.
- `Alert`: `sent_at`, `delivery_attempts`.
- `Event.geometry` y `Asset.geometry` solo admiten `POINT`.

**Pipeline** (`docs/03 §4`):
- Los `Protocol` `SourceAdapter`, `ObservationNormalizer`, `ObservationValidator`,
  `EventReconciler`, `Enricher`, `ImpactCalculator` son diseño; hoy el pipeline es
  funcional (`services/api/geoops_api/wildfire_ingest.py`).
- No se ejecuta capa de `Enricher` ni `ImpactCalculator`.

**Contratos y backend** (`docs/04`, `docs/06`; seguimiento en `GEO-FIX-003`):
- Endpoints sin `response_model`; OpenAPI runtime no es contrato versionado.
- Tipos TypeScript manuales; sin cliente generado desde OpenAPI.
- No existen capas `application/domain/infrastructure/interfaces` ni `/v1/stream` SSE.

**Frontend** (`docs/01`, `docs/09`):
- No hay React Router, Zustand ni deck.gl; `/operations` no es ruta de cliente.
- No existe `packages/` ni layer registry más allá del actual de la consola.

**Defectos y trabajo abierto con ficha:**
- Paginación/orden veraces de `/v1/events`: `GEO-FIX-001` (cerrado).
- Cooldown material y resolución de alertas: `GEO-FIX-002`.
- Contratos tipados y validación de entrada: `GEO-FIX-003` (cerrado).
- Reconciliación sobre PostGIS sin coords derivadas: `GEO-FIX-004`.
- E2E real sin mocks y `make test-contract`: `GEO-FIX-005`.
- Primera fuente real de incendios tras adaptador: `GEO-FIX-008`.
- UX de marcadores del mapa (hover/cursor/hit-area): `GEO-UI-005`.

**Fuentes** (`docs/07`): AEMET, DGT, IGN, GDACS, Copernicus y demás previstas, no
conectadas; sin scheduler ni notificaciones externas. Conectar la primera fuente real
está fichado en `GEO-FIX-008`.

## Bloqueos

No hay un bloqueo para ejecutar el MVP local. GeoOps no debe considerarse listo
para producción mientras permanezcan abiertos los defectos A de paginación,
alertas y contratos tipados descritos en la revisión.

## Último cambio comprobado

2026-08-06: `main@c1fcb83` integra PR #11 con filtros wildfire por origen,
sensor y confianza, y reconciliación oficial/satélite por tolerancia espacial y
ventana temporal. `GEO-FIX-006` corrige la documentación desde ese punto sin
implementar funcionalidad nueva.
