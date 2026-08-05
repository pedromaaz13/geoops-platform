# Plan MVP rápido

Este documento ordena el trabajo siguiente por cortes verticales funcionales.
No autoriza a implementar fases posteriores dentro de `GEO-001`.

## Corte 0 · Bootstrap

Pregunta de negocio: ¿puede una persona desarrollar y validar GeoOps desde una máquina limpia?

Demo observable: repo instalable, API viva, PostGIS listo, web viva, CLI viva y CI.

Tareas:

- `GEO-001 · Bootstrap del repositorio GeoOps`.

Dependencias: documentación de arranque, `uv`, `pnpm`, Docker.

Criterio de aceptación: `make check` termina correctamente; `/health`, `/ready`, CLI smoke y web inicial funcionan.

Riesgos: que se declaren capacidades futuras como existentes; que CI y local diverjan.

Qué se reutiliza del visor: sistema de trabajo, puertas de CI, pruebas por capas.

Qué queda fuera: dominio, adaptadores, modelos, mapas y alertas.

Estimación relativa: S.

## Corte 1 · Incendios de extremo a extremo

Estado: implementado dentro de `GEO-MVP-001`, pendiente de validación final en PR.

Pregunta de negocio: ¿qué incendios reconciliados del visor existen ahora como eventos consultables en GeoOps?

Demo observable:

```text
incidents.geojson
        ↓
adaptador
        ↓
Observation
        ↓
Event
        ↓
PostGIS
        ↓
GET /v1/events
        ↓
mapa + lista básica
```

Tareas:

- Definir contrato mínimo para importar `incidents.geojson`.
- Crear modelos `Source`, `SourceRun`, `RawPayload`, `Observation`, `Event` y relaciones mínimas.
- Añadir migraciones PostGIS e índices necesarios.
- Crear fixture reducido y adaptador wildfire sin tocar el visor.
- Normalizar observaciones conservando procedencia, tiempos y precisión.
- Reconciliar por identificador upstream inicial.
- Exponer `GET /v1/events` con límite y bbox.
- Mostrar lista y mapa básico de eventos wildfire.

Dependencias: artefacto real del visor, fixture estable, modelos y migraciones.

Criterio de aceptación: una ejecución local importa un fixture wildfire, crea observaciones y eventos idempotentes, la API los devuelve y la web los muestra.

Riesgos: copiar dominio wildfire en el núcleo; perder diferencia entre edad del dato y edad de ingesta; asumir estados sin fuente.

Qué se reutiliza del visor: contrato de artefactos, fixtures, latencias, procedencia e invariantes.

Qué queda fuera: AEMET, DGT, activos, alertas, reglas complejas y snapshots públicos.

Estimación relativa: L.

## Corte 2 · Procedencia y evolución

Estado: implementado en su versión MVP para wildfire: observaciones, fuentes,
tiempos, precisión, salud de fuente y revisiones por cambios relevantes.

Pregunta de negocio: ¿por qué GeoOps afirma que un evento existe y cómo ha cambiado?

Demo observable: ficha de evento con observaciones, fuentes, `observed_at`, `ingested_at`, precisión, salud de fuente y revisiones.

Tareas:

- Exponer observaciones de un evento.
- Exponer salud de fuentes.
- Persistir revisiones ante cambios relevantes.
- Mostrar ficha de evento con procedencia y latencias separadas.
- Añadir pruebas de errores silenciosos sobre estados sin fuente y revisiones sin cambio.

Dependencias: Corte 1 completado.

Criterio de aceptación: la ficha permite explicar cada campo crítico mediante fuente, tiempo y precisión; las revisiones no se crean por reingesta idéntica.

Riesgos: duplicar estado entre evento y observación; generar revisiones falsas; ocultar fuente degradada.

Qué se reutiliza del visor: panel de fuentes, manifiesto, separación de latencias e invariantes.

Qué queda fuera: activos, impactos, alertas y segundo tipo de evento.

Estimación relativa: M.

## Corte 3 · Segundo tipo de evento

Estado: siguiente corte recomendado. No implementado.

Pregunta de negocio: ¿GeoOps modela algo que no sea wildfire sin romper el núcleo?

Demo observable: un segundo tipo de evento consultable por API y distinguible en la web.

Elección recomendada: DGT DATEX II, si el feed nacional real y un fixture reducido permanecen disponibles.

Justificación: el visor ya demostró valor operativo con cortes de carretera, el resultado es visual y fácil de verificar, y permite validar eventos independientes sin depender de un incendio. AEMET CAP queda como alternativa si el acceso DATEX no es reproducible.

Tareas:

- Verificar acceso real y términos.
- Crear fixture DATEX reducido.
- Definir vocabulario mínimo `road_closure`.
- Implementar adaptador y normalizador.
- Añadir reconciliación por identificador DATEX.
- Mostrar capa/lista diferenciada.

Dependencias: contratos de observación/evento y API del Corte 1.

Criterio de aceptación: un fixture DATEX crea un evento independiente y la API lo devuelve sin requerir wildfire.

Riesgos: endpoint no verificable; payload vacío interpretado como ausencia de cortes; geometrías lineales incompletas.

Qué se reutiliza del visor: parser/fixture conceptual de DGT, salud de fuente y tratamiento de vacío/error.

Qué queda fuera: rutas alternativas, navegación, alertas y cálculo de impacto.

Estimación relativa: M.

## Corte 4 · Primer activo e impacto

Estado: implementado en versión MVP con activos puntuales e impacto por
proximidad sobre wildfire.

Pregunta de negocio: ¿qué activo se ve afectado por un evento y por qué?

Demo observable:

```text
Asset
Event
distance/intersection
Impact explicado
```

Tareas:

- Modelar `Asset` mínimo sin multiempresa completa.
- Crear carga manual de fixture de activos.
- Calcular distancia o intersección con un evento.
- Persistir `Impact` con razones y versión de cálculo.
- Mostrar impacto explicado en API y web.

Dependencias: eventos persistidos y consultas espaciales.

Criterio de aceptación: un activo de fixture genera un impacto reproducible con distancia/intersección y explicación.

Riesgos: introducir auth u organizaciones antes de tiempo; calcular distancia con SRID incorrecto; ocultar precisión.

Qué se reutiliza del visor: cálculos de cercanía y principio de explicación visible.

Qué queda fuera: alertas multicanal, casos, usuarios y permisos.

Estimación relativa: M.

## Corte 5 · Primera regla y alerta

Estado: implementado en versión MVP con una regla interna de proximidad y alerta
deduplicada. No incluye canales externos.

Pregunta de negocio: ¿puede GeoOps avisar de una condición operacional simple y verificable?

Demo observable: una regla `wildfire within configured distance of asset` produce una alerta deduplicada.

Tareas:

- Modelar una regla mínima y validada.
- Evaluar regla sobre impactos existentes.
- Crear alerta con deduplicación.
- Exponer alerta por API.
- Mostrar alerta en la web.

Dependencias: Corte 4 completado.

Criterio de aceptación: el mismo impacto no genera alertas duplicadas y la alerta explica regla, evento, activo y distancia.

Riesgos: crear motor de reglas genérico prematuro; mezclar entrega multicanal con evaluación; duplicar alertas.

Qué se reutiliza del visor: invariantes, deduplicación y honestidad de procedencia.

Qué queda fuera: email productivo, SMS, push, casos, escalados y workflows complejos.

Estimación relativa: M.
