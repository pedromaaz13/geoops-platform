# Cómo dar contexto al agente para aplicar estas mejoras

> **Naturaleza del documento:** guía de trabajo incorporada el 2026-08-06. No
> sustituye `AGENTS.md` ni `11-ESTADO-DEL-PROYECTO.md`; sus prompts y secuencias
> son material de referencia y no describen funcionalidad implementada.

El repo ya tiene el mejor activo posible para trabajar con agentes: `AGENTS.md`.
El problema no es que falten reglas, es que **la documentación que el agente está
obligado a leer describe software que no existe** (React Router, `packages/`,
Protocols de adaptador, targets de Makefile). Un agente disciplinado que siga
`AGENTS.md §2.1` va a construir sobre esas afirmaciones.

Por eso el orden es: primero arreglar el mapa, después conducir.

---

## 1. Sesión cero · antes de cualquier tarea

Una sesión corta, sin código nuevo, con este encargo:

```
Tarea: GEO-FIX-006 · Documentación que no miente.

No implementes funcionalidad. Tu trabajo es que la documentación describa el
repositorio real en el commit actual.

1. Lee AGENTS.md y docs/00-LEEME-PRIMERO.md.
2. Verifica cada afirmación de docs/01-PRODUCTO-Y-ARQUITECTURA-INICIAL.md,
   docs/07-FUENTES-Y-ADAPTADORES.md y README.md contra el código.
3. Para cada afirmación falsa: o la corriges, o la mueves a una sección
   "Previsto, no implementado" con fecha.
4. Alinea los targets de AGENTS.md §10 con el Makefile real: o creas los
   targets que faltan (test-api, test-ingestion, test-contract) o los quitas
   del contrato.
5. Actualiza docs/11-ESTADO-DEL-PROYECTO.md con el estado verificado.

Entrega: diff de documentación + lista de afirmaciones falsas encontradas.
No toques código de servicios ni de apps.
```

A partir de aquí, el agente lee documentación fiable y deja de inventar.

---

## 2. Cláusulas a añadir a `AGENTS.md`

Tres reglas que habrían evitado la mayoría de lo encontrado en la revisión.

```markdown
### 1.7 Un dato tiene un solo sitio

Si un valor vive en una columna tipada, no se duplica en `attributes`. Si se
necesita en JSONB por rendimiento, se documenta como caché derivada y se declara
quién la regenera. Dos fuentes de verdad para el mismo valor es un defecto,
no una optimización.

### 8.5 Ningún cambio de contrato se valida sólo con mocks

Los mocks de Vitest y Playwright son válidos para comportamiento de interfaz.
No son válidos para verificar la forma de una respuesta. Todo cambio en un
endpoint necesita, además, una prueba contra la API real levantada con
`make demo`.

### 10.1 Truncar es degradar

Cualquier respuesta que devuelva menos datos de los que existen debe declararlo
en su propio cuerpo. Un `limit` alcanzado sin marca de parcialidad es una
mentira al cliente, no una optimización.
```

---

## 3. Paquete de contexto por sesión

Al abrir cada sesión, pega esto. Es lo mínimo para que el agente no navegue a
ciegas ni relea el repo entero.

```
CONTEXTO DE SESIÓN

Repo: pedromaaz13/geoops-platform
Commit base: <sha>
Rama nueva: geo-fix-XXX-<slug>

Producto: plataforma de avisos geoespaciales sobre activos de terceros.
Primera vertical: incendios. Siguiente fuente prevista: AEMET CAP.
Cliente de referencia: <A autoservicio | B enterprise>   ← del ADR-004

Contrato de ingeniería: AGENTS.md (léelo entero antes de editar)
Estado real: docs/11-ESTADO-DEL-PROYECTO.md
Tarea activa: .ai/tasks/GEO-FIX-XXX-<slug>.md

Limitaciones conocidas del repo que NO debes asumir resueltas:
- Event.geometry y Asset.geometry son POINT: no hay polígonos todavía.
- No existe Organization ni autenticación.
- La única fuente conectada es el feed público de incendios.
- No hay scheduler: la ingesta es manual por CLI.
- Los endpoints no declaran response_model.

Alcance de esta sesión: SOLO la tarea activa.
Si encuentras un defecto fuera de alcance, regístralo en .ai/debug/ y sigue.
```

