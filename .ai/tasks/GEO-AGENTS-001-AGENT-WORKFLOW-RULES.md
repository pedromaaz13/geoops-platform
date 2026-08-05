# GEO-AGENTS-001 · Reglas de agente para UI, datos y pipeline

## Pregunta que responde
Como evitamos que GeoOps vuelva a declarar lista una UI que no se ha probado con datos, navegador, estados degradados y evidencias reales?

## Problema
El contrato actual heredaba principios de `incendios_forestales_app`, pero no obligaba a probar UI operacional con matriz de datos, capturas y navegador real.

## Evidencia
- Capturas recientes muestran paneles que tapan mapa, KPIs comprimidos, autoseleccion de evento y mapa poco legible.
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md` ya detecta riesgo de API equivocada en puerto `8000`.
- `../incendios_forestales_app/AGENTS.md` exige evidencia de comandos y no inventar endpoints.

## Objetivo
Endurecer `AGENTS.md` para que cada tarea de UI/pipeline tenga reglas verificables y no dependa de impresiones subjetivas.

## Alcance
### Incluye
- Router de lectura por tipo de pregunta.
- Protocolo UI/data QA.
- Evidencia visual obligatoria.
- Cierre con comandos y riesgos vivos.

### No incluye
- Cambios funcionales de backend.
- Nuevas fuentes externas.
- Merge a `main`.

## Reutilización
Se reutilizan criterios de `../incendios_forestales_app/AGENTS.md` y `../incendios_forestales_app/CLAUDE.md`, adaptados a GeoOps multievento.

## Diseño
Las reglas permanentes viven en `AGENTS.md`; los hallazgos y estado real viven en `docs/`.

## Archivos probables
- `AGENTS.md`
- `.ai/tasks/GEO-AGENTS-001-AGENT-WORKFLOW-RULES.md`

## Dependencias
Ninguna nueva.

## Riesgos silenciosos
- Convertir reglas en texto decorativo sin tests.
- Duplicar estado entre `AGENTS.md` y `docs/`.

## Plan
1. Comparar reglas existentes con el visor.
2. Añadir router de lectura.
3. Añadir protocolo UI/data QA.
4. Dejar claro que no hay merge sin validacion.

## Pruebas
- Revisión documental.
- Validación posterior de la tarea UI usando estas reglas.

## Criterios de aceptación
- [x] `AGENTS.md` incluye router de lectura.
- [x] `AGENTS.md` obliga a probar UI con datos, errores y capturas.
- [x] `AGENTS.md` distingue API incorrecta, CORS, filtros y datos ausentes.

## Documentación
- [x] `AGENTS.md`

