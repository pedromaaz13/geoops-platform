# Errores y soluciones

Registra fallos relevantes, especialmente los que no producen una excepción
clara.

---

## Lecciones heredadas del visor

### Un 404 o vacío no significa ausencia de eventos

Una fuente mal configurada puede hacer creer que no ocurre nada.

**Regla:** distinguir `failed`, `empty` y `stale`.

### La hora de ejecución no es la hora del dato

Un pipeline recién ejecutado puede publicar observaciones antiguas.

**Regla:** mostrar `observed_at` e `ingested_at`.

### Una coordenada vacía puede convertirse en cero

Conversión numérica permisiva puede crear un punto `(0, 0)`.

**Regla:** validar texto antes de convertir.

### Un estado no puede inventarse

“Detectado recientemente” no equivale a “activo”.

**Regla:** estado nulo sin fuente.

### La UI puede fallar sin lanzar error

CSS inválido o una capa MapLibre no montada pueden pasar desapercibidos.

**Regla:** probar estilos calculados, posición y presencia real de capas.

### Un mapa "operativo" puede verse vacío

MapLibre puede inicializar sin excepción mientras los tiles o WebGL no pintan
como se espera en una captura o navegador concreto.

**Regla:** el estado del mapa no basta; debe existir evidencia visual de eventos
y activos. En `GEO-UI-002` se añade un overlay de fallback con coordenadas reales
para que el usuario no vea una superficie muda si falla el render principal.

### Vite puede cambiar de puerto y romper CORS

Si `5173` esta ocupado, Vite puede arrancar en `5174` u otro puerto cercano. Si
la API solo permite `5173`, el navegador muestra fallo de carga aunque FastAPI y
PostGIS esten vivos.

**Regla:** el entorno local debe permitir explicitamente los puertos Vite
soportados o fallar con mensaje claro. En `GEO-UI-003` se permiten
`127.0.0.1`/`localhost` en `5173-5179` y la UI distingue API no accesible, CORS,
sin datos y demo no sembrada.

### Los E2E pueden usar un build viejo

Un servidor reutilizado puede validar código anterior.

**Regla:** controlar lifecycle y versión del build.

### Una publicación puede mezclar runs

Ficheros mutables publicados secuencialmente pueden quedar incoherentes.

**Regla:** runs inmutables y puntero/manifiesto final.

---

## Plantilla

```markdown
## Título

### Síntoma

### Impacto

### Por qué era silencioso

### Causa

### Solución

### Prueba de regresión

### Regla general

### Referencias
```
