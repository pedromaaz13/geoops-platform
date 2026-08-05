export type LayerId = 'events' | 'uncertainty' | 'assets' | 'impacts';

export interface LayerDefinition {
  id: LayerId;
  title: string;
  group: string;
  renderer: 'maplibre';
  source: string;
  visibleByDefault: boolean;
  minZoom: number;
  maxZoom: number;
  legend: string;
  freshness: 'live' | 'recent' | 'stale' | 'historical' | 'demo' | 'failed';
  loadingState: 'eager' | 'lazy';
  permissions: 'public' | 'workspace';
}

export const layerRegistry: LayerDefinition[] = [
  {
    id: 'events',
    title: 'Eventos',
    group: 'Operacion',
    renderer: 'maplibre',
    source: 'events',
    visibleByDefault: true,
    minZoom: 0,
    maxZoom: 22,
    legend: 'Punto canonico del evento',
    freshness: 'recent',
    loadingState: 'eager',
    permissions: 'public',
  },
  {
    id: 'uncertainty',
    title: 'Incertidumbre',
    group: 'Calidad',
    renderer: 'maplibre',
    source: 'events',
    visibleByDefault: true,
    minZoom: 0,
    maxZoom: 22,
    legend: 'Radio de precision declarado por la fuente',
    freshness: 'recent',
    loadingState: 'eager',
    permissions: 'public',
  },
  {
    id: 'assets',
    title: 'Activos',
    group: 'Impacto',
    renderer: 'maplibre',
    source: 'assets',
    visibleByDefault: true,
    minZoom: 0,
    maxZoom: 22,
    legend: 'Activo puntual persistido en GeoOps',
    freshness: 'live',
    loadingState: 'eager',
    permissions: 'workspace',
  },
  {
    id: 'impacts',
    title: 'Impactos',
    group: 'Impacto',
    renderer: 'maplibre',
    source: 'impacts',
    visibleByDefault: true,
    minZoom: 0,
    maxZoom: 22,
    legend: 'Linea evento-activo con distancia calculada',
    freshness: 'live',
    loadingState: 'eager',
    permissions: 'workspace',
  },
];

export const preparedFutureLayers = [
  'Hotspots',
  'Perimetros',
  'Viento',
  'Aire',
  'Trafico',
  'Avisos',
  'Suelo',
  'Red electrica',
  'Ferrocarril',
  'Areas protegidas',
  'Poblacion',
  'Noticias',
];
