# GeoOps Platform

Plataforma operacional geoespacial para integrar observaciones procedentes de
fuentes heterogéneas, mantener eventos canónicos, cruzarlos con activos y rutas,
calcular impactos y activar reglas, alertas y casos.

La primera vertical es la aplicación pública de incendios forestales de España.
GeoOps no sustituye ese repositorio: lo consume como primera fuente y reutiliza
selectivamente su arquitectura, sus contratos, sus fixtures, sus invariantes y
su método de ingeniería.

## Orden de lectura

1. `AGENTS.md`
2. `docs/00-LEEME-PRIMERO.md`
3. El documento indicado por el router.
4. La tarea activa en `.ai/tasks/`, cuando exista.

## Primera meta

```text
incendios_forestales_app
        ↓ artefactos versionados
GeoOps ingestion
        ↓
Observation
        ↓ reconciliación
Event
        ↓
PostGIS + API
        ↓
Operations Console
```

La primera demo debe permitir consultar incendios por espacio y tiempo, conocer
qué observaciones los respaldan, qué fuente afirma su estado, la antigüedad y
precisión del dato y su evolución.
