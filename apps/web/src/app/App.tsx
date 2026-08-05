import { useEffect, useMemo, useState } from 'react';

import { OperationsMap } from '../features/map/OperationsMap';
import { useOperationsData } from '../hooks/useOperationsData';
import { asNumber, asText, formatAgeFromDate, formatAgeFromSeconds, formatDate, formatMeters } from '../lib/format';
import { layerRegistry, preparedFutureLayers, type LayerId } from '../registries/layers';
import { presentationFor } from '../registries/events';
import type {
  AlertDto,
  AssetDto,
  EventFeature,
  EventFilters,
  EventTimelineDto,
  ImpactDto,
  ObservationDto,
  OperationsSummaryDto,
  SourceHealthDto,
} from '../types';

type ActivePanel = 'overview' | 'sources' | 'layers' | 'assets' | 'alerts';
type DetailTab = 'summary' | 'evidence' | 'evolution' | 'impacts' | 'sources';
type Basemap = 'dark' | 'light' | 'satellite';

const emptyEvents: EventFeature[] = [];
const emptySources: SourceHealthDto[] = [];
const emptyAssets: AssetDto[] = [];
const emptyAlerts: AlertDto[] = [];
const emptyImpacts: ImpactDto[] = [];

const defaultFilters: EventFilters = {
  status: '',
  source: '',
  timeWindow: '24h',
  hasImpact: false,
  hasAlert: false,
};

const defaultLayers = Object.fromEntries(layerRegistry.map((layer) => [layer.id, layer.visibleByDefault])) as Record<
  LayerId,
  boolean
>;

function initialSelectedEvent(): string | null {
  return new URLSearchParams(window.location.search).get('event');
}

function initialFilters(): EventFilters {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get('status') ?? defaultFilters.status,
    source: params.get('source') ?? defaultFilters.source,
    timeWindow: (params.get('time') as EventFilters['timeWindow']) ?? defaultFilters.timeWindow,
    hasImpact: params.get('impact') === '1',
    hasAlert: params.get('alert') === '1',
  };
}

function initialLayers(): Record<LayerId, boolean> {
  const params = new URLSearchParams(window.location.search);
  const selected = params.get('layers');
  if (!selected) return defaultLayers;
  const enabled = new Set(selected.split(','));
  return Object.fromEntries(layerRegistry.map((layer) => [layer.id, enabled.has(layer.id)])) as Record<LayerId, boolean>;
}

function pointInside(bounds: [number, number, number, number] | null, event: EventFeature): boolean {
  if (!bounds) return true;
  const [west, south, east, north] = bounds;
  const [lon, lat] = event.geometry.coordinates;
  return lon >= west && lon <= east && lat >= south && lat <= north;
}

function eventSourceLabel(event: EventFeature): string {
  return event.properties.status_source_id ?? event.properties.sources[0] ?? 'fuente sin estado';
}

function statusClass(value: string | null | undefined): string {
  if (!value) return 'unknown';
  if (['success', 'ok', 'activo'].includes(value)) return 'ok';
  if (['partial', 'empty', 'stale', 'estabilizado', 'controlado'].includes(value)) return 'warn';
  if (['failed', 'error'].includes(value)) return 'bad';
  if (value === 'disabled') return 'unknown';
  return 'unknown';
}

function globalDegradation(summary: OperationsSummaryDto | undefined, sources: SourceHealthDto[]) {
  const degradedSources = sources.filter((source) => statusClass(source.freshness_status ?? source.last_run?.status) !== 'ok');
  if (summary?.manifest.demo) {
    return {
      tone: 'warn',
      title: 'Datos demo',
      message: summary.manifest.demo_reason ?? 'La coleccion procede de fixture reducido para desarrollo.',
    };
  }
  if (summary?.manifest.degraded) {
    return {
      tone: 'bad',
      title: 'Informacion degradada',
      message: summary.manifest.degraded_reason ?? 'Una fuente critica no esta en estado correcto.',
    };
  }
  if (degradedSources.length) {
    return {
      tone: 'warn',
      title: 'Fuentes con degradacion',
      message: degradedSources.map((source) => source.id).join(', '),
    };
  }
  return null;
}

