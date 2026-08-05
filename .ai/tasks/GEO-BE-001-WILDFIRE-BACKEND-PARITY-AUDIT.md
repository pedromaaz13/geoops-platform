# GEO-BE-001 · Auditoria backend/pipeline contra visor wildfire

## Pregunta que responde
Que parte del pipeline, backend, validaciones y tests del visor de incendios falta todavia en GeoOps?

## Problema
GeoOps tiene un MVP de ingesta wildfire, pero no esta demostrado que iguale al visor original en reglas de verificacion, filtros, invariantes y endpoints.

## Evidencia
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md` declara paridad incompleta.
- El usuario pide recuperar pipeline, backend, logicas, reglas de verificacion, endpoints y prioridades del repo origen.

## Objetivo
Generar una auditoria accionable, de solo lectura, que separe lo ya portado, lo reusable y lo wildfire-specific.

## Alcance
### Incluye
- Inspeccion selectiva de `../incendios_forestales_app`.
- Matriz de capacidades backend/pipeline/tests.
- Propuesta de tareas siguientes.

### No incluye
- Portar codigo en esta tarea.
- Cambiar el repo origen.
- Crear fuentes reales nuevas.

## Reutilización
Se inspeccionan patrones del visor y se documenta commit/rutas de origen.

## Diseño
La auditoria permanente vive en `docs/audits/`.

## Archivos probables
- `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
- `docs/14-VALIDACION-INCIDENCIA-Y-PROXIMOS-PASOS.md`

## Dependencias
Ninguna nueva.

## Riesgos silenciosos
- Copiar dominio wildfire dentro de GeoOps sin adaptarlo.
- Confundir paridad UI con paridad de pipeline.

## Plan
1. Comprobar estado del repo origen.
2. Leer rutas concretas de fuentes, merge, export, tests y CI.
3. Comparar contra GeoOps.
4. Generar matriz y tareas recomendadas.
5. Comprobar que el repo origen no cambio.

## Pruebas
- `git -C ../incendios_forestales_app status --short` antes y despues.

## Criterios de aceptación
- [x] Auditoria con commit origen.
- [x] Matriz de capacidades.
- [x] Tareas siguientes priorizadas.
- [x] Repo origen intacto salvo `.DS_Store` preexistente.

## Documentación
- [x] `docs/audits/WILDFIRE-BACKEND-PIPELINE-PARITY-AUDIT.md`
