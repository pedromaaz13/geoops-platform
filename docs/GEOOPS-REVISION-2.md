# GeoOps · Revisión profunda 2

> **Naturaleza del documento:** diagnóstico externo sobre `main@c1fcb83`,
> incorporado el 2026-08-06. No es la fuente del estado vigente ni implica que
> sus propuestas estén implementadas. Consulta `11-ESTADO-DEL-PROYECTO.md`.

Repositorio: `pedromaaz13/geoops-platform`
Commit revisado: **`c1fcb83`** · 34 commits · ramas remotas: 9, todas fusionadas o
anteriores a `main`.

**No hay commits nuevos desde la revisión anterior.** `main` está en el mismo
punto y ninguna rama remota tiene trabajo por delante. Esta revisión no repite la
anterior: entra en lo que no había auditado todavía —frontend, motor de alertas,
reconciliación, suite de pruebas, coherencia entre documentación y código, y
verificación campo a campo de los endpoints.

Severidades: **A** rompe el producto o miente al usuario · **B** deuda que se
multiplica con cada fuente o cliente · **C** limpieza.

---

## 1. Verificación de endpoints · contrato real vs lo que se declara

Comprobado leyendo `main.py`, `operations.py`, `apps/web/src/api.ts`,
`apps/web/src/types.ts`, los mocks de Playwright y `docs/06-CONTRATOS-Y-APIS.md`.

| Endpoint | Verificado | Hallazgo |
|---|---|---|
| `GET /health` | ✅ | Devuelve `service`, `environment`. Coincide con el preflight del Makefile. |
| `GET /ready` | ✅ | Comprueba PostGIS de verdad. |
| `GET /v1/events` | ⚠️ **A** | Los parámetros públicos son `from` y `to` (alias de `from_time`/`to_time`). Cualquier cliente que use el nombre interno recibe un filtro **silenciosamente ignorado**, no un 400. |
| `GET /v1/events` | ⚠️ **A** | `MAX_LIMIT = 200` y el frontend pide `limit=200` sin usar `next_cursor`. A partir de 200 eventos el mapa muestra un subconjunto **y `meta.partial` sigue diciendo `false`**. |
| `GET /v1/events` | ⚠️ **A** | `ORDER BY Event.id` sobre UUID: el subconjunto truncado es aleatorio, no el más reciente ni el más grave. |
| `GET /v1/events` | ⚠️ **B** | `bbox` fijo en el front (`-19,27,5,44.5`). El mapa nunca consulta por viewport. |
| `GET /v1/operations/summary` | ⚠️ **B** | Llama a `_event_feature()` por cada evento sólo para contar `sources`: eso ejecuta `ST_AsGeoJSON` + un JOIN **por evento**. Con miles de eventos el endpoint de cabecera es el más caro de la API. |
| `GET /v1/operations/summary` | ⚠️ **C** | Invoca `list_source_health()` internamente y el front además lo pide aparte: trabajo duplicado en cada carga. |
| `GET /v1/sources/health` | ✅ | Campos coherentes con el mock de e2e (`freshness_status`, `data_age_seconds`, `download_age_seconds`, `last_run`). |
| `GET /v1/events/{id}` | ✅ | Añade `observations_count`, `revisions_count`, `impacts_count` sobre el Feature. |
| `GET /v1/events/{id}/impacts` | ⚠️ **B** | Devuelve `reasons` en castellano generado en backend. Texto de UI dentro de la capa de datos: no es traducible ni testeable por contrato. |
| `POST /v1/assets` | ⚠️ **A** | Lee `await request.json()` sin validación. Un `latitude` string no numérico revienta con `ValueError` → 400 genérico sin decir qué campo. Además dispara `recalculate_impacts()` + `evaluate_alerts()` **dentro de la petición**. |
| `POST /v1/alert-rules` | ⚠️ **A** | Igual: sin schema. `asset_id` inexistente no se valida contra la tabla; falla por FK en commit. |
| `DELETE /v1/assets/{id}` | ⚠️ **B** | No recalcula ni cierra impactos ni alertas huérfanas del activo borrado. |
| `POST /v1/alerts/{id}/acknowledge` | ⚠️ **B** | No hay endpoint para resolver ni reabrir. `resolved_at` existe en el modelo y no lo escribe nadie. |
| Todos | ⚠️ **A** | Ningún endpoint declara `response_model`. `/openapi.json` no tiene esquemas: no hay contrato verificable ni cliente generable. |

> Corregido también en la consola que te pasé: usaba `from_time`/`to_time`. Ahora
> usa `from`/`to`, que son los nombres reales.

---

## 2. Motor de alertas · lo más grave del backend

**A · `cooldown_minutes` no se usa.** Está en el modelo, en la migración, en el
payload de creación y en la UI. `evaluate_alerts()` no lo lee en ningún sitio.

**A · La clave de deduplicación incluye el número de revisión.**

```python
dedup = f"{rule.id}:{event.id}:{asset.id}:{revision}"
```

Cada revisión del evento genera una alerta nueva. Un incendio activo que recibe
40 actualizaciones en una noche produce **40 alertas** para el mismo activo y la
misma regla. Con entrega por SMS o WhatsApp esto es una factura y una baja de
cliente. El cooldown existía precisamente para evitarlo y está muerto.

