import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Flame,
  Gauge,
  Home,
  Layers,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

type ActivePanel = 'home' | 'overview' | 'sources' | 'assets' | 'alerts' | 'layers' | 'analysis' | 'settings';
type DetailTab = 'summary' | 'evidence' | 'evolution' | 'impacts' | 'sources';
type Basemap = 'voyager' | 'dark' | 'light' | 'satellite';
type ToolPanel = 'search' | 'filters' | 'layers' | null;

const emptyEvents: EventFeature[] = [];
const emptySources: SourceHealthDto[] = [];
const emptyAssets: AssetDto[] = [];
const emptyAlerts: AlertDto[] = [];
const emptyImpacts: ImpactDto[] = [];

const defaultFilters: EventFilters = {
  status: '',
  source: '',
  origin: '',
  sensor: '',
  minConfidence: '',
  timeWindow: '7d',
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

function initialActivePanel(): ActivePanel {
  const panel = new URLSearchParams(window.location.search).get('panel');
  if (panel && ['home', 'overview', 'sources', 'assets', 'alerts', 'layers', 'analysis', 'settings'].includes(panel)) {
    return panel as ActivePanel;
  }
  return 'overview';
}

function initialDetailTab(): DetailTab {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab && ['summary', 'evidence', 'evolution', 'impacts', 'sources'].includes(tab)) {
    return tab as DetailTab;
  }
  return 'summary';
}

function initialRailCollapsed(): boolean {
  return window.localStorage.getItem('geoops-rail-collapsed') === '1';
}

const EVENTS_WIDTH_MIN = 280;
const EVENTS_WIDTH_MAX = 560;
const EVENTS_WIDTH_DEFAULT = 340;

function clampEventsWidth(value: number): number {
  return Math.min(EVENTS_WIDTH_MAX, Math.max(EVENTS_WIDTH_MIN, value));
}

function initialEventsWidth(): number {
  const stored = Number(window.localStorage.getItem('geoops-events-width'));
  return Number.isFinite(stored) && stored > 0 ? clampEventsWidth(stored) : EVENTS_WIDTH_DEFAULT;
}

function initialEventsCollapsed(): boolean {
  return window.localStorage.getItem('geoops-events-collapsed') === '1';
}

function initialFilters(): EventFilters {
  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get('status') ?? defaultFilters.status,
    source: params.get('source') ?? defaultFilters.source,
    origin: params.get('origin') ?? defaultFilters.origin,
    sensor: params.get('sensor') ?? defaultFilters.sensor,
    minConfidence: params.get('confidence') ?? defaultFilters.minConfidence,
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
  const [lon, lat] = event.properties.representative_point.coordinates;
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

function friendlyLoadError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLocaleLowerCase('es');
  if (lowered.includes('failed to fetch') || lowered.includes('networkerror')) {
    return 'La API no responde desde este puerto local. Comprueba que make dev mantiene FastAPI vivo y que Vite esta usando un puerto permitido.';
  }
  if (lowered.includes('cors')) {
    return 'El navegador ha bloqueado la llamada por CORS. GeoOps permite los puertos locales 5173-5179; reinicia make dev si cambiaste la configuracion.';
  }
  if (lowered.includes('404')) {
    return 'El endpoint esperado no esta disponible. Revisa que la API este levantada con la rama correcta.';
  }
  return `No se pudieron cargar datos operacionales: ${message}. Si la base esta vacia, ejecuta make demo.`;
}

