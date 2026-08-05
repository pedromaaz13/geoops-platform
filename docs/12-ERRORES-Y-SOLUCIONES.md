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
