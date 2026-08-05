# GEO-UI-003 · GeoOps UI Quality & Operational Console Pass

## Pregunta que responde
¿Cómo convertimos la consola GeoOps en una interfaz operacional oscura, moderna, usable y con datos locales visibles tras `make demo && make dev`?

## Problema
La interfaz actual queda por debajo de la dirección visual aprobada: navegación poco expresiva, controles nativos sin pulir, tooltips insuficientes, tabs pobres y mensajes de error poco accionables. Además, cuando Vite cae a un puerto alternativo, la API puede bloquear la carga por CORS y dejar la consola en `Load failed`.

## Evidencia
- Capturas aportadas por el usuario con `Carga parcial · Load failed` y eventos a `0`.
- Referencias en `docs/design/references/geoops-visual-direction.png`, `wildfire-viewer-functional-baseline.png` y `current-geoops-mvp-before.png`.
- Plan aprobado por el usuario para `codex/geoops-ui-quality-system-pass`.

## Objetivo
Entregar un pase de calidad UI/operacional que haga fiable la carga local de datos, añada navegación tipo consola GIS/BigQuery, mejore paneles, tabs, filtros, tooltips, mapa/fallback y deje reglas visuales documentadas.

## Alcance
### Incluye
- CORS/dev workflow para puertos Vite locales.
- Rail izquierdo colapsable/expandible con iconos, badges y tooltips.
- Tabs principales y tabs de ficha con estado en URL.
- Tooltips accesibles sin dependencia pesada.
- Controles visuales compactos.
- Empty/error states accionables.
- Reglas de calidad UI en documentación.
- Pruebas unitarias/E2E y capturas.

### No incluye
- Nuevas fuentes externas.
- Nuevas verticales multievento.
- deck.gl, Kepler.gl, MapLibre plugins o librerías UI pesadas.
- Cambios de dominio, modelos o migraciones funcionales fuera del flujo ya existente.

## Reutilización
Se reutilizan los contratos y datos operacionales existentes de GeoOps, más la dirección visual documentada desde el visor de incendios. No se copian carpetas del repositorio de referencia.

## Diseño
La consola prioriza superficie de mapa, densidad de paneles, navegación lateral persistente, tabs escaneables, estados degradados explícitos y controles oscuros de bajo radio.

## Archivos probables
- `apps/web/src/app/App.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/App.test.tsx`
- `apps/web/e2e/*.spec.ts`
- `services/api/geoops_api/config.py`
- `.env.example`
- `Makefile`
- `docs/design/GEOOPS_UI_QUALITY_RULES.md`
- `docs/09-INTERFAZ-Y-VISUALIZACION.md`
- `docs/11-ESTADO-DEL-PROYECTO.md`
- `docs/12-ERRORES-Y-SOLUCIONES.md`

## Dependencias
- `lucide-react`: iconografía consistente para controles y navegación. Alternativa: SVG manuales; coste: dependencia frontend pequeña; uso inmediato en rail, tabs y paneles.

## Riesgos silenciosos
- Datos existentes pero ocultos por filtros o viewport.
- Puerto Vite alternativo bloqueado por CORS.
- Tooltips que tapen controles críticos.
- Scroll global accidental en desktop o mobile.
- Estado URL que borre selección o cámara.

## Plan
1. Crear rama y registrar tarea activa.
2. Corregir CORS/dev y mensajes de error locales.
3. Añadir rail colapsable con iconos, badges y tooltips.
4. Pulir tabs, filtros, capas y estados vacíos.
5. Centralizar tokens CSS y controles visuales.
6. Documentar reglas de calidad UI.
7. Añadir/actualizar pruebas unitarias y E2E.
8. Ejecutar validación completa y capturas.
9. Crear commits, push y PR draft.

## Pruebas
- `make lint`
- `make typecheck`
- `make test`
- `make build`
- `make e2e`
- `make check`
- `make demo`

## Criterios de aceptación
- [x] `make demo && make dev` muestra datos en la URL impresa por Vite.
- [x] Vite en puertos `5173-5179` puede llamar a la API local.
- [x] Rail colapsable/expandible con tooltips y badges.
- [x] Tabs principales y de detalle mantienen estado y URL.
- [x] Filtros/capas usan controles diseñados y estados vacíos accionables.
- [x] La ficha, lista, leyenda y mapa/fallback se ven como consola operacional.
- [x] Pruebas y E2E cubren navegación, tabs, datos, alertas y mobile.
- [x] Hay capturas desktop/mobile.
- [x] Documentación actualizada.

## Documentación
- [x] `docs/design/GEOOPS_UI_QUALITY_RULES.md`
- [x] `docs/09-INTERFAZ-Y-VISUALIZACION.md`
- [x] `docs/11-ESTADO-DEL-PROYECTO.md`
- [x] `docs/12-ERRORES-Y-SOLUCIONES.md`

## Resultado
Completado en rama `codex/geoops-ui-quality-system-pass`.

Validacion final:

- `docker compose config`
- PostGIS `healthy`
- `/health` 200
- `/ready` 200
- `/v1/operations/summary` con 2 eventos demo
- `make lint`
- `make typecheck`
- `make test`
- `make build`
- `make e2e`
- `make check`
- `make demo`

Riesgos vivos:

- El build conserva warning de chunk grande por MapLibre.
- Playwright muestra avisos `NO_COLOR` ignorado por `FORCE_COLOR`.
- No se declara paridad final wildfire: quedan fuera gazetteer IGN, filtros sensor/confianza/origen y suite equivalente al visor original.