function useUrlSync(
  selectedEventId: string | null,
  filters: EventFilters,
  layers: Record<LayerId, boolean>,
  activePanel: ActivePanel,
  detailTab: DetailTab,
) {
  useEffect(() => {
    const params = new URLSearchParams();
    if (activePanel !== 'overview') params.set('panel', activePanel);
    if (detailTab !== 'summary') params.set('tab', detailTab);
    if (selectedEventId) params.set('event', selectedEventId);
    if (filters.status) params.set('status', filters.status);
    if (filters.source) params.set('source', filters.source);
    if (filters.origin) params.set('origin', filters.origin);
    if (filters.sensor) params.set('sensor', filters.sensor);
    if (filters.minConfidence) params.set('confidence', filters.minConfidence);
    if (filters.timeWindow !== defaultFilters.timeWindow) params.set('time', filters.timeWindow);
    if (filters.hasImpact) params.set('impact', '1');
    if (filters.hasAlert) params.set('alert', '1');
    const enabledLayers = layerRegistry.filter((layer) => layers[layer.id]).map((layer) => layer.id);
    if (enabledLayers.length !== layerRegistry.length) params.set('layers', enabledLayers.join(','));
    const next = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${next ? `?${next}` : ''}`);
  }, [activePanel, detailTab, filters, layers, selectedEventId]);
}

export function App() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(initialSelectedEvent);
  const [filters, setFilters] = useState<EventFilters>(initialFilters);
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerId, boolean>>(initialLayers);
  const [basemap, setBasemap] = useState<Basemap>('dark');
  const [activePanel, setActivePanel] = useState<ActivePanel>(initialActivePanel);
  const [detailTab, setDetailTab] = useState<DetailTab>(initialDetailTab);
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [railCollapsed, setRailCollapsed] = useState<boolean>(initialRailCollapsed);
  const [search, setSearch] = useState('');
  const [viewportBounds, setViewportBounds] = useState<[number, number, number, number] | null>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number] | null>(null);
  const [eventsWidth, setEventsWidth] = useState<number>(initialEventsWidth);
  const [eventsCollapsed, setEventsCollapsed] = useState<boolean>(initialEventsCollapsed);

  const drawerOpen = activePanel !== 'overview' || toolPanel !== null;

  const closeDrawer = useCallback(() => {
    setToolPanel(null);
    setActivePanel('overview');
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    window.localStorage.setItem('geoops-events-width', String(eventsWidth));
  }, [eventsWidth]);

  useEffect(() => {
    window.localStorage.setItem('geoops-events-collapsed', eventsCollapsed ? '1' : '0');
  }, [eventsCollapsed]);

  const startEventsResize = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = eventsWidth;
    const onMove = (move: PointerEvent) => setEventsWidth(clampEventsWidth(startWidth + (startX - move.clientX)));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.removeProperty('cursor');
    };
    document.body.style.cursor = 'ew-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [eventsWidth]);

  const data = useOperationsData(selectedEventId, filters);
  const events = data.events.data?.features ?? emptyEvents;
  const eventsMeta = data.events.data?.meta;
  const sources = data.sources.data ?? emptySources;
  const assets = data.assets.data ?? emptyAssets;
  const alerts = data.alerts.data ?? emptyAlerts;
  const openAlerts = alerts.filter((alert) => alert.status === 'open');
  const selectedEvent = selectedEventId
    ? data.detail.data ?? events.find((event) => event.properties.id === selectedEventId) ?? null
    : null;
  const selectedImpacts = data.impacts.data ?? emptyImpacts;
  const visibleEvents = useMemo(() => events.filter((event) => pointInside(viewportBounds, event)), [events, viewportBounds]);
  const degradation = globalDegradation(data.summary.data, sources);

  useUrlSync(selectedEventId, filters, visibleLayers, activePanel, detailTab);

  useEffect(() => {
    window.localStorage.setItem('geoops-rail-collapsed', railCollapsed ? '1' : '0');
  }, [railCollapsed]);

  useEffect(() => {
    if (!selectedEvent) return;
    const timeout = window.setTimeout(() => setFocusCoordinates(selectedEvent.properties.representative_point.coordinates), 0);
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
      .map((event) => ({ id: event.properties.id, kind: 'event' as const, label: event.properties.title, coordinates: event.properties.representative_point.coordinates }));
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
      {data.error && <DegradationBanner title="API no accesible" message={friendlyLoadError(data.error)} tone="bad" />}

      <section
        className={`operations-grid${railCollapsed ? ' rail-collapsed' : ''}${eventsCollapsed ? ' events-collapsed' : ''}`}
        style={{ '--events-width': `${eventsWidth}px` } as React.CSSProperties}
      >
        <NavigationRail
          activePanel={activePanel}
          collapsed={railCollapsed}
          onCollapsedChange={setRailCollapsed}
          onSelect={(panel) => {
            setActivePanel(panel);
            if (panel === 'overview') {
              setToolPanel(null);
            } else if (panel === 'layers') {
              setToolPanel('layers');
            } else {
              setToolPanel(null);
            }
          }}
          openAlerts={openAlerts.length}
        />

        <div className="map-region">
          <WorkspaceDrawer
            activePanel={activePanel}
            toolPanel={toolPanel}
            search={search}
            searchResults={searchResults}
            sources={sources}
            summary={data.summary.data}
            filters={filters}
            visibleLayers={visibleLayers}
            basemap={basemap}
            assets={assets}
            alerts={alerts}
            onClose={closeDrawer}
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
            onResetFilters={() => setFilters(defaultFilters)}
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
          <MapToolbar
            activeTool={toolPanel}
            activePanel={activePanel}
            onActivePanelChange={setActivePanel}
            onToolChange={setToolPanel}
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
            onClose={() => {
              setSelectedEventId(null);
              setDetailTab('summary');
            }}
          />
          {!selectedEvent && <MapSelectionHint eventsCount={events.length} />}
          </section>
        </div>

        <EventListPanel
          events={visibleEvents}
          allEventsCount={events.length}
          loadedCount={events.length}
          totalMatched={eventsMeta?.total_matched ?? events.length}
          partial={eventsMeta?.partial ?? false}
          selectedEventId={selectedEventId}
          alerts={alerts}
          impacts={selectedImpacts}
          collapsed={eventsCollapsed}
          onToggleCollapse={() => setEventsCollapsed((value) => !value)}
          onResizeStart={startEventsResize}
          onResetFilters={() => setFilters(defaultFilters)}
          onSelect={(event) => {
            setSelectedEventId(event.properties.id);
            setFocusCoordinates(event.properties.representative_point.coordinates);
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
      <div className="mission-strip">
        <strong>Consola operacional</strong>
        <span>Mapa, eventos, fuentes y activos locales con procedencia declarada.</span>
      </div>
      <div className="metric-strip" aria-label="Resumen operacional">
        <Tooltip label="Eventos canonicos cargados en el resumen operacional.">
          <Metric label="Eventos" value={summary?.events_total ?? 0} />
        </Tooltip>
        <Tooltip label="Activos locales creados para cruzar impactos.">
          <Metric label="Activos" value={summary?.assets_total ?? 0} />
        </Tooltip>
        <Tooltip label="Alertas abiertas pendientes de reconocer.">
          <Metric label="Alertas" value={openAlerts} tone={openAlerts ? 'bad' : 'ok'} />
        </Tooltip>
        <Tooltip label="Fuentes que no estan en success o equivalente operativo.">
          <Metric label="Fuentes degr." value={degraded} tone={degraded ? 'warn' : 'ok'} />
        </Tooltip>
        <Tooltip label="Edad del dato observado mas antiguo que condiciona la vista.">
          <Metric label="Edad dato" value={formatAgeFromSeconds(summary?.manifest.worst_data_age_seconds)} />
        </Tooltip>
        <Tooltip label="Tiempo desde que el pipeline genero el resumen visible.">
          <Metric label="Pipeline" value={formatAgeFromSeconds(summary?.manifest.pipeline_age_seconds)} />
        </Tooltip>
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
  collapsed,
  openAlerts,
  onCollapsedChange,
  onSelect,
}: {
  activePanel: ActivePanel;
  collapsed: boolean;
  openAlerts: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelect: (panel: ActivePanel) => void;
}) {
  const items: Array<{ id: ActivePanel; label: string; icon: LucideIcon; count?: number; disabled?: boolean }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'overview', label: 'Operaciones', icon: Flame },
    { id: 'sources', label: 'Fuentes', icon: DatabaseZap },
    { id: 'assets', label: 'Activos', icon: Target },
    { id: 'alerts', label: 'Alertas', icon: Bell, count: openAlerts },
    { id: 'layers', label: 'Capas', icon: Layers },
    { id: 'analysis', label: 'Analisis', icon: Activity },
    { id: 'settings', label: 'Configuracion', icon: Settings },
  ];
  const railLabel = collapsed ? 'Expandir navegacion' : 'Contraer navegacion';
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <nav className={collapsed ? 'navigation-rail collapsed' : 'navigation-rail expanded'} aria-label="Navegacion GeoOps">
      <Tooltip label={railLabel} disabled={!collapsed}>
        <button className="rail-collapse" onClick={() => onCollapsedChange(!collapsed)} type="button" aria-label={railLabel}>
          <CollapseIcon aria-hidden="true" size={17} />
          {!collapsed && <span>{railLabel}</span>}
        </button>
      </Tooltip>
      {items.map((item) => (
        <Tooltip disabled={!collapsed} key={item.id} label={item.label}>
          <button
            aria-current={activePanel === item.id ? 'page' : undefined}
            aria-label={item.label}
            className={activePanel === item.id ? 'rail-button active' : 'rail-button'}
            disabled={item.disabled}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <item.icon aria-hidden="true" size={17} />
            {!collapsed && <span className="rail-label">{item.label}</span>}
            {item.count ? <b>{item.count}</b> : null}
          </button>
        </Tooltip>
      ))}
    </nav>
  );
}

function MapToolbar({
  activeTool,
  activePanel,
  onActivePanelChange,
  onToolChange,
}: {
  activeTool: ToolPanel;
  activePanel: ActivePanel;
  onActivePanelChange: (panel: ActivePanel) => void;
  onToolChange: (tool: ToolPanel) => void;
}) {
  const tools: Array<{ id: ToolPanel; label: string; icon: LucideIcon }> = [
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'filters', label: 'Filtros', icon: SlidersHorizontal },
    { id: 'layers', label: 'Capas', icon: Layers },
  ];
  return (
    <div className="map-toolbar" aria-label="Herramientas del mapa">
      {tools.map((tool) => (
        <Tooltip label={tool.label} key={tool.id}>
          <button
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
            className={activeTool === tool.id ? 'active' : ''}
            onClick={() => {
              onActivePanelChange(tool.id === 'layers' ? 'layers' : 'overview');
              onToolChange(activeTool === tool.id ? null : tool.id);
            }}
            type="button"
          >
            <tool.icon aria-hidden="true" size={16} />
            <span>{tool.label}</span>
          </button>
        </Tooltip>
      ))}
      {activePanel !== 'overview' && activePanel !== 'layers' && (
        <button className="workspace-pill" onClick={() => onActivePanelChange('overview')} type="button">
          Volver al mapa
        </button>
      )}
    </div>
  );
}

function WorkspaceDrawer(props: {
  activePanel: ActivePanel;
  toolPanel: ToolPanel;
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
  onResetFilters: () => void;
  onClose: () => void;
}) {
  const isOpen = props.activePanel !== 'overview' || props.toolPanel !== null;
  if (!isOpen) return null;
  const title =
    props.toolPanel === 'search'
      ? 'Buscar'
      : props.toolPanel === 'filters'
        ? 'Filtros'
        : props.toolPanel === 'layers'
          ? 'Capas'
          : props.activePanel === 'home'
            ? 'Home'
            : props.activePanel === 'sources'
              ? 'Fuentes'
              : props.activePanel === 'assets'
                ? 'Activos'
                : props.activePanel === 'alerts'
                  ? 'Alertas'
                  : props.activePanel === 'analysis'
                    ? 'Analisis'
                    : 'Configuracion';
  return (
    <aside className="workspace-drawer" aria-label="Panel operacional">
      <div className="drawer-title">
        <strong>{title}</strong>
        <button aria-label="Cerrar panel" onClick={props.onClose} type="button">
          <X aria-hidden="true" size={16} />
        </button>
      </div>
      {props.toolPanel === 'search' && <SearchSection {...props} />}
      {props.toolPanel === 'filters' && (
        <OverviewSection
          summary={props.summary}
          filters={props.filters}
          onFiltersChange={props.onFiltersChange}
          onResetFilters={props.onResetFilters}
        />
      )}
      {(props.toolPanel === 'layers' || props.activePanel === 'layers') && (
        <LayerSection
          visibleLayers={props.visibleLayers}
          basemap={props.basemap}
          onLayersChange={props.onLayersChange}
          onBasemapChange={props.onBasemapChange}
        />
      )}
      {props.activePanel === 'home' && <HomeSection summary={props.summary} sources={props.sources} alerts={props.alerts} />}
      {props.activePanel === 'sources' && <SourceHealthSection sources={props.sources} />}
      {props.activePanel === 'assets' && (
        <AssetsSection assets={props.assets} onCreateAsset={props.onCreateAsset} onDeleteAsset={props.onDeleteAsset} />
      )}
      {props.activePanel === 'alerts' && (
        <AlertsSection alerts={props.alerts} assets={props.assets} onCreateRule={props.onCreateRule} onAcknowledgeAlert={props.onAcknowledgeAlert} />
      )}
      {props.activePanel === 'analysis' && <AnalysisSection summary={props.summary} />}
      {props.activePanel === 'settings' && <SettingsSection />}
    </aside>
  );
}

function SearchSection({
  search,
  searchResults,
  onSearch,
  onSelectSearchResult,
}: Pick<Parameters<typeof WorkspaceDrawer>[0], 'search' | 'searchResults' | 'onSearch' | 'onSelectSearchResult'>) {
  return (
    <section className="panel-section search-section">
      <div className="panel-heading">
        <span><Search aria-hidden="true" size={14} /> Busca un lugar</span>
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

function HomeSection({
  summary,
  sources,
  alerts,
}: {
  summary: OperationsSummaryDto | undefined;
  sources: SourceHealthDto[];
  alerts: AlertDto[];
}) {
  const degraded = sources.filter((source) => statusClass(source.freshness_status ?? source.last_run?.status) !== 'ok');
  return (
    <>
      <section className="panel-section">
        <div className="panel-heading">
          <span><MapPinned aria-hidden="true" size={14} /> Centro operativo</span>
          <small>estado local</small>
        </div>
        <div className="home-status">
          <Metric label="Eventos" value={summary?.events_total ?? 0} />
          <Metric label="Alertas abiertas" value={alerts.filter((alert) => alert.status === 'open').length} />
          <Metric label="Fuentes" value={sources.length} />
          <Metric label="Degradadas" value={degraded.length} tone={degraded.length ? 'warn' : 'ok'} />
        </div>
      </section>
      <section className="panel-section">
        <div className="panel-heading">
          <span><ShieldAlert aria-hidden="true" size={14} /> Lectura rapida</span>
          <small>sin automatismos ocultos</small>
        </div>
        <p className="panel-copy">
          GeoOps muestra datos ingeridos localmente con procedencia, precision y latencia declaradas. Si el resumen esta a cero tras `make demo`, hay un problema de API, CORS o filtros.
        </p>
      </section>
    </>
  );
}

function OverviewSection({
  summary,
  filters,
  onFiltersChange,
  onResetFilters,
}: {
  summary: OperationsSummaryDto | undefined;
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  onResetFilters: () => void;
}) {
  return (
    <>
      <section className="panel-section">
        <div className="panel-heading">
          <span><Gauge aria-hidden="true" size={14} /> Resumen 24 h</span>
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
          <span><SlidersHorizontal aria-hidden="true" size={14} /> Filtros</span>
          <small>mapa y lista</small>
        </div>
        <div className="filter-grid">
          <ControlSelect
            ariaLabel="Ventana temporal"
            value={filters.timeWindow}
            onChange={(value) => onFiltersChange({ ...filters, timeWindow: value as EventFilters['timeWindow'] })}
            options={[
              { value: '6h', label: '6 h' },
              { value: '24h', label: '24 h' },
              { value: '3d', label: '3 d' },
              { value: '7d', label: '7 d' },
            ]}
          />
          <ControlSelect
            ariaLabel="Estado de evento"
            value={filters.status}
            onChange={(value) => onFiltersChange({ ...filters, status: value })}
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'activo', label: 'Activo' },
              { value: 'estabilizado', label: 'Estabilizado' },
              { value: 'controlado', label: 'Controlado' },
            ]}
          />
          <input
            aria-label="Filtrar por fuente"
            value={filters.source}
            onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}
            placeholder="source_id"
          />
          <ControlSelect
            ariaLabel="Origen wildfire"
            value={filters.origin}
            onChange={(value) => onFiltersChange({ ...filters, origin: value })}
            options={[
              { value: '', label: 'Todos los origenes' },
              { value: 'satelite', label: 'Satelite' },
              { value: 'oficial', label: 'Oficial' },
              { value: 'ambos', label: 'Ambos' },
            ]}
          />
          <input
            aria-label="Filtrar por sensor"
            value={filters.sensor}
            onChange={(event) => onFiltersChange({ ...filters, sensor: event.target.value })}
            placeholder="sensor"
          />
          <ControlSelect
            ariaLabel="Confianza minima"
            value={filters.minConfidence}
            onChange={(value) => onFiltersChange({ ...filters, minConfidence: value })}
            options={[
              { value: '', label: 'Cualquier confianza' },
              { value: '0.5', label: '>= 0.50' },
              { value: '0.7', label: '>= 0.70' },
              { value: '0.9', label: '>= 0.90' },
            ]}
          />
          <ToggleField checked={filters.hasImpact} label="con impacto" onChange={(checked) => onFiltersChange({ ...filters, hasImpact: checked })} />
          <ToggleField checked={filters.hasAlert} label="con alerta" onChange={(checked) => onFiltersChange({ ...filters, hasAlert: checked })} />
          <button className="panel-action" onClick={onResetFilters} type="button">Limpiar filtros</button>
        </div>
      </section>
    </>
  );
}

function SourceHealthSection({ sources }: { sources: SourceHealthDto[] }) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span><DatabaseZap aria-hidden="true" size={14} /> Salud de fuentes</span>
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
              <dd>
                <Tooltip label="Precision declarada por la fuente o por el adaptador. No se inventa si no esta disponible.">
                  <span>{formatMeters(source.precision_m)}</span>
                </Tooltip>
              </dd>
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
        <span><Layers aria-hidden="true" size={14} /> Capas</span>
        <small>registry inicial</small>
      </div>
      <div className="layer-list">
        {layerRegistry.map((layer) => (
          <label className="layer-row" key={layer.id} data-enabled={visibleLayers[layer.id] ? 'true' : 'false'}>
            <span className="switch">
              <input
                checked={visibleLayers[layer.id]}
                onChange={(event) => onLayersChange({ ...visibleLayers, [layer.id]: event.target.checked })}
                type="checkbox"
              />
              <i aria-hidden="true" />
            </span>
            <span>
              <strong>{layer.title}</strong>
              <small>{layer.legend}</small>
            </span>
          </label>
        ))}
      </div>
      <div className="segmented">
        {(['voyager', 'dark', 'light', 'satellite'] as const).map((item) => {
          const labels: Record<Basemap, string> = { voyager: 'Mapa', dark: 'Oscuro', light: 'Claro', satellite: 'Satelite' };
          return (
          <button
            aria-pressed={basemap === item}
            className={basemap === item ? 'active' : ''}
            key={item}
            onClick={() => onBasemapChange(item)}
            type="button"
          >
            {labels[item]}
          </button>
          );
        })}
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
        <span><Target aria-hidden="true" size={14} /> Activos</span>
        <small>{assets.length} activos</small>
      </div>
      <form className="tool-form" onSubmit={onCreateAsset}>
        <input name="name" placeholder="Nombre" required />
        <input name="asset_type" placeholder="Tipo" defaultValue="site" required />
        <input name="longitude" placeholder="Longitud" step="0.000001" type="number" required />
        <input name="latitude" placeholder="Latitud" step="0.000001" type="number" required />
        <div className="control-select">
          <select name="criticality" defaultValue="high" aria-label="Criticidad">
            <option value="normal">normal</option>
            <option value="high">high</option>
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </div>
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
        <span><Bell aria-hidden="true" size={14} /> Alertas</span>
        <small>{alerts.filter((alert) => alert.status === 'open').length} abiertas</small>
      </div>
      <form className="tool-form" onSubmit={onCreateRule}>
        <input name="name" defaultValue="Wildfire near asset" placeholder="Nombre regla" required />
        <div className="control-select">
          <select name="asset_id" required aria-label="Activo de la regla">
            <option value="">Selecciona activo</option>
            {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </div>
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

function AnalysisSection({ summary }: { summary: OperationsSummaryDto | undefined }) {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span><Activity aria-hidden="true" size={14} /> Analisis</span>
        <small>preparado</small>
      </div>
      <div className="analysis-grid">
        <Metric label="Tipos" value={Object.keys(summary?.events_by_type ?? {}).length} />
        <Metric label="Fuentes activas" value={Object.keys(summary?.events_by_source ?? {}).length} />
        <Metric label="Estado dominante" value={Object.keys(summary?.events_by_status ?? {})[0] ?? 'sin dato'} />
      </div>
      <p className="panel-copy">Este panel ordena lectura operacional basica. Analitica avanzada y nuevas verticales quedan fuera de este pase.</p>
    </section>
  );
}

function SettingsSection() {
  return (
    <section className="panel-section tall">
      <div className="panel-heading">
        <span><Settings aria-hidden="true" size={14} /> Configuracion</span>
        <small>local UI</small>
      </div>
      <p className="panel-copy">La preferencia de rail colapsado se guarda solo en el navegador. No modifica datos de negocio ni contratos de API.</p>
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
  onClose,
}: {
  event: EventFeature | null;
  observations: ObservationDto[];
  timeline: EventTimelineDto | undefined;
  impacts: ImpactDto[];
  sources: SourceHealthDto[];
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onClose: () => void;
}) {
  if (!event) return null;
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
        <div>
          <span>{presentation.label}</span>
          <h2>{event.properties.title}</h2>
        </div>
        <button aria-label="Cerrar ficha" onClick={onClose} type="button">
          <X aria-hidden="true" size={16} />
        </button>
      </div>
      <div className="detail-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : ''}
            key={item.id}
            onClick={() => onTabChange(item.id)}
            role="tab"
            type="button"
          >
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
            <dt>Precision</dt>
            <dd>
              <Tooltip label="Radio o precision declarada. Cuando no exista se muestra sin dato.">
                <span>{formatMeters(event.properties.precision_m)}</span>
              </Tooltip>
            </dd>
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

function MapSelectionHint({ eventsCount }: { eventsCount: number }) {
  return (
    <aside className="map-selection-hint" aria-label="Seleccion de evento">
      <strong>{eventsCount ? 'Selecciona un evento' : 'Sin eventos cargados'}</strong>
      <span>{eventsCount ? 'Usa la lista visible o los marcadores para abrir la ficha operacional.' : 'Ejecuta make demo si esperabas datos locales.'}</span>
    </aside>
  );
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`status-badge ${statusClass(value)}`}>{value}</span>;
}

function EventListPanel({
  events,
  allEventsCount,
  loadedCount,
  totalMatched,
  partial,
  selectedEventId,
  alerts,
  impacts,
  collapsed,
  onToggleCollapse,
  onResizeStart,
  onResetFilters,
  onSelect,
}: {
  events: EventFeature[];
  allEventsCount: number;
  loadedCount: number;
  totalMatched: number;
  partial: boolean;
  selectedEventId: string | null;
  alerts: AlertDto[];
  impacts: ImpactDto[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onResizeStart: (event: React.PointerEvent) => void;
  onResetFilters: () => void;
  onSelect: (event: EventFeature) => void;
}) {
  if (collapsed) {
    return (
      <aside className="event-list-panel collapsed" aria-label="Eventos visibles en mapa">
        <button className="events-expand" onClick={onToggleCollapse} type="button" aria-label="Mostrar eventos visibles">
          <ChevronLeft aria-hidden="true" size={16} />
          <span className="events-expand-count">{events.length}</span>
        </button>
      </aside>
    );
  }
  return (
    <aside className="event-list-panel" aria-label="Eventos visibles en mapa">
      <div className="events-resize-handle" onPointerDown={onResizeStart} role="separator" aria-orientation="vertical" aria-label="Redimensionar panel de eventos" />
      <div className="panel-title-row">
        <span>Eventos visibles</span>
        <div className="panel-title-actions">
          <strong>{events.length}</strong>
          <button className="events-collapse" onClick={onToggleCollapse} type="button" aria-label="Contraer eventos visibles">
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      {partial && (
        <div className="events-truncated" role="status">
          Mostrando {loadedCount} de {totalMatched} — refina los filtros para ver el resto
        </div>
      )}
      <div className="event-scroll">
        {!events.length && (
          <div className="empty-state">
            <strong>{allEventsCount ? 'Sin eventos visibles' : 'Sin datos cargados'}</strong>
            <p>{allEventsCount ? 'Los filtros o el encuadre del mapa ocultan todos los eventos.' : 'Ejecuta make demo y recarga la consola para sembrar eventos locales.'}</p>
            {allEventsCount ? <button onClick={onResetFilters} type="button">Limpiar filtros</button> : null}
          </div>
        )}
        {events.map((event) => {
          const hasAlert = alerts.some((alert) => alert.event_id === event.properties.id && alert.status === 'open');
          const hasImpact = (event.properties.impacts_count ?? 0) > 0 || impacts.some((impact) => impact.event_id === event.properties.id);
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

function Tooltip({ children, disabled, label }: { children: ReactNode; disabled?: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  function clearTimer() {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function openDelayed() {
    if (disabled) return;
    clearTimer();
    timer.current = window.setTimeout(() => setOpen(true), 180);
  }

  function close() {
    clearTimer();
    setOpen(false);
  }

  return (
    <span
      className="tooltip-host"
      onBlur={close}
      onFocus={disabled ? undefined : () => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') close();
      }}
      onMouseEnter={openDelayed}
      onMouseLeave={close}
    >
      {children}
      {open && (
        <span className="tooltip-bubble" role="tooltip">
          {label}
        </span>
      )}
    </span>
  );
}

function ControlSelect({
  ariaLabel,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <div className="control-select">
      <select aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={14} />
    </div>
  );
}

function ToggleField({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle-field">
      <span className="switch">
        <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <i aria-hidden="true" />
      </span>
      <span>{label}</span>
    </label>
  );
}
