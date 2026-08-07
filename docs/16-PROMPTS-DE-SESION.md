# GeoOps · prompts de sesión

Ubicación: `docs/16-PROMPTS-DE-SESION.md`

Cuatro sesiones, en este orden. **Una tarea por sesión.** Si le pasas varias
juntas, planificará todas y ejecutará mal todas.

Antes de cada sesión, pega también el paquete de contexto de
`docs/GEOOPS-BRIEF-AGENTE.md` §3, actualizando el commit base.

| Sesión | Tarea | Por qué en este puesto |
|---|---|---|
| 1 | `GEO-FIX-001` · Listado veraz | Pequeña. Con fuente real y malla encima, un mapa que trunca en silencio es indefendible |
| 2 | `GEO-CORE-001` · Geometría + Organization | Desbloquea polígonos: sin ellos no hay áreas de exposición ni zonas AEMET |
| 3 | `GEO-VIZ-001/002` · Malla y cifra de exposición | Es la capa que da el titular «118.400 personas, 410 km²» |
| 4 | `GEO-FIX-007` · Consola de producto | Lo último. Hacerla antes obliga a rehacerla cuando lleguen los polígonos |

Si el agente propone adelantar la interfaz porque «es lo que se ve», di que no.

---

## Sesión 1 · GEO-FIX-001

```
Tarea: GEO-FIX-001 · Verdad en el listado de eventos.

Contexto: los contratos tipados ya existen (GEO-FIX-003), así que cualquier
cambio de forma en la respuesta debe regenerar openapi.json y api-types.ts,
y make openapi-check lo va a exigir.

Problema verificado:
- MAX_LIMIT = 200 en operations.py.
- apps/web/src/api.ts pide limit=200 y nunca usa next_cursor.
- meta.partial se devuelve siempre false, incluso al truncar.
- El orden es ORDER BY Event.id sobre UUID: el subconjunto truncado es
  aleatorio, ni el más reciente ni el más grave.

Incluye:
1. meta.partial = true cuando se trunca, y meta.total_matched con el conteo
   real de la consulta.
2. Orden estable por (last_observed_at DESC, id) y cursor sobre esa clave
   compuesta, no sobre id.
3. Rechazar con 400 los query params desconocidos en lugar de ignorarlos.
   Hoy un cliente que use from_time en vez de from recibe un filtro
   silenciosamente ignorado.
4. El front consume next_cursor y muestra "N de M" cuando hay más.
5. Regenerar contratos: make openapi && pnpm gen:api, y commitear.

No incluye: cambiar MAX_LIMIT, paginación infinita en la UI, virtualización
de la lista.

Pruebas obligatorias (escribe la que falla ANTES de implementar y pega su
salida de fallo):
- 250 eventos → primera página con partial=true, dos páginas sin duplicados
  ni huecos.
- from_time como parámetro → 400, no 200 silencioso.
- El orden es determinista entre llamadas.

Rama geo-fix-001-listado-veraz. PR draft. Sin merge. Cierra con el formato
de AGENTS.md §12.
```

---

## Sesión 2 · GEO-CORE-001

Pídele el plan y apruébalo **antes** de que escriba código. Es la tarea de
mayor riesgo del proyecto.

