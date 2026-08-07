import { useEffect, useMemo, useRef, useState } from 'react';
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';

import { layerRegistry, type LayerId } from '../../registries/layers';
import type { AssetDto, EventFeature, ImpactDto } from '../../types';

// Paleta de severidad reutilizada por punto, área y línea: evita duplicar
// literales de color al añadir las capas fill/line (cero hex nuevo).
const eventSeverityColor: ExpressionSpecification = [
  'match',
  ['get', 'severity'],
  'extrema',
  '#E7354F',
  'alta',
  '#FF5C35',
  'media',
  '#FF9E2C',
  'baja',
  '#FFD24A',
  '#718398',
];

interface OperationsMapProps {
  events: EventFeature[];
  assets: AssetDto[];
  impacts: ImpactDto[];
  selectedEventId: string | null;
  visibleLayers: Record<LayerId, boolean>;
  basemap: 'voyager' | 'dark' | 'light' | 'satellite';
  focusCoordinates: [number, number] | null;
  onSelectEvent: (eventId: string) => void;
  onBoundsChange: (bounds: [number, number, number, number] | null) => void;
}

function eventsCollection(events: EventFeature[], selectedEventId: string | null) {
  return {
    type: 'FeatureCollection' as const,
    features: events.map((event) => ({
      ...event,
      properties: {
        ...event.properties,
        selected: event.properties.id === selectedEventId,
      },
    })),
  };
}

function assetsCollection(assets: AssetDto[]) {
  return {
    type: 'FeatureCollection' as const,
    features: assets.map((asset) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [asset.longitude, asset.latitude] },
      properties: { id: asset.id, name: asset.name, criticality: asset.criticality, type: asset.asset_type },
    })),
  };
}

function impactsCollection(events: EventFeature[], assets: AssetDto[], impacts: ImpactDto[]) {
  return {
    type: 'FeatureCollection' as const,
    features: impacts.flatMap((impact) => {
      const event = events.find((candidate) => candidate.properties.id === impact.event_id);
      const asset = assets.find((candidate) => candidate.id === impact.asset_id);
      if (!event || !asset) return [];
      return [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [event.properties.representative_point.coordinates, [asset.longitude, asset.latitude]],
          },
          properties: {
            id: impact.id,
            distance_m: impact.distance_m,
            score: impact.score,
          },
        },
      ];
    }),
  };
}

type MutableGeoJsonSource = {
  setData: (data: Parameters<GeoJSONSource['setData']>[0]) => void;
};

function hasSetData(source: unknown): source is MutableGeoJsonSource {
  return typeof (source as { setData?: unknown } | undefined)?.setData === 'function';
}

function setSourceData(map: MapLibreMap | null, sourceId: string, data: Parameters<GeoJSONSource['setData']>[0]) {
  const source = map?.getSource(sourceId);
  if (hasSetData(source)) {
    source.setData(data);
  }
}