function useUrlSync(
  selectedEventId: string | null,
  filters: EventFilters,
  layers: Record<LayerId, boolean>,
) {
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedEventId) params.set('event', selectedEventId);
    if (filters.status) params.set('status', filters.status);
    if (filters.source) params.set('source', filters.source);
    if (filters.timeWindow !== defaultFilters.timeWindow) params.set('time', filters.timeWindow);
    if (filters.hasImpact) params.set('impact', '1');
    if (filters.hasAlert) params.set('alert', '1');
    const enabledLayers = layerRegistry.filter((layer) => layers[layer.id]).map((layer) => layer.id);
    if (enabledLayers.length !== layerRegistry.length) params.set('layers', enabledLayers.join(','));
    const next = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, [filters, layers, selectedEventId]);
}

export function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialSelectedEvent);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerId, boolean>>(initialLayers);
  const [basemap, setBasemap] = useState<Basemap>('dark');
  const [activePanel, setActivePanel] = useState<ActivePanel>('overview');
  const [detailTab, setDetailTab] = useState<DetailTab>('summary');
  const [search, setSearch] = useState('');
  const [viewportBounds, setViewportBounds] = useState<[number, number, number, number] | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number] | null>(null);

  const data = useOperationsData(selectedEventId, filters);
  const events = data.events.data?.features ?? emptyEvents;
  const sources = data.sources.data ?? emptySources;
  const assets = data.assets.data ?? emptyAssets;
  const alerts = data.alerts.data ?? emptyAlerts;
  const openAlerts = alerts.filter((alert) => alert.status === 'open');
  const selectedEvent = data.detail.data ?? events.find((event) => event.properties.id === selectedEventId) ?? events[0] ?? null;
  const selectedImpacts = data.impacts.data ?? emptyImpacts;
  const visibleEvents = useMemo(() => events.filter((event) => pointInside(viewportBounds, event)), [events, viewportBounds]);
  const degradation = globalDegradation(data.summary.data, sources);

  useUrlSync(selectedEventId, filters, visibleLayers);

  useEffect(() => {
    if (selectedEventId || !events[0]) return;
    const timeout = window.setTimeout(() => setSelectedEventId(events[0].properties.id), 0);
    return () => window.clearTimeout(timeout);
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) return;
    const timeout = window.setTimeout(() => setFocusCoordinates(selectedEvent.geometry.coordinates), 0);
    return () => window.clearTimeout(timeout);
  }, [selectedEvent]);

  function handleCreateAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    void data.actions
      .createAsset({
        name: asText(formData.get('name')),
        asset_type: asText(formData.get('asset_type'), 'site'),
        longitude: asNumber(formData.get('longitude')),
        latitude: asNumber(formData.get('latitude')),
        criticality: asText(formData.get('criticality'), 'normal'),
      })
      .then(() => form.reset());
  }

  function handleCreateRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    void data.actions
      .createAlertRule({
        name: asText(formData.get('name'), 'Wildfire near asset'),
        event_type: 'wildfire',
        asset_id: asText(formData.get('asset_id')),
        distance_threshold_m: asNumber(formData.get('distance_threshold_m')),
        cooldown_minutes: asNumber(formData.get('cooldown_minutes')),
      })
      .then(() => form.reset());
  }

  const searchResults = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('es');
    if (!q) return [];
    const eventResults = events
      .filter((event) => `${event.properties.title} ${event.properties.summary ?? ''}`.toLocaleLowerCase('es').includes(q))
      .slice(0, 5)
      .map((event) => ({ id: event.properties.id, kind: 'event' as const, label: event.properties.title, coordinates: event.geometry.coordinates }));
    const assetResults = assets
      .filter((asset) => `${asset.name} ${asset.asset_type}`.toLocaleLowerCase('es').includes(q))
      .slice(0, 5)
      .map((asset) => ({ id: asset.id, kind: 'asset' as const, label: asset.name, coordinates: [asset.longitude, asset.latitude] as [number, number] }));
    return [...eventResults, ...assetResults].slice(0, 8);
  }, [assets, events, search]);

  return (
    <main className="geoops-shell">
      <GlobalTopBar
        summary={data.summary.data}
        sources={sources}
        openAlerts={openAlerts.length}
        loading={data.busy}
      />
      {degradation && <DegradationBanner title={degradation.title} message={degradation.message} tone={degradation.tone} />}
      {data.error && <DegradationBanner title="Carga parcial" message={data.error instanceof Error ? data.error.message : 'Error desconocido'} tone="bad" />}

      <section className="operations-grid">
        <NavigationRail activePanel={activePanel} onSelect={setActivePanel} openAlerts={openAlerts.length} />
        <ContextPanel
          activePanel={activePanel}
          search={search}
          searchResults={searchResults}
          sources={sources}
          summary={data.summary.data}
          filters={filters}
          visibleLayers={visibleLayers}
          basemap={basemap}
          assets={assets}
          alerts={alerts}
          onSearch={setSearch}
          onSelectSearchResult={(result) => {
            setFocusCoordinates(result.coordinates);
            if (result.kind === 'event') setSelectedEventId(result.id);
          }}
          onFiltersChange={setFilters}
          onLayersChange={setVisibleLayers}
          onBasemapChange={setBasemap}
          onCreateAsset={handleCreateAsset}
          onDeleteAsset={(assetId) => void data.actions.deleteAsset(assetId)}
          onCreateRule={handleCreateRule}
          onAcknowledgeAlert={(alertId) => void data.actions.acknowledgeAlert(alertId)}
        />

        <section className="map-stage">
          <OperationsMap
            events={events}
            assets={assets}
            impacts={selectedImpacts}
            selectedEventId={selectedEventId}
            visibleLayers={visibleLayers}
            basemap={basemap}
            focusCoordinates={focusCoordinates}
            onSelectEvent={setSelectedEventId}
            onBoundsChange={setViewportBounds}
          />
          <TimelineControl filters={filters} onFiltersChange={setFilters} summary={data.summary.data} />
          <LegendPanel visibleLayers={visibleLayers} />
          <FloatingDetail
            event={selectedEvent}
            observations={data.observations.data ?? []}
            timeline={data.timeline.data}
            impacts={selectedImpacts}
            sources={sources}
            tab={detailTab}
            onTabChange={setDetailTab}
          />
        </section>

        <EventListPanel
          events={visibleEvents}
          selectedEventId={selectedEventId}
          alerts={alerts}
          impacts={selectedImpacts}
          onSelect={(event) => {
            setSelectedEventId(event.properties.id);
            setFocusCoordinates(event.geometry.coordinates);
          }}
        />
      </section>

      <footer className="data-disclaimer">
        GeoOps no sustituye a los servicios de emergencia. Las detecciones y cruces se muestran con fuente, precision y latencia declaradas.
      </footer>
    </main>
  );
}