```
Tarea: GEO-CORE-001 · Geometría genérica y Organization.

Es la tarea que desbloquea todo lo demás. Presenta el plan y espera mi
aprobación ANTES de escribir código.

Por qué: el producto son avisos sobre activos de terceros. Los avisos AEMET
son zonas poligonales, los cortes DGT son líneas, las parcelas de un ganadero
y los recintos de una planta son polígonos. Hoy Event.geometry y
Asset.geometry son Geometry("POINT", 4326): ese lenguaje visual es imposible.
Y no existe Organization: activos, reglas y alertas no tienen dueño, lo cual
en un producto multiempresa es una fuga de datos esperando a ocurrir.

Incluye:
1. Migración 0002: Event, Observation y Asset pasan a
   Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True).
   ALTER con USING ST_Force2D(geometry).
2. CHECK (ST_SRID(geometry) = 4326) en las tres tablas. Sin esto, GEOMETRY
   acepta basura y revienta meses después dentro de ST_DWithin.
3. Columna geometry_kind (point|line|area). Decide si generada o mantenida
   en el normalizador, y documenta el porqué en un ADR.
4. representative_point (POINT) mantenido con ST_PointOnSurface, para
   etiquetas y clustering baratos en el mapa.
5. Tabla organizations + organization_id NOT NULL en assets, alert_rules,
   alerts e impacts. Seed de una organización por defecto y backfill.
6. OrganizationContext inyectado por dependencia de FastAPI, de momento fijo
   por variable de entorno. TODAS las queries de operations.py filtran por él.
7. Índice compuesto GiST (organization_id, geometry) en assets.
8. schemas.py: PointGeometry ya no vale. Modela geometría GeoJSON genérica.
   Esto rompe api-types.ts a propósito: regenera y commitea. make
   openapi-check debe pasar.
9. Mínimo imprescindible de front: OperationsMap sólo pinta capas circle.
   Añade capas fill y line filtradas por geometry-type para que un evento no
   puntual no desaparezca del mapa. Nada más de UI.

No incluye: autenticación, login, RLS de Postgres, dibujo de polígonos en la
interfaz, importación SIGPAC, cambiar el adaptador wildfire (sigue siendo
puntual y debe seguir funcionando igual).

Riesgo que debes cubrir con test explícito: filtrar por organización en doce
sitios y olvidar uno es una fuga entre clientes. Crea dos organizaciones y
verifica aislamiento en CADA endpoint que devuelva activos, impactos, reglas
o alertas. No un test genérico: uno por endpoint.

Pruebas:
- Insertar evento poligonal y recuperarlo por GET /v1/events.
- Activo lineal contra evento poligonal: el impacto se calcula.
- Migración up y down sobre una base con datos de make demo.
- Los tests de invariantes de wildfire pasan sin cambios de comportamiento.

Rama geo-core-001-geometria-y-organizacion. PR draft. Sin merge.
```

> Va a proponer meter autenticación «ya que estamos con Organization». Dile que
> no: auth es `GEO-PROD-001`, y mezclarla convierte una migración revisable en
> un PR de 3.000 líneas que nadie puede auditar.

---

## Sesión 3 · GEO-VIZ-001 y 002

```
Tarea: GEO-VIZ-001 y GEO-VIZ-002 · Malla de exposición y cifra por evento.

Depende de GEO-CORE-001. No empieces si la geometría sigue siendo POINT.

Referencia de destino: docs/GEOOPS-PLAN-VISUAL.md, bloque B.

VIZ-001 · Malla de población:
- Ingiere la malla de población H3 de Kontur (licencia abierta) recortada a
  España COMO UNA FUENTE MÁS: entrada en la tabla sources, SourceRun, raw
  con content_hash y su docs/sources/<id>.md con la plantilla completa de
  docs/07. No es un fichero suelto en el repo.
- Verifica la licencia y déjala escrita en el doc de la fuente antes de
  ingerir nada.
- Tabla exposure_cell(h3_index, population, buildings, geometry).
- Sírvela como PMTiles, no como GeoJSON. El repo incendios_forestales_app ya
  tiene ese pipeline: reutilízalo, no lo reinventes.

VIZ-002 · Exposición por evento:
- Tabla event_exposure(event_id, population, area_km2, buildings,
  calculation_version), calculada con ST_Intersects entre la geometría del
  evento y las celdas.
- Mismo patrón que Impact: versión de cálculo obligatoria, y cambiarla exige
  subir calculation_version. Test que lo verifique.
- Exponerla en las propiedades del evento y en la ficha. Es el titular que
  hace que un evento signifique algo: "118.400 personas, 410 km²".
- Ahora que la geometría es genérica (GEO-CORE-001): el cálculo de exposición usa
  ST_Intersects contra la geometría real del evento, no contra un buffer del
  punto. Un aviso AEMET poligonal debe dar su población exacta por zona, no una
  aproximación circular.

No incluye: pintar la malla en el mapa (eso es VIZ-004), deck.gl, cambiar
el cálculo de Impact contra activos del cliente.

Aviso de rendimiento: no repitas el error de recalculate_impacts, que hace
un bucle N×M con una query por par. Una sola sentencia SQL con
INSERT ... ON CONFLICT.

Rama geo-viz-001-malla-exposicion. PR draft.
```

