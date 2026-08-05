# AGENTS.md · Contrato de ingeniería de GeoOps

Este contrato se aplica a cualquier persona o agente de IA que trabaje en `geoops-platform`.

El objetivo no es producir la mayor cantidad de código. El objetivo es entregar **el cambio mínimo correcto, verificable y documentado**.

---

## 1. Principios heredados de `incendios_forestales_app`

Estas reglas existen porque evitan fallos reales y peligrosos.

### 1.1 No inventar datos ni endpoints

- No inventar URLs, campos, claves, estados, precisiones o capacidades de una API.
- Cuando una fuente no pueda verificarse, la tarea se bloquea y se documenta.
- Un `404`, una respuesta vacía o un error de parsing nunca se interpreta automáticamente como “no hay eventos”.

### 1.2 Toda afirmación debe conservar su procedencia

- Un estado debe indicar qué fuente lo afirma.
- Una severidad estimada debe declararse como estimada.
- Una relación evento–activo debe explicar por qué existe.
- Toda transformación debe poder remontarse a una o más observaciones.

### 1.3 Separar siempre los tiempos

Como mínimo:

- `observed_at`: cuándo ocurrió o fue observado el dato.
- `published_at`: cuándo lo publicó la fuente, si existe.
- `ingested_at`: cuándo lo recibió GeoOps.
- `updated_at`: cuándo cambió el evento canónico.

Nunca presentar `ingested_at` como frescura del fenómeno.

### 1.4 Una fuente rota no tumba toda la plataforma

Cada adaptador se ejecuta de forma aislada.

Estados mínimos:

```text
success
partial
empty
stale
failed
disabled
```

La interfaz debe enseñar degradación, no ocultarla.

### 1.5 No sustituir una publicación válida por una inválida

- Los payloads raw son inmutables.
- Las observaciones no se sobrescriben.
- Una ingesta inválida no borra el último estado válido.
- Los cambios en eventos generan revisiones.

### 1.6 Ante la duda, reducir certeza

Es preferible mostrar:

```text
estado desconocido
fuente sin actualizar
precisión no disponible
relación estimada
```

que completar el hueco con una suposición.

---

## 2. Antes de editar

1. Leer la issue o tarea completa.
2. Crear o actualizar la tarea activa en `.ai/tasks/` cuando el cambio toque
   mas de un modulo, UI visible, pipeline, API o reglas de agente.
3. Leer `docs/00-LEEME-PRIMERO.md`.
4. Leer el ADR relacionado.
5. Buscar el punto de entrada con `rg`, búsqueda de símbolos o búsqueda de código.
6. Leer solo los archivos necesarios.
7. Revisar pruebas existentes.
8. Identificar si ya existe una utilidad reutilizable.
9. Confirmar si la tarea cambia:
   - contrato;
   - base de datos;
   - API;
   - arquitectura;
   - infraestructura;
   - seguridad;
   - dependencia de producción.

Si cambia alguno de esos puntos, debe existir un plan antes de editar.

### 2.1 Router de lectura

Abre solo la fuente que responde a la pregunta. No conviertas el arranque de una
tarea en una lectura indiscriminada.

| Pregunta del agente | Fuente de verdad |
|---|---|
| Producto y arquitectura inicial | `docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md` |
| Estado real actual | `docs/11-ESTADO-DEL-PROYECTO.md` |
| Pipeline y transformaciones | `docs/03-PIPELINE-Y-TRANSFORMACIONES.md` |
| Backend y APIs | `docs/04-ARQUITECTURA-BACKEND.md`, `docs/06-CONTRATOS-Y-APIS.md` |
| Modelo de datos | `docs/05-ONTOLOGIA-Y-MODELO-DATOS.md` |
| Fuentes | `docs/07-FUENTES-Y-ADAPTADORES.md`, `docs/sources/` |
| Interfaz y visual | `docs/09-INTERFAZ-Y-VISUALIZACION.md`, `docs/design/` |
| Pruebas e invariantes | `docs/08-PRUEBAS-INVARIANTES-OBSERVABILIDAD.md` |
| Errores conocidos | `docs/12-ERRORES-Y-SOLUCIONES.md` |
| Trabajo activo | `.ai/tasks/` |

---

## 3. Una sesión, una tarea

Una tarea debe tener un objetivo verificable.

Correcto:

```text
GEO-004 · Importar incidents.geojson de forma idempotente.
```

Incorrecto:

```text
Mejorar toda la ingesta y dejar la plataforma preparada para el futuro.
```

Cuando cambie el objetivo:

- cerrar la tarea actual;
- generar handoff;
- abrir una nueva tarea.

---

## 4. Protocolo de decisión

Antes de implementar, responder de forma breve:

1. **Problema:** ¿qué comportamiento falta o es incorrecto?
2. **Evidencia:** ¿qué archivo, payload, test o captura lo demuestra?
3. **Alcance:** ¿qué entra y qué queda fuera?
4. **Reutilización:** ¿qué código o patrón existente se aprovechará?
5. **Riesgo:** ¿qué podría romperse sin dar error?
6. **Validación:** ¿qué prueba demostrará que está resuelto?
7. **Documentación:** ¿qué documento debe actualizarse?

No se necesita exponer razonamiento interno extenso. Se necesita dejar un rastro de decisiones reproducible.

---

## 5. Plan obligatorio

Crear plan antes de editar cuando:

- se toquen más de dos módulos;
- exista migración de base de datos;
- cambie un contrato público;
- se añada una fuente;
- se cambie reconciliación;
- se añada una dependencia de producción;
- se toque CI o despliegue;
- se porte código desde otro repositorio.

Formato:

```markdown
## Plan

1. Inspeccionar...
2. Añadir prueba de regresión...
3. Implementar...
4. Ejecutar...
5. Actualizar documentación...
```

No mezclar el plan con implementación especulativa.

---

## 6. Reutilización desde `incendios_forestales_app`

Antes de portar código:

1. Registrar repositorio, ruta y commit de origen.
2. Leer sus pruebas.
3. Identificar qué parte es genérica y cuál pertenece al dominio wildfire.
4. Portar comportamiento, no copiar carpetas completas.
5. Adaptar nombres y contratos a GeoOps.
6. Mantener o mejorar cobertura.
7. Revisar licencia.
8. Documentar diferencias.

Encabezado recomendado:

```python
"""
Adaptado de:
pedromaaz13/incendios_forestales_app
commit: <sha>
ruta original: <ruta>

Se conserva:
- ...

Se modifica:
- ...

Se elimina:
- ...
"""
```

---

## 7. Implementación

- Alcance cerrado.
- Reutilizar antes de abstraer.
- No añadir una abstracción sin dos usos reales.
- No añadir un servicio separado si un módulo basta.
- No añadir Kafka, Kubernetes, Redis, Celery, Neo4j o WebSockets sin un requisito medido.
- No modificar código sano fuera del alcance.
- Si aparece un bug colateral, registrarlo antes de arreglarlo.
- Comentarios en castellano explicando **por qué**.
- Nombres de código y contratos en inglés, salvo vocabulario oficial.
- UTC en almacenamiento.
- Geometrías con SRID explícito.
- No usar `JSONB` para evitar modelar campos críticos.
- No interpolar datos del usuario en HTML.
- Secretos fuera de logs, repositorio y chat.

---

## 8. UI operacional y validación con datos

La UI de GeoOps es software operacional. No se acepta una pantalla que parezca
correcta solo con el caso feliz.

### 8.1 Reglas duras de UI

- El mapa es la superficie principal. Los paneles deben poder cerrarse,
  contraerse o quedar fuera del camino cuando tapen la lectura operacional.
- No se permite un mapa decorativo: debe mostrar teselas reales o un fallback
  declarado con eventos/activos en coordenadas reales y aviso visible.
- No se autoselecciona un evento salvo que la tarea lo pida explicitamente.
- Si `make demo` genera eventos, la UI no puede mostrar cero sin explicar si la
  causa es API, CORS, filtros, bbox, puerto equivocado o datos ausentes.
- `Load failed` nunca es un estado final aceptable. Debe traducirse a una causa
  accionable: API no accesible, CORS, endpoint incorrecto, sin datos o ejecuta
  `make demo`.
- La navegacion principal no debe duplicarse. Si hay rail y tabs, cada una debe
  tener una funcion distinta.
- No debe existir scroll global en desktop ni mobile. Solo listas, fichas o
  drawers concretos pueden desplazarse.
- Todo panel flotante debe tener estado cerrado y recuperable.
- La interfaz debe ser multievento: wildfire es una vertical, no la identidad de
  toda la plataforma.

### 8.2 Matriz minima de escenarios UI

Antes de cerrar una tarea de interfaz, probar como minimo:

```text
datos demo normales
sin eventos
muchos eventos
nombres largos
precision ausente
fuente success
fuente partial/stale/failed
API caida o puerto incorrecto
desktop 1440
desktop 1280
mobile
```

Si un escenario aun no tiene fixture o test, se documenta como riesgo vivo y no
se declara paridad.

