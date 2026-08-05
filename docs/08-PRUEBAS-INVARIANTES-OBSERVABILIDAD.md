# Pruebas, invariantes y observabilidad

La calidad del visor de incendios procede de bloquear errores plausibles y
silenciosos. GeoOps mantiene esa estrategia.

---

## 1. Pirámide

```text
unitarias puras
integración con PostGIS
contratos
adaptadores con fixtures
API
componentes
E2E
regresión visual
```

## 2. Backend

- modelos;
- nulabilidad;
- geometría;
- idempotencia;
- reconciliación;
- revisiones;
- invariantes;
- migraciones;
- consulta bbox;
- concurrencia;
- errores por fuente.

## 3. Frontend

- lógica geoespacial con Vitest;
- componentes con Testing Library;
- Playwright para flujos;
- capturas visuales;
- accesibilidad;
- móvil;
- error de capa;
- estado parcial;
- URL compartible;
- presupuesto de bundle.

## 4. Invariantes M0

1. Toda observación tiene fuente.
2. `ingested_at` es obligatorio.
3. Un estado tiene fuente.
4. La precisión es positiva o nula.
5. Geometría válida y SRID conocido.
6. Un evento tiene al menos una observación.
7. No hay observaciones duplicadas por clave idempotente.
8. Una revisión solo se crea ante cambio relevante.
9. La fuente `failed` no se presenta como vacía.
10. El evento no desaparece por fallo temporal de una fuente.
11. La API nunca mezcla runs incompatibles.
12. Las dos latencias se mantienen separadas.

## 5. Pruebas de error silencioso

Casos obligatorios:

- coordenada vacía;
- lat/lon intercambiadas;
- UTM presentado como WGS84;
- payload 200 vacío;
- fuente stale;
- fecha futura;
- ID duplicado;
- estado sin fuente;
- build viejo en E2E;
- capa no montada;
- manifest nuevo con datos anteriores;
- alerta duplicada;
- revisión sin cambio.

## 6. Fixtures

```text
tests/fixtures/
├── wildfire_public/
├── aemet_cap/
├── dgt_datex/
├── ign/
└── malformed/
```

No dependen de red.

## 7. CI

Orden rápido a lento:

```text
lint
unit
typecheck
contract
integration
build
e2e
bundle
```

La CI y los comandos locales deben coincidir.

## 8. Observabilidad

### Logs

JSON estructurado:

```text
service
environment
run_id
source_id
event_id
observation_id
request_id
level
message
```

### Métricas

- duración por fuente;
- success/partial/empty/stale/failed;
- filas descargadas, aceptadas y rechazadas;
- última observación;
- eventos creados/actualizados;
- reconciliaciones ambiguas;
- impactos;
- alertas;
- latencia API;
- tamaño de respuesta.

### Trazabilidad

`run_id` sigue el flujo desde descarga hasta evento y snapshot.

## 9. Cierre de tarea

No declarar éxito sin:

```text
comando
resultado
tests saltados
warnings relevantes
validaciones no ejecutadas
riesgos vivos
```