function GlobalTopBar({
  summary,
  sources,
  openAlerts,
  loading,
}: {
  summary: OperationsSummaryDto | undefined;
  sources: SourceHealthDto[];
  openAlerts: number;
  loading: boolean;
}) {
  const degraded = sources.filter((source) => statusClass(source.freshness_status ?? source.last_run?.status) !== 'ok').length;
  return (
    <header className="global-topbar">
      <div className="brand-block">
        <span className="eyebrow">GeoOps Platform</span>
        <h1>Operations</h1>
      </div>
      <div className="scope-tabs" aria-label="Ambito operacional">
        <span className="scope-tab active">Wildfire</span>
        <span className="scope-tab muted">Multievento preparado</span>
      </div>
      <div className="metric-strip" aria-label="Resumen operacional">
        <Metric label="Eventos" value={summary?.events_total ?? 0} />
        <Metric label="Activos" value={summary?.assets_total ?? 0} />
        <Metric label="Alertas" value={openAlerts} tone={openAlerts ? 'bad' : 'ok'} />
        <Metric label="Fuentes degr." value={degraded} tone={degraded ? 'warn' : 'ok'} />
        <Metric label="Edad dato" value={formatAgeFromSeconds(summary?.manifest.worst_data_age_seconds) } />
        <Metric label="Pipeline" value={formatAgeFromSeconds(summary?.manifest.pipeline_age_seconds)} />
      </div>
      <div className={loading ? 'sync-state loading' : 'sync-state'}>
        <span>{loading ? 'sincronizando' : 'operativo'}</span>
        <strong>{formatDate(summary?.generated_at)}</strong>
      </div>
    </header>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <span className={`metric ${tone ?? ''}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function DegradationBanner({ title, message, tone }: { title: string; message: string; tone: string }) {
  return (
    <aside className={`degradation-banner ${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </aside>
  );
}

function NavigationRail({
  activePanel,
  openAlerts,
  onSelect,
}: {
  activePanel: ActivePanel;
  openAlerts: number;
  onSelect: (panel: ActivePanel) => void;
}) {
  const items: Array<{ id: ActivePanel; label: string; glyph: string; count?: number }> = [
    { id: 'overview', label: 'Operacion', glyph: 'OP' },
    { id: 'sources', label: 'Fuentes', glyph: 'SO' },
    { id: 'layers', label: 'Capas', glyph: 'LA' },
    { id: 'assets', label: 'Activos', glyph: 'AS' },
    { id: 'alerts', label: 'Alertas', glyph: 'AL', count: openAlerts },
  ];
  return (
    <nav className="navigation-rail" aria-label="Navegacion GeoOps">
      {items.map((item) => (
        <button
          className={activePanel === item.id ? 'rail-button active' : 'rail-button'}
          key={item.id}
          onClick={() => onSelect(item.id)}
          title={item.label}
          type="button"
        >
          <span>{item.glyph}</span>
          {item.count ? <b>{item.count}</b> : null}
        </button>
      ))}
    </nav>
  );
}

function ContextPanel(props: {
  activePanel: ActivePanel;
  search: string;
  searchResults: Array<{ id: string; kind: 'event' | 'asset'; label: string; coordinates: [number, number] }>;
  sources: SourceHealthDto[];
  summary: OperationsSummaryDto | undefined;
  filters: EventFilters;
  visibleLayers: Record<LayerId, boolean>;
  basemap: Basemap;
  assets: AssetDto[];
  alerts: AlertDto[];
  onSearch: (value: string) => void;
  onSelectSearchResult: (result: { id: string; kind: 'event' | 'asset'; label: string; coordinates: [number, number] }) => void;
  onFiltersChange: (filters: EventFilters) => void;
  onLayersChange: (layers: Record<LayerId, boolean>) => void;
  onBasemapChange: (basemap: Basemap) => void;
  onCreateAsset: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeleteAsset: (assetId: string) => void;
  onCreateRule: (event: React.FormEvent<HTMLFormElement>) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}) {
  return (
    <aside className="context-panel" aria-label="Panel contextual">
      <SearchSection {...props} />
      {props.activePanel === 'overview' && <OverviewSection summary={props.summary} filters={props.filters} onFiltersChange={props.onFiltersChange} />}
      {props.activePanel === 'sources' && <SourceHealthSection sources={props.sources} />}
      {props.activePanel === 'layers' && (
        <LayerSection
          visibleLayers={props.visibleLayers}
          basemap={props.basemap}
          onLayersChange={props.onLayersChange}
          onBasemapChange={props.onBasemapChange}
        />
      )}
      {props.activePanel === 'assets' && (
        <AssetsSection assets={props.assets} onCreateAsset={props.onCreateAsset} onDeleteAsset={props.onDeleteAsset} />
      )}
      {props.activePanel === 'alerts' && (
        <AlertsSection alerts={props.alerts} assets={props.assets} onCreateRule={props.onCreateRule} onAcknowledgeAlert={props.onAcknowledgeAlert} />
      )}
    </aside>
  );
}

function SearchSection({
  search,
  searchResults,
  onSearch,
  onSelectSearchResult,
}: Pick<Parameters<typeof ContextPanel>[0], 'search' | 'searchResults' | 'onSearch' | 'onSelectSearchResult'>) {
  return (
    <section className="panel-section search-section">
      <div className="panel-heading">
        <span>Busca un lugar</span>
        <small>eventos y activos cargados</small>
      </div>
      <input
        aria-label="Buscar evento o activo"
        className="search-input"
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Municipio, evento, activo"
        value={search}
      />
      {searchResults.length ? (
        <div className="search-results">
          {searchResults.map((result) => (
            <button key={`${result.kind}-${result.id}`} onClick={() => onSelectSearchResult(result)} type="button">
              <span>{result.kind === 'event' ? 'Evento' : 'Activo'}</span>
              <strong>{result.label}</strong>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function OverviewSection({
  summary,
  filters,
  onFiltersChange,
}: {
  summary: OperationsSummaryDto | undefined;
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}) {
  return (
    <>
      <section className="panel-section">
        <div className="panel-heading">
          <span>Resumen 24 h</span>
          <small>ventana operacional</small>
        </div>
        <div className="summary-grid">
          <Metric label="Recientes" value={summary?.events_recent_24h ?? 0} />
          <Metric label="Con impacto" value={summary?.events_with_impact ?? 0} />
          <Metric label="FRP MW" value={summary?.manifest.frp_total_mw?.toFixed(1) ?? 'sin dato'} />
          <Metric label="Hotspots" value={summary?.manifest.counts.hotspots_24h ?? 0} />
        </div>
      </section>
      <section className="panel-section">
        <div className="panel-heading">
          <span>Filtros</span>
          <small>mapa y lista</small>
        </div>
        <div className="filter-grid">
          <select value={filters.timeWindow} onChange={(event) => onFiltersChange({ ...filters, timeWindow: event.target.value as EventFilters['timeWindow'] })}>
            <option value="6h">6 h</option>
            <option value="24h">24 h</option>
            <option value="3d">3 d</option>
            <option value="7d">7 d</option>
          </select>
          <select value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="estabilizado">Estabilizado</option>
            <option value="controlado">Controlado</option>
          </select>
          <input
            aria-label="Filtrar por fuente"
            value={filters.source}
            onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}
            placeholder="source_id"
          />
          <label><input checked={filters.hasImpact} onChange={(event) => onFiltersChange({ ...filters, hasImpact: event.target.checked })} type="checkbox" /> con impacto</label>
          <label><input checked={filters.hasAlert} onChange={(event) => onFiltersChange({ ...filters, hasAlert: event.target.checked })} type="checkbox" /> con alerta</label>
        </div>
      </section>
    </>
  );
}

function SourceHealthSection({ sources }: { sources: SourceHealthDto[] }) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span>Salud de fuentes</span>
        <small>{sources.length} fuentes</small>
      </div>
      <div className="source-list">
        {sources.map((source) => (
          <article className="source-card" key={source.id}>
            <div>
              <strong>{source.name}</strong>
              <span>{source.region ?? source.kind}</span>
            </div>
            <StatusBadge value={source.freshness_status ?? source.last_run?.status ?? 'failed'} />
            <dl>
              <dt>Ultimo exito</dt>
              <dd>{formatDate(source.last_success_at ?? source.last_run?.finished_at)}</dd>
              <dt>Ultima obs.</dt>
              <dd>{formatDate(source.last_run?.latest_observed_at)}</dd>
              <dt>Latencia dato</dt>
              <dd>{formatAgeFromSeconds(source.data_age_seconds)}</dd>
              <dt>Registros</dt>
              <dd>{source.records ?? source.last_run?.records_accepted ?? 0}</dd>
              <dt>Precision</dt>
              <dd>{formatMeters(source.precision_m)}</dd>
            </dl>
            {(source.stale_reason || source.error) && <p className="source-error">{source.stale_reason ?? source.error}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}

function LayerSection({
  visibleLayers,
  basemap,
  onLayersChange,
  onBasemapChange,
}: {
  visibleLayers: Record<LayerId, boolean>;
  basemap: Basemap;
  onLayersChange: (layers: Record<LayerId, boolean>) => void;
  onBasemapChange: (basemap: Basemap) => void;
}) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span>Capas</span>
        <small>registry inicial</small>
      </div>
      <div className="layer-list">
        {layerRegistry.map((layer) => (
          <label className="layer-row" key={layer.id}>
            <input
              checked={visibleLayers[layer.id]}
              onChange={(event) => onLayersChange({ ...visibleLayers, [layer.id]: event.target.checked })}
              type="checkbox"
            />
            <span>
              <strong>{layer.title}</strong>
              <small>{layer.legend}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="segmented">
        {(['dark', 'light', 'satellite'] as const).map((item) => (
          <button className={basemap === item ? 'active' : ''} key={item} onClick={() => onBasemapChange(item)} type="button">
            {item}
          </button>
        ))}
      </div>
      <div className="future-layers">
        {preparedFutureLayers.map((layer) => <span key={layer}>{layer}</span>)}
      </div>
    </section>
  );
}

function AssetsSection({
  assets,
  onCreateAsset,
  onDeleteAsset,
}: {
  assets: AssetDto[];
  onCreateAsset: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeleteAsset: (assetId: string) => void;
}) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span>Activos</span>
        <small>{assets.length} activos</small>
      </div>
      <form className="tool-form" onSubmit={onCreateAsset}>
        <input name="name" placeholder="Nombre" required />
        <input name="asset_type" placeholder="Tipo" defaultValue="site" required />
        <input name="longitude" placeholder="Longitud" step="0.000001" type="number" required />
        <input name="latitude" placeholder="Latitud" step="0.000001" type="number" required />
        <select name="criticality" defaultValue="high">
          <option value="normal">normal</option>
          <option value="high">high</option>
        </select>
        <button type="submit">Crear activo</button>
      </form>
      <div className="asset-list">
        {assets.map((asset) => (
          <article key={asset.id}>
            <span>
              <strong>{asset.name}</strong>
              <small>{asset.asset_type} · {asset.criticality}</small>
            </span>
            <button onClick={() => onDeleteAsset(asset.id)} type="button">Borrar</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AlertsSection({
  alerts,
  assets,
  onCreateRule,
  onAcknowledgeAlert,
}: {
  alerts: AlertDto[];
  assets: AssetDto[];
  onCreateRule: (event: React.FormEvent<HTMLFormElement>) => void;
  onAcknowledgeAlert: (alertId: string) => void;
}) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span>Alertas</span>
        <small>{alerts.filter((alert) => alert.status === 'open').length} abiertas</small>
      </div>
      <form className="tool-form" onSubmit={onCreateRule}>
        <input name="name" defaultValue="Wildfire near asset" placeholder="Nombre regla" required />
        <select name="asset_id" required>
          <option value="">Selecciona activo</option>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
        </select>
        <input name="distance_threshold_m" defaultValue="50000" min="1" placeholder="Umbral m" type="number" required />
        <input name="cooldown_minutes" defaultValue="0" min="0" placeholder="Cooldown min" type="number" required />
        <button type="submit">Crear regla</button>
      </form>
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className={`alert-card ${alert.status}`} key={alert.id}>
            <strong>{alert.status}</strong>
            <p>{alert.message}</p>
            {alert.status === 'open' && <button onClick={() => onAcknowledgeAlert(alert.id)} type="button">Reconocer</button>}
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelineControl({
  filters,
  summary,
  onFiltersChange,
}: {
  filters: EventFilters;
  summary: OperationsSummaryDto | undefined;
  onFiltersChange: (filters: EventFilters) => void;
}) {
  return (
    <div className="timeline-control" aria-label="Ventana temporal">
      {(['6h', '24h', '3d', '7d'] as const).map((windowName) => (
        <button
          className={filters.timeWindow === windowName ? 'active' : ''}
          key={windowName}
          onClick={() => onFiltersChange({ ...filters, timeWindow: windowName })}
          type="button"
        >
          {windowName}
        </button>
      ))}
      <span>dato {formatAgeFromSeconds(summary?.manifest.worst_data_age_seconds)}</span>
      <span>pipeline {formatAgeFromSeconds(summary?.manifest.pipeline_age_seconds)}</span>
    </div>
  );
}

function LegendPanel({ visibleLayers }: { visibleLayers: Record<LayerId, boolean> }) {
  return (
    <aside className="legend-panel" aria-label="Leyenda">
      <strong>Leyenda</strong>
      {visibleLayers.events && (
        <>
          <span><i className="dot extreme" /> intensidad extrema/alta</span>
          <span><i className="dot medium" /> intensidad media/baja</span>
        </>
      )}
      {visibleLayers.uncertainty && <span><i className="ring" /> precision declarada</span>}
      {visibleLayers.assets && <span><i className="dot asset" /> activo</span>}
      {visibleLayers.impacts && <span><i className="line" /> impacto calculado</span>}
    </aside>
  );
}

function FloatingDetail({
  event,
  observations,
  timeline,
  impacts,
  sources,
  tab,
  onTabChange,
}: {
  event: EventFeature | null;
  observations: ObservationDto[];
  timeline: EventTimelineDto | undefined;
  impacts: ImpactDto[];
  sources: SourceHealthDto[];
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  if (!event) {
    return (
      <aside className="floating-detail empty">
        <strong>Sin seleccion</strong>
        <span>Selecciona un evento visible para abrir la ficha operacional.</span>
      </aside>
    );
  }
  const presentation = presentationFor(event.properties.type);
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'summary', label: 'Resumen' },
    { id: 'evidence', label: 'Evidencias' },
    { id: 'evolution', label: 'Evolucion' },
    { id: 'impacts', label: 'Impactos' },
    { id: 'sources', label: 'Fuentes' },
  ];
  return (
    <aside className="floating-detail" aria-label="Ficha operacional">
      <div className="detail-title">
        <span>{presentation.label}</span>
        <h2>{event.properties.title}</h2>
      </div>
      <div className="detail-tabs" role="tablist">
        {tabs.map((item) => (
          <button className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => onTabChange(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === 'summary' && (
          <dl className="detail-dl">
            <dt>Estado</dt><dd>{event.properties.status ?? 'estado desconocido'}</dd>
            <dt>Fuente estado</dt><dd>{event.properties.status_source_id ?? 'sin fuente oficial'}</dd>
            <dt>Ultima observacion</dt><dd>{formatDate(event.properties.last_observed_at)} · hace {formatAgeFromDate(event.properties.last_observed_at)}</dd>
            <dt>Actualizado</dt><dd>{formatDate(event.properties.updated_at)}</dd>
            <dt>Precision</dt><dd>{formatMeters(event.properties.precision_m)}</dd>
            <dt>Severidad</dt><dd>{event.properties.severity ?? 'no declarada'}</dd>
          </dl>
        )}
        {tab === 'evidence' && (
          <div className="stack">
            {observations.map((obs) => (
              <article className="evidence-row" key={obs.id}>
                <strong>{obs.source_id}</strong>
                <span>observed_at {formatDate(obs.observed_at)}</span>
                <span>published_at {formatDate(obs.published_at)}</span>
                <span>ingested_at {formatDate(obs.ingested_at)}</span>
                <small>{obs.relation_type} · {obs.reconciliation_version}</small>
              </article>
            ))}
          </div>
        )}
        {tab === 'evolution' && (
          <div className="stack">
            {(timeline?.points ?? []).map((point, index) => (
              <article className="timeline-row" key={`${point.kind}-${point.timestamp}-${index}`}>
                <b>{point.kind}</b>
                <span>{formatDate(point.timestamp)}</span>
                <small>{point.label}{point.changed_fields?.length ? ` · ${point.changed_fields.join(', ')}` : ''}</small>
              </article>
            ))}
          </div>
        )}
        {tab === 'impacts' && (
          <div className="stack">
            {impacts.length ? impacts.map((impact) => (
              <article className="impact-row" key={impact.id}>
                <strong>{impact.asset_name}</strong>
                <span>{formatMeters(impact.distance_m)} · score {impact.score.toFixed(2)}</span>
                <small>{impact.reasons[0]}</small>
              </article>
            )) : <p>Sin activos cruzados para este evento.</p>}
          </div>
        )}
        {tab === 'sources' && (
          <div className="stack">
            {event.properties.sources.map((sourceId) => {
              const source = sources.find((candidate) => candidate.id === sourceId);
              return (
                <article className="source-mini" key={sourceId}>
                  <strong>{source?.name ?? sourceId}</strong>
                  <StatusBadge value={source?.freshness_status ?? source?.last_run?.status ?? 'unknown'} />
                  <small>precision {formatMeters(source?.precision_m)} · dato {formatAgeFromSeconds(source?.data_age_seconds)}</small>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${statusClass(value)}`}>{value}</span>;
}

function EventListPanel({
  events,
  selectedEventId,
  alerts,
  impacts,
  onSelect,
}: {
  events: EventFeature[];
  selectedEventId: string | null;
  alerts: AlertDto[];
  impacts: ImpactDto[];
  onSelect: (event: EventFeature) => void;
}) {
  return (
    <aside className="event-list-panel" aria-label="Eventos visibles en mapa">
      <div className="panel-title-row">
        <span>Eventos visibles</span>
        <strong>{events.length}</strong>
      </div>
      <div className="event-scroll">
        {events.map((event) => {
          const hasAlert = alerts.some((alert) => alert.event_id === event.properties.id && alert.status === 'open');
          const hasImpact = impacts.some((impact) => impact.event_id === event.properties.id);
          return (
            <button
              className={selectedEventId === event.properties.id ? 'event-card selected' : 'event-card'}
              key={event.properties.id}
              onClick={() => onSelect(event)}
              type="button"
            >
              <span className="event-type">{presentationFor(event.properties.type).label}</span>
              <strong>{event.properties.title}</strong>
              <span>{event.properties.status ?? 'estado desconocido'} · {eventSourceLabel(event)}</span>
              <span>{formatDate(event.properties.last_observed_at)} · {formatMeters(event.properties.precision_m)}</span>
              <span className="event-flags">{event.properties.severity ?? 'severidad n/d'}{hasImpact ? ' · impacto' : ''}{hasAlert ? ' · alerta' : ''}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
