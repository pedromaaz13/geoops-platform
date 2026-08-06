# 15 · Diseño de consola

Maqueta de referencia: `apps/web/public/geoops-ui-target.html`

Dirección: **la densidad y la anatomía de Disaster Ninja (Kontur), sobre la
paleta oscura de Palantir Blueprint.** Kontur va sobre blanco; GeoOps va sobre
oscuro, porque el mapa es el protagonista y el basemap oscuro deja que el dato
brille.

Normativo para todo trabajo de UI. Cuando la maqueta y este documento discrepen,
manda el documento: la maqueta está en JS plano con datos sintéticos y sus
valores de color no son los de producción.

---

## 1. Tokens

Los de `apps/web/src/styles.css`, ya en `main`. **Son los únicos válidos.** No
se declaran colores fuera de ese bloque ni se usan literales hexadecimales en
componentes.

| Uso | Token |
|---|---|
| Fondo del lienzo | `--ground` `#111418` |
| Paneles | `--surface-1` `#1c2127` |
| Hover y estado activo | `--surface-2` `#252a31` |
| Controles elevados | `--surface-3` `#2f343c` |
| Paneles sobre mapa | `--surface-glass` |
| Separadores | `--line` `#383e47` · `--line-soft` |
| Texto primario | `--ink` `#f6f7f9` |
| Texto secundario | `--muted` `#abb3bf` |
| Etiquetas y marcas de tiempo | `--muted-2` `#738091` |
| Acción, foco, chat | `--primary` `#4c90f0` |
| Severidad 1 → 4 | `--fire-low` · `--fire-medium` · `--fire-high` · `--fire-extreme` |
| Estado de fuente | `--ok` · `--warn` · `--bad` · `--unknown` |

Radios `--radius-xs/sm/md` (2/3/4 px). Nada más redondeado que 4 px salvo el
botón de chat. Sombra sólo en paneles flotantes sobre el mapa
(`--shadow-panel`); los paneles laterales se separan con línea, no con sombra.

**Tipografía.** IBM Plex Sans para prosa y etiquetas, IBM Plex Mono (`--mono`)
para toda cifra, identificador, marca de tiempo y unidad. Cualquier número lleva
`font-variant-numeric: tabular-nums`, para que las columnas no bailen al cambiar
el dato.

Escala: 9 / 10 / 10,5 / 11,5 / 12 / 13 px. Nada por encima de 13 px salvo las
cifras de titular en la ficha de evento. Es una herramienta de trabajo, no una
landing.

---

## 2. Rejilla

```
44px      340px            1fr              296px
┌────┬────────────────┬──────────────────┬──────────────┐
│    │                │                  │              │  44px  barra superior
│ ic │  Eventos       │      MAPA        │   Capas      │
│ on │  en curso      │                  │   Leyenda    │
│ os │                │  ┌ línea temporal│              │
└────┴────────────────┴──────────────────┴──────────────┘
```

- Los dos paneles laterales son colapsables. El mapa nunca lo es.
- Por debajo de 1280 px el panel de capas pasa a cajón sobre el mapa.
- Por debajo de 900 px la lista de eventos pasa a hoja inferior arrastrable.

---

## 3. Anatomía de la tarjeta de evento

Es el componente que más se repite y el que fija la sensación de densidad.
Máximo **68 px de alto**. En 1920×1080 deben verse diez eventos o más sin
desplazar.

```
┌────────────────────────────────────────────────┐
│ Incendio Cortegana  ▰▰▰▰▱  [NUEVO]             │  12px semibold + severidad
│ Huelva · INFOCA · activo                       │  10,5px muted, elipsis
│ ⚇ 64.200   ⬡ 640 km²   ⌂ 13                    │  10px mono + iconos
│ actualizado hace 2 h · INFOCA + VIIRS          │  9px muted-2, elipsis
└────────────────────────────────────────────────┘
```

- Severidad: cinco barras inclinadas de 8×4 px, coloreadas con la escala
  `--fire-*`. Es el patrón de Disaster Ninja y funciona mejor que un texto,
  porque se compara de un vistazo entre filas.
