# Lee esto primero

Este fichero es el router documental de GeoOps. No es necesario leer todos los
documentos en cada sesión.

| Pregunta | Documento |
|---|---|
| ¿Qué producto y arquitectura inicial construimos? | `01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md` |
| ¿Cómo se convierte una idea en una tarea segura? | `02-SISTEMA-DE-TRABAJO.md` |
| ¿Cómo funciona el pipeline y qué heredamos del visor? | `03-PIPELINE-Y-TRANSFORMACIONES.md` |
| ¿Cómo debe montarse el backend? | `04-ARQUITECTURA-BACKEND.md` |
| ¿Qué objetos y relaciones existen? | `05-ONTOLOGIA-Y-MODELO-DATOS.md` |
| ¿Qué contratos y endpoints exponemos? | `06-CONTRATOS-Y-APIS.md` |
| ¿Cómo se conecta una fuente nueva? | `07-FUENTES-Y-ADAPTADORES.md` |
| ¿Qué pruebas, invariantes y observabilidad son obligatorios? | `08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md` |
| ¿Cómo será la interfaz y qué hace cada tecnología visual? | `09-INTERFAZ-Y-VISUALIZACION.md` |
| ¿Qué construimos primero y en qué orden? | `10-ROADMAP-M0.md` |
| ¿Qué funciona realmente hoy? | `11-ESTADO-DEL-PROYECTO.md` |
| ¿Qué errores relevantes ya conocemos? | `12-ERRORES-Y-SOLUCIONES.md` |
| ¿Cuál es el corte vertical recomendado después del bootstrap? | `13-PLAN-MVP-RAPIDO.md` |
| ¿Por qué se tomó una decisión? | `adr/` |
| ¿Cómo funciona una fuente? | `sources/` |
| ¿Cuál es el contrato de un recurso? | `contracts/` |
| ¿Qué estaba haciendo otra sesión? | `.ai/handoffs/` |

## Reglas

- `AGENTS.md` se lee siempre.
- `11-ESTADO-DEL-PROYECTO.md` es la única fuente del estado real.
- `10-ROADMAP-M0.md` y `13-PLAN-MVP-RAPIDO.md` describen futuro, no deben afirmar que algo ya existe.
- Una decisión arquitectónica permanente va a un ADR.
- Los documentos temporales viven en `.ai/`.
- No se duplica el mismo dato en varios documentos.
