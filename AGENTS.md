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
2. Leer `docs/00-LEEME-PRIMERO.md`.
3. Leer el ADR relacionado.
4. Buscar el punto de entrada con `rg`, búsqueda de símbolos o búsqueda de código.
5. Leer solo los archivos necesarios.
6. Revisar pruebas existentes.
7. Identificar si ya existe una utilidad reutilizable.
8. Confirmar si la tarea cambia:
   - contrato;
   - base de datos;
   - API;
   - arquitectura;
   - infraestructura;
   - seguridad;
   - dependencia de producción.

Si cambia alguno de esos puntos, debe existir un plan antes de editar.

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

## 8. Fuentes externas

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

## 9. Validación

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

## 10. Documentación

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

## 11. Comunicación de cierre

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

## 12. Autonomía

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

## 13. Convenciones Git

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