**A · Las alertas no se cierran nunca.** No hay transición a `resolved`. Cuando
el incendio se extingue o el activo deja de estar en el radio, la alerta sigue
abierta. `open_alerts` en el resumen crece de forma monótona.

**B · Sin severidad ni prioridad.** Todas las alertas son iguales. Un foco de
confianza 0,41 a 4.900 m dispara lo mismo que un incendio oficial confirmado a
800 m.

**B · Evaluación completa en cada mutación.** `POST /v1/assets` recorre todas las
reglas y todos los impactos de forma síncrona dentro del request.

---

## 3. Reconciliación

**A · La geometría está duplicada en JSONB.** `_find_event()` compara distancias
con `attributes["geometry_coordinates"]` y una haversine en Python, teniendo la
geometría en PostGIS con índice GiST al lado:

```python
existing_coords = _event_coordinates(event)   # lee event.attributes
_distance_m(existing_coords, incoming_coords) # haversine en Python
```

Esto contradice de forma directa `AGENTS.md §7`: *«No usar JSONB para evitar
modelar campos críticos»*. Y crea dos fuentes de verdad para la posición que
pueden divergir en cualquier `UPDATE` que toque una y no la otra.

**A · `SELECT` sin filtro sobre todos los eventos wildfire, por cada feature
entrante.** Ingesta O(N·M). Con 3.000 eventos y un feed de 500 focos son 1,5
millones de comparaciones en Python por ejecución.

**B · La ventana temporal y la tolerancia son constantes de módulo**
(`RECONCILIATION_TIME_WINDOW_HOURS`, `RECONCILIATION_MIN_DISTANCE_M`), no
configuración por tipo de evento. Para AEMET, DGT o sismos los valores correctos
son completamente distintos.

**B · La estrategia es wildfire pero vive en el núcleo.** Cuando entre la
segunda fuente, `_origins_match_for_reconciliation` (que habla de `satelite` y
`oficial`) se aplicará a avisos meteorológicos.

---

## 4. Pruebas · el punto ciego serio

**A · El frontend no se prueba nunca contra la API real.** Los 220 test de
Playwright y los 187 de Vitest interceptan el 100% de las llamadas:

```ts
await page.route('**/v1/events?**', route => route.fulfill({ json: {...} }));
```

Los mocks son literales escritos a mano. Si el backend cambia un nombre de campo,
`make check` sigue **verde** y la consola real se rompe. Es exactamente el fallo
que `AGENTS.md §8.4` («datos antes que pixels») pretende evitar, y no hay ningún
test que lo cubra.

**B · Sin umbral de cobertura.** `incendios` fuerza 85% en `pyproject.toml`;
GeoOps no tiene `--cov` en ningún sitio. 734 líneas de test contra 2.168 de
backend.

**B · `GEOOPS_TEST_DATABASE_URL` apunta por defecto a la base de desarrollo.**
En `.env.example` los dos valores son idénticos (`geoops_dev`). Correr
`make test-integration` después de `make demo` mezcla datos de test con los de
demo en la misma base.

**B · `make check` no ejecuta `make demo`.** El pipeline completo (ingesta →
reconciliación → API → UI) nunca se valida de punta a punta en CI, mientras que
en `incendios` sí (`build_demo_data.py` + `smoke_test.py`).

**C · `AGENTS.md §10` promete targets que no existen:** `make test-api`,
`make test-ingestion`, `make test-contract`. Un agente que siga el contrato al
pie de la letra ejecuta comandos inexistentes y no sabe si falló él o el repo.

---

## 5. Frontend

**A · `apps/web/src/app/App.tsx` tiene 1.337 líneas** con 13 `useState` y toda
la consola dentro: KPIs, rail, lista, ficha, mapa, panel de fuentes, formularios
de activo y de regla, ajustes. `styles.css` son otras 1.358 líneas sin capas.
Esto no es una consola de producto, es una pantalla.

**A · No hay router.** `package.json` no incluye `react-router`, pero el README
dice *«navega a `/operations`»* y `docs/01` lista React Router en el stack. La
ruta no existe: el estado se guarda con `history.replaceState` sobre query
params. Documentación que describe software que no está.

**B · Un solo `App.tsx` importado dos veces.** `src/App.tsx` es un re-export de
`src/app/App.tsx`, y `App.test.tsx` importa del primero mientras `main.tsx` usa
el segundo. Confuso sin ganancia.

**B · Sin virtualización ni paginación en la lista de eventos.** Con `limit=200`
se renderizan 200 tarjetas en el DOM. Con eventos reales de agosto en España se
nota.

**C · Lo que sí está bien y hay que conservar:** `friendlyLoadError()` traduce
`Failed to fetch` a causa accionable (CORS, API caída, base vacía), hay 49
atributos ARIA, hay fallback de mapa declarado cuando las teselas no cargan, y
los registries (`registries/events.ts`, `registries/layers.ts`) son el patrón
correcto para multi-riesgo. Eso cumple `AGENTS.md §8` mejor que muchos productos
comerciales. No lo toques en la refactorización.

