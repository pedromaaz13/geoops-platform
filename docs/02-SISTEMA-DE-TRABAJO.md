# Sistema de trabajo y herencia arquitectónica de GeoOps

Este documento explica **cómo se construye GeoOps**, no solo qué componentes tendrá.

GeoOps hereda dos activos de `incendios_forestales_app`:

1. Su arquitectura técnica: pipeline, fuentes, validaciones, publicación y frontend geoespacial.
2. Su método de ingeniería: tareas pequeñas, evidencia, fixtures, invariantes, documentación y control de errores silenciosos.

La segunda parte es tan importante como el código.

---

# 1. Qué hizo fuerte al proyecto de incendios

El visor no es únicamente un mapa. Su pieza principal es un pipeline que convierte fuentes heterogéneas y poco fiables en información publicable.

```text
fuente
  ↓
descarga aislada
  ↓
raw
  ↓
normalización
  ↓
limpieza
  ↓
reconciliación
  ↓
enriquecimiento
  ↓
validación
  ↓
exportación
  ↓
publicación segura
  ↓
interfaz
```

Además, el sistema aplica reglas de confianza:

- no inventar endpoints;
- no afirmar estados sin fuente;
- diferenciar edad del dato y edad del pipeline;
- no publicar salidas sospechosamente vacías;
- aislar fallos por fuente;
- conservar fixtures reales;
- bloquear publicación mediante invariantes;
- probar errores silenciosos;
- documentar por qué existe cada decisión.

GeoOps debe trasladar esa forma de trabajar a múltiples dominios.

---

# 2. Cómo evoluciona el pipeline en GeoOps

## 2.1 Pipeline del visor

```text
FIRMS y fuentes oficiales
  ↓
clean
  ↓
cluster
  ↓
merge
  ↓
contexto
  ↓
validate
  ↓
export
  ↓
publish
```

## 2.2 Pipeline genérico de GeoOps

```text
Source Adapter
  ↓
SourcePayload raw e inmutable
  ↓
Normalizer
  ↓
Observation
  ↓
Validation
  ↓
Event Reconciliation
  ↓
Event / EventRevision
  ↓
Enrichment
  ↓
Impact Calculation
  ↓
Rule Evaluation
  ↓
Alert / Case
  ↓
API + snapshots públicos
```

## 2.3 Correspondencia

| Incendios | GeoOps |
|---|---|
| hotspot | observation |
| incendio agrupado | event |
| parte oficial | official observation |
| fusión oficial–satélite | event reconciliation |
| contexto | enrichment |
| cercanía a activo | impact |
| invariantes | domain validation |
| sources.json | source health |
| manifest.json | dataset/run manifest |
| GeoJSON público | public snapshot |
| ficha de incendio | event detail |
| Mis activos | assets and exposure |

---

# 3. Qué se reutiliza

## 3.1 Comportamientos reutilizables

- Contrato base de adaptadores.
- Manejo aislado de fallos.
- Reintentos controlados.
- Fixtures de regresión.
- Separación de latencias.
- Salud de fuentes.
- Escritura atómica.
- Exportación GeoJSON y Parquet.
- Validación previa a publicación.
- Cálculos de distancia y rumbo.
- Carga diferida de capas.
- Diseño sobrio del mapa.
- Pruebas Python, Vitest y Playwright.
- Principio “nada se afirma sin quien lo afirme”.

## 3.2 Código que permanece en wildfire

- FIRMS.
- VIIRS/MODIS/MTG.
- FRP.
- Máscara industrial.
- Clustering de hotspots.
- Perímetros estimados.
- Estados de incendio.
- Reconciliación específica entre focos y partes.

## 3.3 Código que se reescribe

- UI manual basada en `innerHTML`.
- Orquestador global del frontend.
- Persistencia de activos solo en `localStorage`.
- Capas hardcodeadas.
- Contratos específicos de incendio.
- IDs temporales derivados únicamente de centroides.

---

# 4. Cómo nace una tarea

Una idea no se convierte directamente en código.

```text
idea
  ↓
pregunta de negocio
  ↓
evidencia
  ↓
alcance
  ↓
contrato
  ↓
criterio de aceptación
  ↓
tarea
  ↓
implementación
  ↓
validación
  ↓
documentación
```

## 4.1 Pregunta de negocio

Ejemplo incorrecto:

> Añadir DGT.

Ejemplo correcto:

> ¿Qué carreteras están cortadas ahora, dónde, por qué y qué eventos o activos pueden verse afectados?

## 4.2 Evidencia

Antes de diseñar:

- payload real;
- endpoint real;
- captura;
- documento oficial;
- comportamiento actual;
- test que reproduce el problema.

## 4.3 Alcance

