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

    async function loadMap() {
      try {
        const maplibregl = await import('maplibre-gl');
        await import('maplibre-gl/dist/maplibre-gl.css');
        if (disposed) return;
        map = new maplibregl.Map({
          container: mapContainerId,
          style: {
            version: 8,
            sources: {},
            layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e8efec' } }],
          },
          center: events[0]?.geometry.coordinates ?? [-3.7, 40.4],
          zoom: events.length ? 6 : 4,
          attributionControl: false,
        });
        map.on('load', () => {
          if (!map) return;
          map.addSource('events', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: events },
          });
          map.addLayer({
            id: 'event-uncertainty',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 10, 22],
              'circle-color': '#d95f02',
              'circle-opacity': 0.16,
              'circle-stroke-color': '#d95f02',
              'circle-stroke-width': 1,
            },
          });
          map.addLayer({
            id: 'events',
            type: 'circle',
            source: 'events',
            paint: {
              'circle-radius': ['case', ['==', ['get', 'id'], selectedEventId ?? ''], 9, 6],
              'circle-color': ['case', ['==', ['get', 'status'], 'activo'], '#c62828', '#5f6b73'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2,
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
          setMapStatus('Mapa operativo');
        });
      } catch (error) {
        setMapStatus(`Fallo de mapa: ${error instanceof Error ? error.message : 'desconocido'}`);
      }
    }

    void loadMap();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [assets, events, onSelect, selectedEventId]);

  return (
    <section className="map-panel" aria-label="Mapa operacional">
      <div id={mapContainerId} className="map-canvas" role="img" aria-label={mapStatus} />
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
          <h1>Operations</h1>
        </div>
        <SourceHealthIndicator sources={sources} />
      </header>

      {status === 'error' && <div className="banner error">No se pudo cargar la API: {error}</div>}
      {status === 'empty' && <div className="banner">No hay eventos wildfire en el bbox inicial.</div>}

      <section className="workspace">
        <aside className="event-list-panel" aria-label="Lista de eventos">
          <div className="panel-header">
            <h2>Eventos</h2>
            <span>{events.length}</span>
          </div>
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
        </aside>

        <MapPanel events={events} assets={assets} selectedEventId={selectedId} onSelect={setSelectedId} />

        <aside className="detail-panel" aria-label="Detalle del evento">
          <h2>{detail?.properties.title ?? selected?.properties.title ?? 'Sin selección'}</h2>
          {detail && (
            <>
              <section>
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
              <section>
                <h3>Evidencias</h3>
                {observations.map((obs) => (
                  <p key={obs.id}>
                    {obs.source_id}: observed_at {formatDate(obs.observed_at)} · ingested_at {formatDate(obs.ingested_at)}
                  </p>
                ))}
              </section>
              <section>
                <h3>Impactos</h3>
                {impacts.length === 0 ? <p>Sin activos cruzados todavía.</p> : impacts.map((impact) => (
                  <p key={impact.id}>{impact.asset_name}: {formatMeters(impact.distance_m)} · {impact.reasons[0]}</p>
                ))}
              </section>
              <section>
                <h3>Fuentes</h3>
                <p>{detail.properties.sources.join(', ') || 'sin fuentes'}</p>
              </section>
            </>
          )}
        </aside>
      </section>

      <section className="tools-band">
        <form className="tool-panel" onSubmit={(event) => { void handleCreateAsset(event); }}>
          <h2>Activo puntual</h2>
          <input name="name" placeholder="Nombre" required />
          <input name="asset_type" placeholder="Tipo" defaultValue="camping" required />
          <input name="longitude" placeholder="Longitud" type="number" step="0.000001" required />
          <input name="latitude" placeholder="Latitud" type="number" step="0.000001" required />
          <select name="criticality" defaultValue="high">
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
          <button type="submit">Crear activo</button>
          {assets.map((asset) => (
            <div className="asset-row" key={asset.id}>
              <span>{asset.name}</span>
              <button type="button" onClick={() => void deleteAsset(asset.id).then(reload)}>Borrar</button>
            </div>
          ))}
        </form>

        <form className="tool-panel" onSubmit={(event) => { void handleCreateRule(event); }}>
          <h2>Regla de proximidad</h2>
          <input name="name" placeholder="Nombre" defaultValue="Wildfire near asset" required />
          <select name="asset_id" required>
            <option value="">Selecciona activo</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
          </select>
          <input name="distance_threshold_m" placeholder="Umbral m" type="number" defaultValue="50000" required />
          <button type="submit">Crear regla</button>
        </form>

        <section className="tool-panel" aria-label="Alertas">
          <h2>Alertas abiertas</h2>
          <p>{openAlerts.length} abiertas</p>
          {alerts.map((alert) => (
            <article className="alert-row" key={alert.id}>
              <strong>{alert.status}</strong>
              <p>{alert.message}</p>
              {alert.status === 'open' && (
                <button type="button" onClick={() => void acknowledgeAlert(alert.id).then(reload)}>
                  Reconocer
                </button>
              )}
            </article>
          ))}
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