---

## 6. Documentación vs código

| Documento dice | Código tiene |
|---|---|
| `docs/07`: `SourceAdapter` y `ObservationNormalizer` como Protocol | Un `wildfire_ingest.py` de 738 líneas dentro de la API |
| `docs/01`: React Router, Zustand, deck.gl | Ninguno instalado |
| `docs/01`: `packages/contracts-python`, `contracts-ts`, `geo-python`, `ui` | La carpeta `packages/` no existe |
| `README`: «navega a `/operations`» | No hay rutas |
| `AGENTS.md §10`: `make test-api`, `test-ingestion`, `test-contract` | No existen esos targets |
| `docs/01`: `Organization`, `Route`, `Case` en M1/M2 | Ninguno en el esquema |

No es un problema estético: `AGENTS.md §2.1` obliga al agente a leer esos
documentos como **fuente de verdad**. Un agente que los lea va a construir sobre
cosas que no existen y va a asumir capacidades que el repo no tiene. Esto es hoy
el mayor riesgo de que el trabajo con agentes se descarrile.

---

## 7. Tareas nuevas · corrección antes de avanzar

Estas van **antes** que la Fase 0 del plan anterior, porque son defectos, no
evolución. Salvo GEO-FIX-004, ninguna toca la migración.

### GEO-FIX-001 · Verdad en el listado de eventos (A)
- `meta.partial = true` cuando se trunca por `limit`, y `meta.total_matched`.
- Orden estable por `(last_observed_at DESC, id)` en vez de `id`.
- Cursor sobre esa clave compuesta, no sobre `id`.
- El front consume `next_cursor` y muestra «mostrando N de M» cuando hay más.
- Rechazar con 400 los parámetros desconocidos en vez de ignorarlos.
- Test: 250 eventos → dos páginas, `partial=true` en la primera, sin duplicados.

### GEO-FIX-002 · Motor de alertas honesto (A)
- Aplicar `cooldown_minutes`: la clave de dedup deja de incluir la revisión y
  pasa a ser `(rule_id, event_id, asset_id)` + ventana de cooldown.
- Sólo re-alertar si el cambio es **material**: cruce de umbral, subida de
  severidad o de estado, no cualquier revisión.
- Transición a `resolved` cuando el evento deja de cumplir la regla, con
  `resolved_at` y motivo.
- Test: 40 revisiones seguidas → 1 alerta. Cruce de umbral → 2ª alerta.

### GEO-FIX-003 · Contratos tipados y validación de entrada (A)
- `response_model` en los 17 endpoints, modelos de request en los 2 POST.
- Errores de validación con el campo concreto, no `INVALID_REQUEST` genérico.
- `openapi.json` commiteado y comparado en CI.
- (Es la GEO-CORE-004 del plan anterior, adelantada por lo que se ha visto.)

### GEO-FIX-004 · Reconciliación sobre PostGIS (A)
- Eliminar `attributes["geometry_coordinates"]` y `_distance_m`.
- Candidatos por `ST_DWithin` sobre el índice GiST, filtrando ventana temporal en
  SQL, no en Python.
- Parámetros de reconciliación por `event_type`, en tabla o configuración.
- Test de no regresión con los casos actuales del fixture.

### GEO-FIX-005 · Un test de integración real front↔back (A)
- Un único E2E sin `page.route`: `make demo` levanta datos reales, la API real
  responde, Playwright verifica que la consola muestra el evento del fixture.
- Es un test lento y basta con uno. Es el que habría detectado cualquier drift.
- Añadirlo a `make check` en un target `test-contract` (que además hay que crear,
  porque `AGENTS.md` ya lo promete).

### GEO-FIX-006 · Documentación que no miente (B)
- `docs/01` y README describen lo que hay, con una sección explícita
  «previsto, no implementado».
- `docs/07` deja de describir Protocols inexistentes o se implementan (CORE-002).
- Targets del Makefile alineados con `AGENTS.md §10`.

### GEO-FIX-007 · Trocear la consola (B)
- `App.tsx` → `features/{events,sources,assets,alerts,map}` con un contenedor
  fino. Objetivo: ningún archivo por encima de ~250 líneas.
- Instalar router de verdad o quitar `/operations` de los documentos.
- CSS por feature o tokens + módulos.
- Conservar intactos `friendlyLoadError`, el fallback de mapa y los registries.

**Orden sugerido:** 003 → 001 → 002 → 005 → 004 → 006 → 007.
Después, la Fase 0 del plan anterior (geometría genérica + `Organization`).

---

## 8. Lo que sigue estando bien

No todo es corrección. Esto es mejor que la media del sector y no hay que tocarlo:

- La ontología y su persistencia, con procedencia por campo y revisiones.
- Los invariantes de feed vacío sospechoso (`_reject_suspicious_empty_feed`).
- Los estados de run y `source health` con antigüedad declarada vs medida.
- El raw inmutable con `content_hash` y el `replay` desde raw.
- `AGENTS.md` como contrato de ingeniería: es el activo más valioso del repo.
- La traducción de errores de red a causas accionables en la UI.