---

## 4. Prompt por tarea

```
Ejecuta la tarea .ai/tasks/GEO-FIX-XXX-<slug>.md siguiendo AGENTS.md.

Antes de editar, responde en 10 líneas el protocolo de decisión de §4:
problema, evidencia (archivo y línea), alcance, reutilización, riesgo,
validación, documentación.

Después implementa en este orden:
1. Escribe la prueba que falla hoy y demuestra el defecto.
2. Ejecútala y pega la salida del fallo.
3. Implementa el cambio mínimo.
4. Ejecuta: make lint, make typecheck, make test, make check.
5. Actualiza la documentación que corresponda según §11.

Cierra con el formato de §12: Resultado, Archivos, Validación (comando →
resultado real), Decisiones, Riesgos vivos, Documentación.

No hagas merge. No amplíes el alcance. Si la tarea resulta imposible tal como
está descrita, para y explica por qué en vez de improvisar una alternativa.
```

El punto 1 y 2 son lo importante: **prueba que falla antes de implementar**. Sin
eso, un agente escribe el código y luego un test que valida el código que acaba
de escribir, que es exactamente cómo aparecieron los mocks de e2e que hoy no
detectan drift.

---

## 5. Cómo verificar lo que te devuelve el agente

Cinco comprobaciones rápidas antes de aprobar un PR. Si alguna falla, el PR
vuelve.

1. **¿Existe el commit del test que falla, antes del commit que arregla?**
   Si sólo hay un commit con código y test juntos, el test se escribió después.
2. **¿La salida de validación es real?** Pide el número: `14 passed`, no
   «los tests pasan».
3. **¿Cambió algún contrato sin actualizar `docs/06` y el `openapi.json`?**
4. **¿Se tocó algo fuera del alcance declarado?** `git diff --stat` contra la
   lista de «Archivos probables» de la tarea.
5. **¿Hay evidencia visual si cambió la UI?** Desktop y móvil, con datos de
   `make demo`, según §8.3.

---

## 6. Reglas de conducción que ahorran sesiones

- **Una tarea, una rama, un PR.** Ya lo dice `AGENTS.md §14` y se está
  cumpliendo. Mantenlo.
- **No dejes que el agente decida el orden de las tareas.** El orden está en el
  plan; cambiarlo es una decisión de producto.
- **Los commits en castellano por comportamiento observable** (como en
  `incendios`: «el panel se puede abrir desde el móvil») envejecen mucho mejor
  que `feat: add wildfire filters`. En GeoOps estás perdiendo esa convención.
- **Después de cada tarea, actualiza `docs/11-ESTADO-DEL-PROYECTO.md`.** Es el
  documento que el siguiente agente lee para saber dónde está. Si envejece, todo
  lo demás envejece con él.
- **Cuando una tarea toque migración, contrato público o reconciliación, pide
  el plan y apruébalo antes de que escriba código.** Son los tres sitios donde
  un error cuesta semanas.

---

## 7. Qué pegarme a mí en la próxima sesión

```
1. git log --oneline -20 y la rama actual
2. docs/11-ESTADO-DEL-PROYECTO.md
3. La tarea de .ai/tasks/ que acabas de cerrar y su bloque de Validación
4. Salida de make check (completa si falla)
5. curl -s localhost:8000/openapi.json | jq '.paths | keys'
6. Qué decidiste en el ADR-004 (cliente de referencia)
```

Con eso reviso el trabajo hecho, no vuelvo a auditar lo ya auditado, y podemos
seguir con la siguiente tarea del plan.
