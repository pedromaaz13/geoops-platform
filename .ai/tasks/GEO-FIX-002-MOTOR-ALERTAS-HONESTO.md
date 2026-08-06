# GEO-FIX-002 · Motor de alertas honesto

Estado: previsto, no implementado. Fuente de diseño: `docs/GEOOPS-REVISION-2.md §7`.

## Pregunta que responde

¿Genera el motor una alerta por cambio material real, respeta el cooldown y resuelve la
alerta cuando el evento deja de cumplir la regla?

## Problema

Hoy la clave de deduplicación incluye la revisión, así que cada revisión del evento
puede reabrir alerta; no se aplica `cooldown_minutes` de forma efectiva y no hay
transición a `resolved`.

## Evidencia

- `AlertRule.cooldown_minutes` existe pero no gobierna la dedup: `services/api/geoops_api/models.py:159`.
- `Alert.deduplication_key` y `resolved_at` existen pero sin lógica de resolución material: `services/api/geoops_api/models.py:174`.

## Objetivo

Una alerta por condición material, con cooldown real y cierre automático cuando el
evento sale de la regla.

## Alcance

### Incluye
- Clave de dedup `(rule_id, event_id, asset_id)` + ventana de cooldown, sin revisión.
- Re-alertar solo ante cambio material: cruce de umbral, subida de severidad o estado.
- Transición a `resolved` con `resolved_at` y motivo cuando deja de cumplir la regla.

### No incluye
- Canales de entrega externos (`sent_at`, `delivery_attempts`): previstos aparte.

## Reutilización

Reaprovecha `Alert`, `AlertRule` y la evaluación de impacto existentes; cambia la clave
de dedup y añade la máquina de estados.

## Diseño

Detección de cambio material comparando snapshot previo vs nuevo; ventana de cooldown
por regla; job/paso que marca `resolved` cuando la condición deja de cumplirse.

## Archivos probables

- `services/api/geoops_api/operations.py` (evaluación de alertas)
- `services/api/geoops_api/models.py` (si hace falta motivo de resolución)

## Dependencias

Se apoya en la reconciliación de eventos; conviene tras GEO-FIX-004 para distancias
correctas.

## Riesgos silenciosos

- Definir «material» de forma laxa y volver a inundar de alertas.
- Cooldown por reloj de servidor vs `last_observed_at`.

## Plan

1. Redefinir la clave de dedup sin revisión.
2. Detectar cambio material (umbral, severidad, estado).
3. Aplicar cooldown por regla.
4. Resolver alertas cuando el evento sale de la regla.

## Pruebas

40 revisiones seguidas → 1 alerta. Cruce de umbral → 2ª alerta.

## Criterios de aceptación

- [ ] Dedup `(rule_id, event_id, asset_id)` + cooldown.
- [ ] Solo re-alerta ante cambio material.
- [ ] Resolución automática con `resolved_at` y motivo.

## Documentación

- [ ] `docs/06` / `docs/08` describen la semántica de alertas.