```markdown
### Incluye

- importar cortes;
- conservar carretera, PK, sentido y vigencia;
- mostrarlos como eventos independientes.

### No incluye

- rutas de evacuación;
- cálculo de desvíos;
- recomendación operativa.
```

## 4.4 Contrato

Definir antes de implementar:

```text
Observation
Event
API response
campos obligatorios
campos nulos
vocabulario
geometría
tiempos
```

## 4.5 Criterio de aceptación

Debe poder probarse.

```text
Dado un payload DATEX con un corte,
cuando se ejecuta la ingesta,
entonces se crea una Observation,
se crea o actualiza un Event road_closure,
la API lo devuelve por bbox
y la interfaz muestra carretera, PK, causa, vigencia y fuente.
```

---

# 5. Plantilla de tarea

```markdown
# GEO-XXX · Título

## Pregunta que responde

¿Qué necesita saber o hacer el usuario?

## Problema actual

Qué falta o funciona mal.

## Evidencia

Payload, código, captura, fuente o test.

## Objetivo

Resultado observable.

## Alcance

### Incluye

- ...

### No incluye

- ...

## Reutilización

- código;
- patrón;
- pruebas;
- documentación de origen.

## Diseño

Contratos, flujo y decisiones.

## Archivos probables

- ...

## Dependencias

- ...

## Riesgos y errores silenciosos

- ...

## Plan

1. ...
2. ...
3. ...

## Pruebas

- unitaria;
- contrato;
- integración;
- E2E;
- visual.

## Criterios de aceptación

- [ ] ...
- [ ] ...

## Documentación

- [ ] ADR
- [ ] source doc
- [ ] estado
- [ ] errores y soluciones
```

---

# 6. Cómo descomponer un bloque grande

Ejemplo: “crear sistema de alertas”.

Incorrecto como una sola tarea.

Descomposición:

```text
GEO-201 · Modelo AlertRule
GEO-202 · Evaluación por proximidad
GEO-203 · Cooldown y deduplicación
GEO-204 · Modelo Alert
GEO-205 · Canal email
GEO-206 · Reintentos y estados
GEO-207 · Bandeja de alertas
GEO-208 · Acuse
GEO-209 · Auditoría
GEO-210 · Métricas
```

Cada tarea entrega una capacidad verificable.

---

# 7. Proceso de desarrollo

## 7.1 Descubrimiento

- leer tarea;
- localizar punto de entrada;
- inspeccionar tests;
- revisar contratos;
- verificar versión de librerías;
- obtener payload real.

## 7.2 Diseño mínimo

- decidir objetos afectados;
- definir entradas y salidas;
- identificar migraciones;
- enumerar casos límite;
- escribir plan.

## 7.3 Prueba que falla

Cuando se corrige un bug o parser:

1. crear fixture;
2. escribir prueba;
3. comprobar que falla;
4. implementar;
5. comprobar que pasa.

## 7.4 Implementación

- mínimo cambio;
- sin refactors laterales;
- sin infraestructura futura;
- sin nuevas dependencias salvo justificación.

## 7.5 Validación progresiva

```text
prueba específica
  ↓
módulo
  ↓
contrato
  ↓
suite
  ↓
build
  ↓
E2E
  ↓
evidencia visual
```

## 7.6 Documentación

Actualizar solo la fuente de verdad correspondiente.

## 7.7 Handoff

Cuando la tarea no termina o cambia de sesión:

```markdown
# Handoff

## Objetivo

## Estado actual

## Cambios realizados

## Validación

## Bloqueos

## Próximo paso exacto

## Archivos relevantes

## Decisiones que no deben reabrirse
```

---

# 8. Modelo documental

## 8.1 Documentos permanentes

```text
AGENTS.md
README.md
docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md
docs/ARQUITECTURA.md
docs/ONTOLOGIA.md
docs/API.md
docs/11-ESTADO-DEL-PROYECTO.md
docs/10-ROADMAP-M0.md
docs/12-ERRORES-Y-SOLUCIONES.md
docs/sources/
docs/contracts/
docs/adr/
```

## 8.2 Documentos temporales

```text
.ai/tasks/
.ai/handoffs/
.ai/debug/
```

## 8.3 Regla de fuente única

- El estado real vive solo en `11-ESTADO-DEL-PROYECTO.md`.
- El futuro vive solo en `10-ROADMAP-M0.md` y `13-PLAN-MVP-RAPIDO.md`.
- Una decisión vive solo en su ADR.
- El contrato vive en `contracts/`.
- Un error relevante vive en `12-ERRORES-Y-SOLUCIONES.md`.
- Una tarea temporal no se convierte en documentación permanente por accidente.

---

# 9. ADR

Una decisión arquitectónica no debe quedar escondida en un chat o comentario.

Plantilla:

