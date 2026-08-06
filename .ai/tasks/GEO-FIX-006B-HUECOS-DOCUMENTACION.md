# GEO-FIX-006b · Cerrar los huecos de documentación de GEO-FIX-006

Estado: implementado en `geo-fix-006b-huecos`; PR draft, sin merge.

## Pregunta que responde

¿Quedan documentos que sigan describiendo estructuras inexistentes tras GEO-FIX-006, y
existen las fichas de tarea que otros documentos ya referencian?

## Problema

GEO-FIX-006 dejó fuera `docs/03` y `docs/05`, los dos que más divergen del código, lo
que dejó la documentación contradictoria consigo misma (`docs/07` marca `SourceAdapter`
como previsto mientras `docs/03` lo presentaba como interfaz del pipeline). Además siete
documentos referencian `GEO-FIX-001..005` sin que existan las fichas, y no había lista
canónica de «previsto, no implementado» en `docs/11`.

## Evidencia

- `docs/03 §4` presentaba seis `Protocol` inexistentes (`docs/03:445-482`).
- `docs/05` describía `Route`, `Case`, `Asset.organization_id/tags`, `Observation.time_precision/spatial_precision` y otros campos ausentes de `services/api/geoops_api/models.py`.
- `.ai/tasks/` sin `GEO-FIX-001..005` pese a referencias en `docs/06`, `docs/11`, `README`, `AGENTS.md`.
- `docs/11` sin lista canónica de previstos (0 ocurrencias antes de esta tarea).

## Objetivo

Documentación coherente y honesta en `docs/03` y `docs/05`, fichas de tarea creadas y un
único registro canónico de capacidades previstas en `docs/11`.

## Alcance

### Incluye
- `docs/03 §4`: Protocols marcados como previstos + pipeline funcional real.
- `docs/05`: reconciliación completa campo a campo contra `models.py`.
- Fichas `.ai/tasks/GEO-FIX-001..005` desde `TEMPLATE.md` y `docs/GEOOPS-REVISION-2.md §7`.
- Registro canónico «Previsto, no implementado» en `docs/11`; punteros en `docs/04/06/07/09`.
- `.gitignore` para `apps/web/public/geoops-console.html` (commit separado).

### No incluye
- Cambios en `services/`, `apps/src/`, `alembic/` o `tests/`.
- Implementar contratos, modelos, adapters o targets pendientes.
- Limpieza de ramas `codex/*` (seguimiento posterior).

## Reutilización

Reaprovecha el patrón «estado actual vs previsto» de GEO-FIX-006 y la cabecera «Estado
MVP wildfire» ya presente en varios documentos.

## Diseño

`docs/11` como única fuente del estado; el resto marca en contexto y apunta allí. La
corrección de `docs/05` es campo a campo, sin inventar campos nuevos.

## Archivos probables

- `docs/03-PIPELINE-Y-TRANSFORMACIONES.md`, `docs/05-ONTOLOGIA-Y-MODELO-DATOS.md`.
- `docs/11-ESTADO-DEL-PROYECTO.md`, `docs/04`, `docs/06`, `docs/07`, `docs/09`.
- `.ai/tasks/GEO-FIX-001..005`, `.gitignore`.

## Dependencias

Ninguna nueva. No se modifica código ni el Makefile.

## Riesgos silenciosos

- Marcar como previsto un campo que sí existe: `Event.valid_from/valid_to` son reales
  (`models.py:90`); solo son inexistentes en `Asset`.
- Duplicar la lista de previstos fuera de `docs/11` y regenerar drift.

## Plan

1. `.gitignore` de la consola (commit separado).
2. `docs/03 §4`: Protocols → previsto + pipeline real de `wildfire_ingest.py`.
3. `docs/05`: reconciliación completa contra `models.py`.
4. Crear fichas `GEO-FIX-001..005`.
5. Registro canónico en `docs/11` + punteros en `docs/04/06/07/09`.
6. Validar y publicar PR draft sin merge.

## Pruebas

- `git diff --name-only main` sin ficheros de código.
- `make lint`, `make typecheck`, `make test`, `make check`.
- `grep` de coherencia `docs/03`↔`docs/07`.

## Criterios de aceptación

- [ ] `docs/03` y `docs/05` sin afirmaciones falsas sobre el modelo/pipeline.
- [ ] Cinco fichas `GEO-FIX-001..005` presentes y completas.
- [ ] `docs/11` con registro canónico de previstos y demás docs apuntando a él.
- [ ] `git check-ignore` cubre la consola local.
- [ ] Suite completa verde; sin código tocado.

## Documentación

- [ ] `docs/03`, `docs/05`, `docs/11` y punteros en `docs/04/06/07/09` actualizados.