export function OperationsMap({
  events,
  assets,
  impacts,
  selectedEventId,
  visibleLayers,
  basemap,
  focusCoordinates,
  onSelectEvent,
  onBoundsChange,
}: OperationsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapStatus, setMapStatus] = useState(
    import.meta.env.MODE === 'test' ? 'Mapa omitido en tests unitarios' : 'Inicializando mapa',
  );
  const eventData = useMemo(() => eventsCollection(events, selectedEventId), [events, selectedEventId]);
  const assetData = useMemo(() => assetsCollection(assets), [assets]);
  const impactData = useMemo(() => impactsCollection(events, assets, impacts), [assets, events, impacts]);

  useEffect(() => {
    if (import.meta.env.MODE === 'test' || !containerRef.current) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | undefined;

    async function createMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (!containerRef.current || disposed) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          center: events[0]?.properties.representative_point.coordinates ?? [-3.7, 40.4],
          zoom: events.length ? 6 : 4,
          attributionControl: { compact: true },
          style: {
            version: 8,
            sources: {
              voyager: {
                type: 'raster',
                tiles: [
                  'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                  'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                  'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                ],
                tileSize: 256,
                attribution: 'OpenStreetMap contributors, CARTO',
              },
              dark: {
                type: 'raster',
                tiles: [
                  'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                  'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                  'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                ],
                tileSize: 256,
                attribution: 'OpenStreetMap contributors, CARTO',
              },
              light: {
                type: 'raster',
                tiles: [
                  'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                  'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                  'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
                ],
                tileSize: 256,
                attribution: 'OpenStreetMap contributors, CARTO',
              },
              satellite: {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: 'Esri, Maxar, Earthstar Geographics',
              },
              events: { type: 'geojson', data: eventData },
              assets: { type: 'geojson', data: assetData },
              impacts: { type: 'geojson', data: impactData },
            },
            layers: [
              { id: 'background', type: 'background', paint: { 'background-color': '#07101A' } },
              { id: 'basemap-voyager', type: 'raster', source: 'voyager', paint: { 'raster-opacity': 1 } },
              { id: 'basemap-dark', type: 'raster', source: 'dark', layout: { visibility: 'none' }, paint: { 'raster-opacity': 1, 'raster-saturation': -0.2 } },
              { id: 'basemap-light', type: 'raster', source: 'light', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9 } },
              { id: 'basemap-satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.82 } },
              {
                id: 'uncertainty',
                type: 'circle',
                source: 'events',
                paint: {
                  'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 8, 26, 12, 58],
                  'circle-color': '#FF9E2C',
                  'circle-opacity': 0.14,
                  'circle-stroke-color': '#FFD24A',
                  'circle-stroke-opacity': 0.45,
                  'circle-stroke-width': 1,
                },
              },
              {
                id: 'impacts',
                type: 'line',
                source: 'impacts',
                paint: {
                  'line-color': '#2CC7D4',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 10, 3],
                  'line-opacity': 0.82,
                  'line-dasharray': [1.5, 1.2],
                },
              },
              {
                id: 'assets',
                type: 'circle',
                source: 'assets',
                paint: {
                  'circle-radius': ['case', ['==', ['get', 'criticality'], 'high'], 6, 5],
                  'circle-color': '#2CC7D4',
                  'circle-stroke-color': '#F2F6FA',
                  'circle-stroke-width': 2,
                },
              },
              {
                // Eventos con área (polígono): un evento no puntual no debe desaparecer.
                id: 'event-areas',
                type: 'fill',
                source: 'events',
                filter: ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false],
                paint: {
                  'fill-color': eventSeverityColor,
                  'fill-opacity': 0.22,
                  'fill-outline-color': eventSeverityColor,
                },
              },
              {
                // Eventos lineales (cortes, tramos): línea con el color de severidad.
                id: 'event-lines',
                type: 'line',
                source: 'events',
                filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
                paint: {
                  'line-color': eventSeverityColor,
                  'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.6, 10, 3.4],
                  'line-opacity': 0.9,
                },
              },
              {
                id: 'events',
                type: 'circle',
                source: 'events',
                filter: ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false],
                paint: {
                  'circle-radius': ['case', ['boolean', ['get', 'selected'], false], 11, 7],
                  'circle-color': eventSeverityColor,
                  'circle-stroke-color': ['case', ['boolean', ['get', 'selected'], false], '#F2F6FA', '#07101A'],
                  'circle-stroke-width': ['case', ['boolean', ['get', 'selected'], false], 3, 1.5],
                },
              },
              {
                id: 'event-labels',
                type: 'symbol',
                source: 'events',
                minzoom: 7,
                layout: {
                  'text-field': ['get', 'title'],
                  'text-size': 11,
                  'text-offset': [0, 1.35],
                  'text-anchor': 'top',
                },
                paint: {
                  'text-color': '#F2F6FA',
                  'text-halo-color': '#07101A',
                  'text-halo-width': 1.5,
                },
              },
            ],
          },
        });

        mapRef.current = map;
        // MapLibre fija el tamaño del canvas al crear el mapa; si el contenedor aún
        // no tenía su alto final, el mapa queda recortado. Observamos el contenedor y
        // resincronizamos con map.resize() en cada cambio de tamaño.
        resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(containerRef.current);
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
        map.on('load', () => {
          setSourceData(map, 'events', eventData);
          setSourceData(map, 'assets', assetData);
          setSourceData(map, 'impacts', impactData);
          for (const id of ['voyager', 'dark', 'light', 'satellite'] as const) {
            map.setLayoutProperty(`basemap-${id}`, 'visibility', id === basemap ? 'visible' : 'none');
          }
          for (const definition of layerRegistry) {
            if (map.getLayer(definition.id)) {
              map.setLayoutProperty(definition.id, 'visibility', visibleLayers[definition.id] ? 'visible' : 'none');
            }
          }
          setMapStatus('Mapa operativo');
          if (events.length > 1) {
            const bounds = new maplibregl.LngLatBounds(events[0].properties.representative_point.coordinates, events[0].properties.representative_point.coordinates);
            events.slice(1).forEach((event) => bounds.extend(event.properties.representative_point.coordinates));
            map.fitBounds(bounds, { padding: 72, maxZoom: 8, duration: 0 });
          }
        });
        map.on('click', 'events', (event) => {
          const id = event.features?.[0]?.properties?.id as string | undefined;
          if (id) onSelectEvent(id);
        });
        map.on('moveend', () => {
          const bounds = map.getBounds();
          onBoundsChange([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
        });
      } catch (error) {
        setMapStatus(`Fallo de mapa: ${error instanceof Error ? error.message : 'desconocido'}`);
        onBoundsChange(null);
      }
    }

    void createMap();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // El mapa se inicializa una sola vez; datos, capas, seleccion y camara se sincronizan con efectos separados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSourceData(mapRef.current, 'events', eventData);
  }, [eventData]);

  useEffect(() => {
    setSourceData(mapRef.current, 'assets', assetData);
  }, [assetData]);

  useEffect(() => {
    setSourceData(mapRef.current, 'impacts', impactData);
  }, [impactData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const definition of layerRegistry) {
      if (map.getLayer(definition.id)) {
        map.setLayoutProperty(definition.id, 'visibility', visibleLayers[definition.id] ? 'visible' : 'none');
      }
    }
  }, [visibleLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const id of ['dark', 'light', 'satellite'] as const) {
      map.setLayoutProperty(`basemap-${id}`, 'visibility', id === basemap ? 'visible' : 'none');
    }
  }, [basemap]);

  useEffect(() => {
    if (!focusCoordinates || !mapRef.current) return;
    mapRef.current.flyTo({ center: focusCoordinates, zoom: Math.max(mapRef.current.getZoom(), 8), essential: true });
  }, [focusCoordinates]);

  const isMapReady = mapStatus === 'Mapa operativo';

  return (
    <section className={isMapReady ? 'map-workspace ready' : 'map-workspace'} aria-label="Mapa operacional">
      <div ref={containerRef} className="map-canvas" role="img" aria-label={mapStatus} />
      <div className="fallback-map-grid" aria-hidden="true" />
      <div className="fallback-markers" aria-hidden="true">
        {events.map((event) => (
          <span
            className={event.properties.id === selectedEventId ? 'fallback-event selected' : 'fallback-event'}
            key={event.properties.id}
            style={{
              left: `${((event.properties.representative_point.coordinates[0] + 10) / 14) * 100}%`,
              top: `${(1 - (event.properties.representative_point.coordinates[1] - 35) / 8) * 100}%`,
            }}
          />
        ))}
        {assets.map((asset) => (
          <span
            className="fallback-asset"
            key={asset.id}
            style={{
              left: `${((asset.longitude + 10) / 14) * 100}%`,
              top: `${(1 - (asset.latitude - 35) / 8) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="map-status" aria-live="polite">{mapStatus}</div>
      <div className="map-crosshair" aria-hidden="true" />
    </section>
  );
}
