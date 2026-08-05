import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  acknowledgeAlert,
  createAlertRule,
  createAsset,
  deleteAsset,
  fetchAlerts,
  fetchAssets,
  fetchEventDetail,
  fetchEvents,
  fetchImpacts,
  fetchObservations,
  fetchSourcesHealth,
} from './api';
import type { AlertDto, AssetDto, EventFeature, ImpactDto, ObservationDto, SourceHealthDto } from './types';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'desconocido';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMeters(value: number | null | undefined): string {
  if (value == null) return 'sin precisión';
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

function formString(data: FormData, key: string, fallback = ''): string {
  const value = data.get(key);
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function formNumber(data: FormData, key: string): number {
  const value = data.get(key);
  return typeof value === 'string' ? Number(value) : Number.NaN;
}

interface MapPanelProps {
  events: EventFeature[];
  assets: AssetDto[];
  selectedEventId: string | null;
  onSelect: (eventId: string) => void;
}

function featureCollection(features: EventFeature[]) {
  return { type: 'FeatureCollection' as const, features };
}

function MapPanel({ events, assets, selectedEventId, onSelect }: MapPanelProps) {
  const [mapStatus, setMapStatus] = useState(
    import.meta.env.MODE === 'test' ? 'Mapa omitido en tests unitarios' : 'Inicializando mapa',
  );
  const mapContainerId = 'geoops-map';

  useEffect(() => {
    if (import.meta.env.MODE === 'test') {
      return;
    }

    let disposed = false;
    let map: import('maplibre-gl').Map | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function loadMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (disposed) return;
        map = new maplibregl.Map({
          container: mapContainerId,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors © CARTO',
              },
            },
            layers: [
              { id: 'background', type: 'background', paint: { 'background-color': '#dce7e2' } },
              { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.82 } },
            ],
          },
          center: events[0]?.geometry.coordinates ?? [-3.7, 40.4],
          zoom: events.length ? 6 : 4,
          attributionControl: { compact: true },
        });
        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(document.getElementById(mapContainerId) as HTMLElement);
        window.setTimeout(() => map?.resize(), 0);
        window.setTimeout(() => map?.resize(), 250);
        map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
        map.on('load', () => {
          if (!map) return;
          map.resize();
          map.addSource('events', {
            type: 'geojson',
            data: featureCollection(events),
          });
          map.addLayer({
            id: 'event-uncertainty',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 34],
              'circle-color': '#ef6c00',
              'circle-opacity': 0.18,
              'circle-stroke-color': '#ef6c00',
              'circle-stroke-width': 1,
            },
          });
          map.addLayer({
            id: 'events',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-radius': ['case', ['==', ['get', 'id'], selectedEventId ?? ''], 10, 7],
              'circle-color': ['case', ['==', ['get', 'status'], 'activo'], '#d7191c', '#6b7280'],
              'circle-stroke-color': '#fff7ed',
              'circle-stroke-width': ['case', ['==', ['get', 'id'], selectedEventId ?? ''], 4, 2],
            },
          });
          map.addLayer({
            id: 'event-labels',
            type: 'symbol',
            source: 'events',
            layout: {
              'text-field': ['get', 'title'],
              'text-size': 12,
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#111827',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.4,
            },
          });
          map.addSource('assets', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: assets.map((asset) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [asset.longitude, asset.latitude] },
                properties: { id: asset.id, name: asset.name },
              })),
            },
          });
          map.addLayer({
            id: 'assets',
            type: 'circle',
            source: 'assets',
            paint: {
              'circle-radius': 5,
              'circle-color': '#146c68',
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
            },
          });
          map.on('click', 'events', (event) => {
            const feature = event.features?.[0];
            const id = feature?.properties?.id as string | undefined;
            if (id) onSelect(id);
          });
          if (events.length > 1) {
            const bounds = new maplibregl.LngLatBounds(events[0].geometry.coordinates, events[0].geometry.coordinates);
            events.slice(1).forEach((event) => bounds.extend(event.geometry.coordinates));
            map.fitBounds(bounds, { padding: 90, maxZoom: 8, duration: 0 });
          }
          setMapStatus('Mapa operativo');
        });
      } catch (error) {
        setMapStatus(`Fallo de mapa: ${error instanceof Error ? error.message : 'desconocido'}`);
      }
    }

    void loadMap();
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      map?.remove();
    };
  }, [assets, events, onSelect, selectedEventId]);

  return (
    <section className="map-panel" aria-label="Mapa operacional">
      <div id={mapContainerId} className="map-canvas" role="img" aria-label={mapStatus} />
      <div className="map-toolbar" aria-label="Herramientas de mapa">
        <button type="button">Eventos</button>
        <button type="button">Activos</button>
        <button type="button">Fuentes</button>
      </div>
      <div className="map-legend" aria-label="Leyenda">
        <span><i className="legend-dot wildfire" /> Wildfire</span>
        <span><i className="legend-dot asset" /> Asset</span>
        <span><i className="legend-ring" /> Precisión</span>
      </div>
      <div className="map-status">{mapStatus}</div>
    </section>
  );
}

