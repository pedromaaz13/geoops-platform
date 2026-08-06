# GEO-FIX-003 · Contratos tipados y validación de entrada

Estado: **implementado** en `geo-fix-003-contratos-tipados` (PR draft). Fuente de
diseño: `docs/GEOOPS-REVISION-2.md §7`. Es la GEO-CORE-004 del plan anterior,
adelantada. Desbloquea cliente TS generado, `/docs` útil y detección de drift en CI.

Evidencia de cierre: `services/api/geoops_api/schemas.py` (modelos), `response_model`
en todas las rutas de `main.py`, `openapi.json` versionado, `make openapi-check`,
`apps/web/src/api-types.ts` generado, `tests/api/test_contracts.py`.

## Pregunta que responde

¿Declaran los endpoints un contrato tipado y versionado, y validan la entrada devolviendo
el campo concreto que falla?

## Problema

Ningún endpoint declara `response_model`; OpenAPI en runtime no es un contrato
versionado, el front mantiene tipos a mano y los errores de validación son genéricos.

## Evidencia

- Cero `response_model` en todo el paquete: `services/api/geoops_api/*.py` (0 ocurrencias).
- Tipos TS manuales: `apps/web/src/types.ts:1`.
- `make test-contract` prometido en `AGENTS.md` pero inexistente en el `Makefile`.

## Objetivo

Contrato tipado en todos los endpoints, `openapi.json` commiteado y comparado en CI, y
errores de validación accionables.

## Alcance

### Incluye
- `response_model` en los 17 endpoints; modelos de request en los 2 POST.
- Errores de validación con el campo concreto, no `INVALID_REQUEST` genérico.
- `openapi.json` commiteado y comparado en CI.

### No incluye
- Generar el cliente TS (paso posterior, habilitado por este).

## Reutilización

Reaprovecha los serializadores actuales de `operations.py`; se formalizan como modelos
Pydantic de respuesta.

## Diseño

Modelos Pydantic de request/response; export de `openapi.json` en build; diff en CI que
falle ante drift.

## Archivos probables

- `services/api/geoops_api/main.py` (declaración de `response_model`)
- `services/api/geoops_api/operations.py` (formas de respuesta)
- `Makefile` (target de contrato), workflow de CI

## Dependencias

Ninguna nueva. Habilita el cliente TS y `/docs`; conviene antes de GEO-FIX-001/002 para
tipar sus respuestas.

## Riesgos silenciosos

- Modelos que no reflejen exactamente el GeoJSON Feature real y rompan el front.
- `openapi.json` que se desincronice si no se compara en CI.

## Plan

1. Definir modelos de request/response.
2. Declarar `response_model` en los 17 endpoints.
3. Errores de validación con campo concreto.
4. Commitear `openapi.json` y compararlo en CI.

## Pruebas

Snapshot de `openapi.json` en CI; test de 400 con el campo concreto por endpoint.

## Criterios de aceptación

- [ ] 17 endpoints con `response_model`; 2 POST con modelo de request.
- [ ] Errores de validación con campo concreto.
- [ ] `openapi.json` commiteado y comparado en CI.

## Documentación

- [ ] `docs/06-CONTRATOS-Y-APIS.md` deja de describir tipos manuales.
