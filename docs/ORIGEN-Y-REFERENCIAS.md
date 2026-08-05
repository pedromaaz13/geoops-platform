# Origen, referencias y jerarquía documental de GeoOps

## Repositorio principal

```text
https://github.com/pedromaaz13/geoops-platform
```

Es la plataforma operacional genérica.

## Repositorio origen

```text
https://github.com/pedromaaz13/incendios_forestales_app
```

Es el origen de la vertical wildfire y del sistema de ingeniería que GeoOps debe
conservar.

## Relación entre repositorios

```text
incendios_forestales_app
    ↓ contratos, patrones, fixtures e invariantes
geoops-platform
    ↓ generalización
plataforma multievento
```

El visor original no se reemplaza ni se modifica.

## Referencias visuales

```text
docs/design/references/current-geoops-mvp-before.png
```

Estado actual a superar.

```text
docs/design/references/wildfire-viewer-functional-baseline.png
```

Baseline funcional derivado del visor original.

```text
docs/design/references/geoops-visual-direction.png
```

Mockup original de dirección visual para GeoOps.

## Prompt anterior

```text
docs/PROMPT_RECONSTRUIR_FRONTEND_GEOOPS_DESDE_VISOR.md
```

Se centra en frontend.

## Prompt maestro actual

```text
docs/PROMPT_MASTER_GEOOPS_PARIDAD_WILDFIRE_Y_UI.md
```

Incluye paridad, backend, pipeline, fuentes, UI, pruebas y documentación.

## Regla de precedencia

1. `AGENTS.md`
2. documentación permanente;
3. prompt maestro actual;
4. tarea activa en `.ai/tasks/`;
5. handoff de sesión.

El prompt maestro no sustituye los contratos ni los ADR.

## Regla de calidad

Para wildfire:

```text
GeoOps >= incendios_forestales_app
```

Para capacidades nuevas:

```text
solo se muestran si existen datos, contrato, fuente y pruebas
```