### 8.3 Evidencia visual

- Todo cambio visible necesita captura desktop y mobile.
- Las capturas deben demostrar datos visibles cuando se ejecuto `make demo`.
- No se aceptan capturas con KPIs cortados, paneles pisados, textos ocultos o
  mapa vacio sin aviso.
- Playwright valida comportamiento; el navegador real valida la lectura visual.
  Ambos son necesarios cuando la tarea cambia layout o interaccion.

### 8.4 Datos antes que pixels

Antes de pulir estilos, confirmar:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/ready
curl -fsS http://127.0.0.1:8000/v1/operations/summary
```

La respuesta de `/health` debe incluir `service=geoops-api`. Si responde otro
servicio, la prueba UI no es valida.

---

## 9. Fuentes externas

Toda fuente nueva necesita:

```text
docs/sources/<source_id>.md
tests/fixtures/<source_id>/
adapter
normalizer
tests
source health
licencia y términos
```

El documento de fuente debe incluir:

- organismo;
- finalidad;
- endpoint;
- autenticación;
- licencia;
- formato;
- frecuencia;
- identificador;
- tiempos disponibles;
- geometría;
- precisión;
- estados;
- paginación;
- límites;
- comportamiento vacío;
- errores observados;
- payload de ejemplo;
- riesgos.

Cuando un parser falle en producción:

1. guardar el payload;
2. reducirlo a fixture;
3. escribir test que falle;
4. arreglar parser;
5. ejecutar suite;
6. documentar el caso.

---

## 10. Validación

Orden:

1. prueba específica;
2. módulo;
3. contrato;
4. suite completa;
5. build;
6. E2E;
7. captura cuando afecte a interfaz.

Comandos previstos:

```bash
make test-unit
make test-api
make test-ingestion
make test-contract
make typecheck
make build
make e2e
make test
```

Reglas:

- No declarar éxito sin salida de comandos.
- Un test saltado se reporta.
- Un warning relevante se reporta.
- Una validación no ejecutada se declara.
- No sustituir evidencia automática por “parece funcionar”.
- Los errores silenciosos necesitan pruebas de comportamiento, no solo de existencia.

---

## 11. Documentación

Cada tipo de información tiene una única ubicación.

| Información | Documento |
|---|---|
| Visión y arquitectura de inicio | `docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md` |
| Estado real del producto | `docs/11-ESTADO-DEL-PROYECTO.md` |
| Trabajo próximo | `docs/10-ROADMAP-M0.md` y `docs/13-PLAN-MVP-RAPIDO.md` |
| Decisiones arquitectónicas | `docs/adr/` |
| Contratos | `docs/contracts/` |
| Fuentes | `docs/sources/` |
| Errores relevantes | `docs/12-ERRORES-Y-SOLUCIONES.md` |
| Handoff temporal | `.ai/handoffs/` |
| Debug temporal | `.ai/debug/` |
| Tarea activa | `.ai/tasks/` |

No duplicar el mismo estado en varios documentos.

Actualizar documentación en la misma tarea cuando cambie:

- contrato;
- arquitectura;
- flujo;
- fuente;
- despliegue;
- comportamiento visible;
- requisito;
- limitación.

---

## 12. Comunicación de cierre

El cierre de una tarea debe incluir:

```markdown
## Resultado

Qué cambia y por qué.

## Archivos

- ruta: cambio

## Validación

- comando → resultado

## Decisiones

- decisión importante

## Riesgos vivos

- riesgo pendiente

## Documentación

- documentos actualizados
```

No pegar logs completos. Incluir solo líneas decisivas y comandos para reproducir.

---

## 13. Autonomía

Puede hacerse sin preguntar:

- buscar;
- leer;
- crear plan;
- editar dentro del alcance;
- añadir pruebas;
- ejecutar lint, tests y build;
- actualizar documentación relacionada.

Requiere confirmación:

- borrar datos;
- modificar producción;
- cambiar CI;
- añadir dependencia de producción;
- cambiar infraestructura;
- tocar secretos;
- cambiar contrato público;
- migración destructiva;
- alterar políticas de privacidad;
- copiar código externo.

---

## 14. Convenciones Git

- Una rama por hito o issue.
- No trabajar directamente sobre `main`.
- Conventional commits.
- PR pequeña y revisable.
- Cada PR debe contener:
  - código;
  - tests;
  - documentación;
  - evidencia visual cuando proceda;
  - riesgos conocidos.
- No hacer merge sin validacion completa y aprobacion explicita del usuario.