```markdown
# ADR-XXX · Título

## Estado

Propuesto | Aceptado | Sustituido

## Contexto

Qué problema obliga a decidir.

## Decisión

Qué se elige.

## Alternativas

Qué se descartó.

## Consecuencias

Ventajas, costes y restricciones.

## Evidencia

Pruebas, medidas o referencias.
```

ADR iniciales:

- repositorios separados;
- React en GeoOps;
- PostGIS operacional;
- snapshots públicos en CDN;
- MapLibre base y deck.gl analítico;
- Kepler.gl aislado;
- observaciones inmutables;
- SSE antes que WebSockets.

---

# 10. Documentar errores

`12-ERRORES-Y-SOLUCIONES.md` no es una lista de stack traces.

Cada entrada debe explicar:

```markdown
## Síntoma

Qué veía el usuario o pipeline.

## Por qué era silencioso

Por qué no fallaba claramente.

## Causa

Causa técnica.

## Solución

Cambio realizado.

## Prueba de regresión

Qué test impide que vuelva.

## Regla general

Qué aprendemos para futuras tareas.
```

Ejemplos heredados del visor:

- un endpoint vacío no equivale a cero incendios;
- una coordenada vacía puede convertirse en `(0, 0)`;
- una variable CSS inexistente se descarta sin error;
- una capa MapLibre puede no montarse y no lanzar una excepción visible;
- un test E2E puede ejecutarse contra un build viejo;
- un pipeline reciente puede mostrar observaciones antiguas.

---

# 11. Cómo piensa el sistema sin depender de un chat largo

El repositorio debe contener suficiente contexto para retomar una tarea sin reconstruir toda la conversación.

Orden de lectura:

| Pregunta | Documento |
|---|---|
| ¿Qué reglas debo respetar? | `AGENTS.md` |
| ¿Qué producto construimos? | `docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md` |
| ¿Cómo está montado? | `docs/ARQUITECTURA.md` |
| ¿Qué existe hoy? | `docs/11-ESTADO-DEL-PROYECTO.md` |
| ¿Qué toca después? | `docs/10-ROADMAP-M0.md` y `docs/13-PLAN-MVP-RAPIDO.md` |
| ¿Por qué se decidió así? | `docs/adr/` |
| ¿Qué falló antes? | `docs/12-ERRORES-Y-SOLUCIONES.md` |
| ¿Cómo funciona una fuente? | `docs/sources/` |
| ¿Qué estaba haciendo la sesión anterior? | `.ai/handoffs/` |

La IA no debe precargar todo. Debe recuperar solo lo necesario para la tarea.

---

# 12. Ejemplo completo: importar incendios

## Pregunta

¿Qué incendios publicados por el visor existen ahora y qué evidencia respalda cada uno?

## Fuente

```text
manifest.json
incidents.geojson
sources.json
```

## Flujo

```text
fetch manifest
  ↓
validar schema_version
  ↓
fetch incidents
  ↓
guardar raw
  ↓
normalizar Observation
  ↓
persistir idempotentemente
  ↓
crear/actualizar Event
  ↓
crear EventRevision si cambia
  ↓
publicar por API
```

## Errores silenciosos

- manifest nuevo con incidentes viejos;
- caída brusca de registros;
- IDs duplicados;
- geometría inválida;
- fecha futura;
- estado sin procedencia;
- misma observación insertada dos veces;
- cambio de ID upstream.

## Pruebas

- fixture válido;
- manifest incompatible;
- colección vacía sospechosa;
- duplicado;
- estado sin fuente;
- segunda ejecución idempotente;
- revisión por cambio;
- bbox API;
- ficha UI con dos latencias.

## Documentación

- source doc;
- contrato wildfire;
- ADR de integración entre repos;
- estado del proyecto;
- error y solución cuando aparezca un caso real.

---

# 13. Definition of Done general

Una tarea no está terminada solo porque el código compile.

```text
[ ] Pregunta de negocio respondida.
[ ] Alcance respetado.
[ ] Contrato definido.
[ ] Reutilización documentada.
[ ] Código implementado.
[ ] Prueba específica.
[ ] Suite relevante.
[ ] Build.
[ ] E2E cuando proceda.
[ ] Evidencia visual cuando proceda.
[ ] Documentación actualizada.
[ ] Riesgos vivos declarados.
[ ] Handoff si queda trabajo.
```

---

# 14. Diferencia entre roadmap y sistema de trabajo

El roadmap responde:

> ¿Qué construimos y en qué orden?

Este documento responde:

> ¿Cómo convertimos cada bloque en cambios pequeños, seguros, comprobables y documentados?

Ambos son necesarios.

El pipeline de incendios es el activo técnico más grande del proyecto actual.

El sistema de trabajo es el activo que permitirá construir uno todavía mayor sin perder control.
