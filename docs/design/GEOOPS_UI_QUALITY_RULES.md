# GeoOps UI Quality Rules

Estas reglas guian la consola operacional GeoOps a partir de GEO-UI-003.

## Principios

1. La pantalla principal es una consola de control, no una landing page.
2. El mapa es la superficie protagonista; paneles y fichas flotan sobre el trabajo, no lo sustituyen.
3. No debe existir scroll global en desktop ni mobile. Solo pueden desplazarse listas, fichas y paneles concretos.
4. Toda cifra operacional debe conservar fuente, precision o latencia cuando el dato exista.
5. Los estados degradados se muestran con lenguaje accionable: API no accesible, CORS, sin datos o ejecuta `make demo`.
6. No se inventan capas, fuentes, sensores ni capacidades futuras.

## Layout

- Top bar: marca, tabs de workspace y metric strip compacto.
- Rail izquierdo: colapsable, icon-only o expandido, con estado activo, badge y tooltip.
- Panel contextual: herramientas del workspace activo.
- Mapa: area central de trabajo, con fallback honesto si tiles o WebGL fallan.
- Lista derecha: eventos visibles y accionables; oculta en pantallas estrechas.
- Ficha de evento: panel flotante profesional con tabs internas.

## Navegacion

- Entradas del rail: Home, Operaciones, Fuentes, Activos, Alertas, Capas, Analisis, Configuracion.
- Tabs superiores: Operaciones, Fuentes, Activos, Alertas, Analisis.
- Tabs de ficha: Resumen, Evidencias, Evolucion, Impactos, Fuentes.
- La URL refleja panel y tab principal cuando se apartan del valor por defecto.
- Cambiar tabs no debe borrar evento seleccionado ni camara del mapa.

## Visual System

- Oscuro operacional por defecto, con contraste alto y pocos radios.
- Radios: 4-8 px. No usar tarjetas redondeadas grandes.
- Bordes: lineas frías sutiles; estado activo azul; warning amarillo; fallo rojo; ok verde.
- Sombras solo para paneles flotantes, tooltips y overlays.
- No usar degradados decorativos dominantes ni fondos de marketing.
- Tipografia densa, sin escalado por viewport ni letter spacing negativo.

## Controles

- Iconos: `lucide-react` para rail, acciones y encabezados.
- Selects: shell visual propio con `appearance: none`.
- Booleanos: switches compactos, no checkbox nativo visible.
- Tabs: foco teclado, `aria-selected`, estado activo visible.
- Tooltips: hover/focus, delay corto, cierre con Escape, sin tapar el dato principal.

## Estados

- Sin datos: explicar `make demo`.
- Filtros sin resultado: mostrar boton para limpiar filtros.
- API no accesible: mencionar API local y puerto.
- CORS: mencionar puertos Vite permitidos.
- Fuente degradada: distinguir `success`, `partial`, `stale`, `failed`, `disabled` y `demo` cuando aplique.

## Validacion

Cada cambio de interfaz debe aportar:

- prueba React para el comportamiento nuevo;
- E2E si afecta a navegacion o flujo operativo;
- captura desktop y mobile si cambia layout visible;
- ejecucion de `make lint`, `make typecheck`, `make test`, `make build`, `make e2e` y `make check` antes de declarar cierre.