---

## Sesión 4 · GEO-FIX-007

```
Tarea: GEO-FIX-007 · Consola de producto.

Depende de GEO-FIX-001, GEO-CORE-001 y GEO-VIZ-001/002. No empieces si la
geometría sigue siendo POINT o si no existe la cifra de exposición por
evento: quedaría una consola bonita pintando puntos sin datos que la
sostengan, que es peor que la actual.

Documento normativo: docs/15-DISENO-DE-CONSOLA.md. Léelo entero antes de
tocar nada. Sus tokens son los de apps/web/src/styles.css, ya en main. La maqueta apps/web/public/geoops-ui-target.html es referencia
visual, NO código para copiar: está en vanilla JS con datos sintéticos.

Punto de partida: apps/web/src/app/App.tsx tiene 1.337 líneas y 13 useState;
styles.css otras 1.358 sin capas.

Incluye:
1. Trocear en features/{events,sources,assets,alerts,map} con un contenedor
   fino. Ningún archivo por encima de ~250 líneas. CSS por feature o tokens
   más módulos.
2. Rejilla de cuatro columnas 44/340/1fr/296 con los colapsos descritos en
   §2 del documento de diseño.
3. Tarjeta de evento según §3 del documento de diseño: máximo 68 px de alto, severidad en barras,
   métricas con icono, truncado con elipsis. Criterio medible: en 1920×1080
   se ven diez eventos o más sin desplazar.
4. Panel de capas generado desde registries/layers.ts según §5. Añadir una
   fuente nueva no puede requerir tocar JSX.
5. Malla de exposición como capa PMTiles con leyenda bivariante 3×3 según §6.
6. Línea temporal de 72 h con reproducción alimentada por EventRevision.
   Es reproducción del histórico real, no una animación.
7. Usar EXCLUSIVAMENTE los tokens de styles.css (§1). Ni un literal
   hexadecimal fuera de ese archivo. Toda cifra en IBM Plex Mono con
   tabular-nums.

Prohibiciones explícitas (§4). Se probaron y se retiraron:
- Halos, auras o círculos difuminados estáticos bajo los marcadores.
- Marcas de agua o elementos flotantes en el centro del mapa.
- Celdas de la malla sin población: no se pintan, el hueco es información.
- Cualquier animación que no responda a un cambio de dato.

NO TOQUES, son lo mejor del front actual:
- friendlyLoadError() y su traducción de errores de red a causa accionable.
- El fallback de mapa cuando fallan las teselas.
- El ResizeObserver de OperationsMap.
- Los registries.

Regla dura: si un panel enseña una cifra, esa cifra viene de la API. Nada
hardcodeado ni derivado en el cliente. Si la vista muestra menos objetos de
los que existen, la interfaz lo dice — AGENTS.md §10.1 aplica al diseño.

Evidencia obligatoria: capturas en 1920×1080 y en móvil, con make demo y con
la base vacía, según la matriz de escenarios de AGENTS.md §8.2.

Rama geo-fix-007-consola-producto. PR draft. Sin merge. Cierra con el formato
de AGENTS.md §12.
```

---

## Verificación antes de aprobar cada PR

1. ¿Existe el commit del test que falla **antes** del commit que arregla?
2. ¿La salida de validación trae números reales (`14 passed`), no «pasan»?
3. ¿`git diff --stat` se queda dentro del alcance declarado?
4. Si cambió contrato: ¿`openapi.json` y `api-types.ts` regenerados y
   commiteados?
5. Si cambió UI: ¿capturas en las dos resoluciones y con base vacía?
