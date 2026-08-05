# Fuentes y adaptadores

## Estado MVP wildfire

La única fuente conectada es `wildfire-public`, con fixture reproducible y URL
configurable. Su documentación vive en `docs/sources/wildfire-public-feed.md`.
La ingesta se ejecuta manualmente con `geoops-ingestion wildfire-public`; no
existe scheduler ni scraping.

Verificado contra `main@c1fcb83` el 2026-08-06. La implementación de descarga,
validación, normalización y reconciliación wildfire está reunida en
`services/api/geoops_api/wildfire_ingest.py`; la CLI de `services/ingestion` la
invoca. No existen todavía adapters y normalizers como paquetes separados.

---

Cada fuente es un producto de datos con contrato, limitaciones, licencia y
comportamiento operativo. No es solo una URL.

---

## 1. Estructura

### Previsto, no implementado — 2026-08-06

La siguiente es la estructura requerida para una fuente nueva, no la estructura
de la única fuente actual:

```text
adapters/<source_id>.py
normalizers/<source_id>.py
tests/fixtures/<source_id>/
docs/sources/<source_id>.md
```

## 2. Documento obligatorio de fuente

```markdown
# Fuente

## Organismo
## Finalidad
## Endpoint
## Autenticación
## Licencia y términos
## Frecuencia
## Formato
## Identificador
## Tiempos
## Geometría
## Precisión
## Estados
## Paginación
## Límites
## Respuesta vacía
## Errores observados
## Payload de ejemplo
## Riesgos
```

## 3. Contrato del adaptador

### Previsto, no implementado — 2026-08-06

`SourceAdapter` no existe hoy como `Protocol`. Se conserva este contrato como
frontera objetivo:

```python
class SourceAdapter(Protocol):
    source_id: str
    async def fetch(self, context: FetchContext) -> SourcePayload: ...
```

No normaliza eventos.

## 4. Contrato del normalizador

### Previsto, no implementado — 2026-08-06

`ObservationNormalizer` no existe hoy como `Protocol`. La normalización wildfire
actual son funciones de `wildfire_ingest.py`:

```python
class ObservationNormalizer(Protocol):
    source_id: str
    def normalize(
        self,
        payload: SourcePayload,
    ) -> list[ObservationDraft]: ...
```

## 5. Estados de run

Estados persistidos actualmente en `SourceRun` por la ingesta wildfire:

- `success`: contenido válido con registros;
- `empty`: cero permitido y comprobable;
- `failed`: validación, descarga o salida vacía sospechosa rechazada.

La salud de fuente calculada por `/v1/sources/health` puede exponer además
`partial`, `stale` y `disabled`. `stale` compara por separado edad de descarga y
edad del dato con el TTL; no significa que exista un `SourceRun.status=stale`.

## 6. Fuentes iniciales

### Conectada actualmente

- feed público de incendios;

### Previsto, no implementado — 2026-08-06

Próximas candidatas, sujetas a verificación de endpoint, licencia y fixture:

- AEMET CAP;
- DGT DATEX II.

Otras candidatas:

- IGN terremotos;
- GDACS;
- Copernicus EMS;
- GloFAS;
- FIRMS global;
- EFFIS cuando sea estable;
- CAMS/Open-Meteo como contexto;
- OSM/Geofabrik para infraestructura;
- Natura 2000;
- CORINE/Copernicus Land.

## 7. Añadir una fuente

1. Confirmar legitimidad y licencia.
2. Obtener payload real.
3. Guardar fixture.
4. Documentar campos y tiempos.
5. Implementar adapter.
6. Implementar normalizer.
7. Añadir validaciones.
8. Registrar SourceRun.
9. Añadir reconciliador del dominio.
10. Añadir métricas y UI de salud.
11. Ejecutar pruebas.
12. Actualizar estado.

## 8. Regla de regresión

Cuando un payload rompe el parser:

```text
payload real
  ↓
fixture reducido
  ↓
test rojo
  ↓
fix
  ↓
suite verde
  ↓
ERRORES-Y-SOLUCIONES
```

## 9. Prohibiciones

- inventar endpoint;
- scraping no autorizado;
- llamar Overpass desde cada navegador;
- confundir 200 con contenido válido;
- tratar cero como ausencia sin contexto;
- usar hora de ingesta como hora del evento;
- ocultar una fuente degradada;
- asumir precisión no publicada.