export function App() {
  const [events, setEvents] = useState<EventFeature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('event'));
  const [detail, setDetail] = useState<EventFeature | null>(null);
  const [observations, setObservations] = useState<ObservationDto[]>([]);
  const [impacts, setImpacts] = useState<ImpactDto[]>([]);
  const [sources, setSources] = useState<SourceHealthDto[]>([]);
  const [assets, setAssets] = useState<AssetDto[]>([]);
  const [alerts, setAlerts] = useState<AlertDto[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const selected = useMemo(() => events.find((event) => event.properties.id === selectedId) ?? null, [events, selectedId]);

  const reload = useCallback(async () => {
    try {
      const [collection, health, assetList, alertList] = await Promise.all([
        fetchEvents(),
        fetchSourcesHealth(),
        fetchAssets(),
        fetchAlerts(),
      ]);
      setEvents(collection.features);
      setSources(health);
      setAssets(assetList);
      setAlerts(alertList);
      const firstEventId = collection.features[0]?.properties.id ?? null;
      setSelectedId((current) => current ?? firstEventId);
      setStatus(collection.features.length ? 'ready' : 'empty');
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : 'Error desconocido');
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedId) params.set('event', selectedId);
    else params.delete('event');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    if (!selectedId) return;
    void Promise.all([fetchEventDetail(selectedId), fetchObservations(selectedId), fetchImpacts(selectedId)]).then(
      ([nextDetail, nextObservations, nextImpacts]) => {
        setDetail(nextDetail);
        setObservations(nextObservations);
        setImpacts(nextImpacts);
      },
    );
  }, [selectedId]);

  async function handleCreateAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await createAsset({
      name: formString(data, 'name'),
      asset_type: formString(data, 'asset_type', 'site'),
      longitude: formNumber(data, 'longitude'),
      latitude: formNumber(data, 'latitude'),
      criticality: formString(data, 'criticality', 'normal'),
    });
    form.reset();
    await reload();
  }

  async function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    await createAlertRule({
      name: formString(data, 'name'),
      event_type: 'wildfire',
      asset_id: formString(data, 'asset_id'),
      distance_threshold_m: formNumber(data, 'distance_threshold_m'),
      cooldown_minutes: 0,
    });
    form.reset();
    await reload();
  }

  const openAlerts = alerts.filter((alert) => alert.status === 'open');

  return (
    <main className="operations-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GeoOps Platform</p>
          <h1>Operations Console</h1>
        </div>
        <div className="topbar-metrics" aria-label="Resumen operacional">
          <span><strong>{events.length}</strong> eventos</span>
          <span><strong>{assets.length}</strong> activos</span>
          <span><strong>{openAlerts.length}</strong> alertas</span>
        </div>
        <SourceHealthIndicator sources={sources} />
      </header>

      {status === 'error' && <div className="banner error">No se pudo cargar la API: {error}</div>}
      {status === 'empty' && <div className="banner">No hay eventos wildfire en el bbox inicial.</div>}

      <section className="workspace">
        <aside className="event-list-panel" aria-label="Lista de eventos">
          <div className="panel-header">
            <div>
              <h2>Eventos</h2>
              <p>Wildfire · España</p>
            </div>
            <span>{events.length}</span>
          </div>
          <div className="event-list-scroll">
            {events.map((event) => (
              <button
                className={event.properties.id === selectedId ? 'event-row selected' : 'event-row'}
                key={event.properties.id}
                onClick={() => setSelectedId(event.properties.id)}
                type="button"
              >
                <strong>{event.properties.title}</strong>
                <span>{event.properties.status ?? 'estado desconocido'}</span>
                <span>{formatDate(event.properties.last_observed_at)} · {formatMeters(event.properties.precision_m)}</span>
              </button>
            ))}
          </div>
        </aside>

        <MapPanel events={events} assets={assets} selectedEventId={selectedId} onSelect={setSelectedId} />

        <aside className="detail-panel" aria-label="Detalle del evento">
          <div className="detail-header">
            <span className="panel-kicker">Ficha operacional</span>
            <h2>{detail?.properties.title ?? selected?.properties.title ?? 'Sin selección'}</h2>
          </div>
          {detail && (
            <div className="detail-scroll">
              <section className="detail-card">
                <h3>Resumen</h3>
                <dl>
                  <dt>Estado</dt>
                  <dd>{detail.properties.status ?? 'desconocido'}</dd>
                  <dt>Fuente del estado</dt>
                  <dd>{detail.properties.status_source_id ?? 'sin fuente oficial'}</dd>
                  <dt>Última observación</dt>
                  <dd>{formatDate(detail.properties.last_observed_at)}</dd>
                  <dt>Actualizado</dt>
                  <dd>{formatDate(detail.properties.updated_at)}</dd>
                  <dt>Precisión</dt>
                  <dd>{formatMeters(detail.properties.precision_m)}</dd>
                </dl>
              </section>
              <section className="detail-card">
                <h3>Evidencias</h3>
                {observations.map((obs) => (
                  <p key={obs.id}>
                    {obs.source_id}: observed_at {formatDate(obs.observed_at)} · ingested_at {formatDate(obs.ingested_at)}
                  </p>
                ))}
              </section>
              <section className="detail-card">
                <h3>Impactos</h3>
                {impacts.length === 0 ? <p>Sin activos cruzados todavía.</p> : impacts.map((impact) => (
                  <p key={impact.id}>{impact.asset_name}: {formatMeters(impact.distance_m)} · {impact.reasons[0]}</p>
                ))}
              </section>
              <section className="detail-card">
                <h3>Fuentes</h3>
                <p>{detail.properties.sources.join(', ') || 'sin fuentes'}</p>
              </section>
            </div>
          )}
        </aside>

        <section className="control-dock" aria-label="Herramientas operacionales">
          <form className="dock-card asset-tool" onSubmit={(event) => { void handleCreateAsset(event); }}>
            <h2>Activo puntual</h2>
            <div className="compact-form-grid">
              <input name="name" placeholder="Nombre" required />
              <input name="asset_type" placeholder="Tipo" defaultValue="camping" required />
              <input name="longitude" placeholder="Longitud" type="number" step="0.000001" required />
              <input name="latitude" placeholder="Latitud" type="number" step="0.000001" required />
              <select name="criticality" defaultValue="high">
                <option value="normal">normal</option>
                <option value="high">high</option>
              </select>
              <button aria-label="Crear activo" type="submit">Crear</button>
            </div>
            <div className="asset-strip">
              {assets.map((asset) => (
                <span className="asset-chip" key={asset.id}>
                  {asset.name}
                  <button type="button" onClick={() => void deleteAsset(asset.id).then(reload)}>×</button>
                </span>
              ))}
            </div>
          </form>

          <form className="dock-card rule-tool" onSubmit={(event) => { void handleCreateRule(event); }}>
            <h2>Regla</h2>
            <div className="compact-form-grid rule-grid">
              <input name="name" placeholder="Nombre" defaultValue="Wildfire near asset" required />
              <select name="asset_id" required>
                <option value="">Selecciona activo</option>
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
              </select>
              <input name="distance_threshold_m" placeholder="Umbral m" type="number" defaultValue="50000" required />
              <button type="submit">Crear regla</button>
            </div>
          </form>

          <section className="dock-card alert-tool" aria-label="Alertas">
            <h2>Alertas abiertas</h2>
            <strong>{openAlerts.length}</strong>
            <div className="alert-strip">
              {alerts.map((alert) => (
                <article className="alert-row" key={alert.id}>
                  <span>{alert.status}</span>
                  <p>{alert.message}</p>
                  {alert.status === 'open' && (
                    <button type="button" onClick={() => void acknowledgeAlert(alert.id).then(reload)}>
                      Reconocer
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function SourceHealthIndicator({ sources }: { sources: SourceHealthDto[] }) {
  const degraded = sources.filter((source) => source.last_run && source.last_run.status !== 'success');
  return (
    <div className={degraded.length ? 'source-health degraded' : 'source-health'}>
      <span>Fuentes</span>
      <strong>{degraded.length ? `${degraded.length} degradadas` : `${sources.length} OK`}</strong>
    </div>
  );
}