- Métricas con icono, no con etiqueta escrita: población expuesta, superficie,
  activos del cliente en radio.
- Todo se trunca con elipsis. Ninguna fila salta de línea: la altura irregular
  destruye la lectura en vertical.
- Seleccionada: fondo `--surface-2` y borde izquierdo de 2 px en
  `--fire-high`. Sin sombra ni escalado.

---

## 4. El mapa

**Prohibido:**
- Halos, auras o círculos difuminados estáticos bajo los marcadores. Se probó y
  se retiró: leían como ruido rojo permanente.
- Marcas de agua, logotipos o cualquier elemento flotante en el centro. El
  centro es para el dato. La atribución va en esquina, a 9 px.
- Celdas de la malla sin población. No se pintan. Los huecos son información.

**Obligatorio:**
- Marcador de evento: círculo pequeño con borde del color del lienzo. El radio
  lo dicta la severidad, entre 3,5 y 7 px. El estilo no aporta tamaño.
- Geometría no puntual: capas `fill` y `line` filtradas por `geometry-type`, con
  trazo discontinuo para áreas de exposición y continuo para geometría medida.
- El contorno de alerta sobre la malla sólo por encima del umbral alto y con
  opacidad ≤ 0,3.
- Basemap por defecto oscuro sin etiquetas, opacidad ≈ 0,4 y saturación
  negativa. El basemap es contexto, no contenido.
- El `ResizeObserver` de `OperationsMap` se conserva: sin él el canvas queda
  recortado cuando el contenedor no tiene su alto final al inicializar.

---

## 5. Panel de capas

Se genera desde `registries/layers.ts`. **Añadir una fuente nueva no debe tocar
JSX.** El registro define: grupo, etiqueta, tipo de control (casilla o radio),
capas de MapLibre asociadas, leyenda y contador.

Grupos: `Riesgo` (eventos, exposición, avisos, activos), `Analítica` (capas
bivariantes, excluyentes entre sí), `Base` (basemaps, excluyentes).

Cada fila lleva contador con el número de objetos visibles. Si está truncado por
paginación, lo dice — `AGENTS.md §10.1`.

---

## 6. Leyenda bivariante

Matriz 3×3. Eje horizontal población, eje vertical exposición. El color mezcla
`--primary` sobre el eje de población y `--fire-high` sobre el de exposición,
partiendo de `--surface-1`. Celdas interactivas: al pasar por encima se resalta
esa clase en el mapa.

Debajo, una frase explicando qué significa una celda vacía. Sin esa frase la
leyenda parece un adorno.

---

## 7. Movimiento

Regla única: **si algo se mueve, es porque el dato cambió.**

- Línea temporal de 72 h con reproducción, alimentada por `EventRevision`. Es
  reproducción del histórico real, no una animación decorativa.
- El punto de "ingesta en vivo" parpadea sólo mientras la fuente está fresca; si
  está `stale`, se queda fijo y pasa a `--warn`.
- Transiciones de cámara con `flyTo`, 900 ms máximo.
- Sin animaciones de entrada, sin parallax, sin esqueletos animados de más de un
  segundo.
- `prefers-reduced-motion: reduce` desactiva todo lo anterior.

---

## 8. Lo que ya está bien y no se toca

- `friendlyLoadError()`: traduce `Failed to fetch` a causa accionable.
- El fallback declarado cuando fallan las teselas.
- El `ResizeObserver` de `OperationsMap`.
- Los `registries/`.
- El bloque de tokens de `styles.css`.

Sobreviven a la refactorización sin cambios de comportamiento.

---

## 9. Criterio de aceptación visual

Una pantalla está terminada cuando:

1. Se ven diez o más eventos sin desplazar, en 1920×1080.
2. Ninguna cifra se calcula en el cliente: todas vienen de la API.
3. Si la vista muestra menos objetos de los que existen, la interfaz lo dice.
4. Nada se mueve sin que haya cambiado un dato.
5. Con `make demo` y con la base vacía, la pantalla es legible y explica por qué
   no hay datos (matriz de escenarios de `AGENTS.md §8.2`).
6. No hay un solo literal hexadecimal fuera de `styles.css`.
