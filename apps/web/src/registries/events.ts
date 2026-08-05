export interface StatusPresentation {
  label: string;
  color: string;
}

export interface EventPresentation {
  type: string;
  label: string;
  icon: string;
  color: string;
  statusVocabulary: Record<string, StatusPresentation>;
  defaultLayers: string[];
  detailSections: string[];
}

export const eventPresentationRegistry: Record<string, EventPresentation> = {
  wildfire: {
    type: 'wildfire',
    label: 'Incendio forestal',
    icon: 'WF',
    color: '#FF5C35',
    statusVocabulary: {
      activo: { label: 'Activo', color: '#E7354F' },
      estabilizado: { label: 'Estabilizado', color: '#FF9E2C' },
      controlado: { label: 'Controlado', color: '#FFD24A' },
      extinguido: { label: 'Extinguido', color: '#718398' },
      desconocido: { label: 'Estado desconocido', color: '#718398' },
    },
    defaultLayers: ['events', 'uncertainty', 'assets', 'impacts'],
    detailSections: ['summary', 'evidence', 'evolution', 'impacts', 'sources'],
  },
  weather_warning: {
    type: 'weather_warning',
    label: 'Aviso meteorologico',
    icon: 'WX',
    color: '#4C9BFF',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
  road_incident: {
    type: 'road_incident',
    label: 'Incidencia vial',
    icon: 'RD',
    color: '#2CC7D4',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
  earthquake: {
    type: 'earthquake',
    label: 'Terremoto',
    icon: 'EQ',
    color: '#F4B843',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
  flood: {
    type: 'flood',
    label: 'Inundacion',
    icon: 'FL',
    color: '#4C9BFF',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
  air_quality: {
    type: 'air_quality',
    label: 'Calidad del aire',
    icon: 'AQ',
    color: '#2ED29A',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
  news_event: {
    type: 'news_event',
    label: 'Noticia geolocalizada',
    icon: 'NW',
    color: '#91A5B8',
    statusVocabulary: {},
    defaultLayers: [],
    detailSections: [],
  },
};

export function presentationFor(type: string): EventPresentation {
  return eventPresentationRegistry[type] ?? eventPresentationRegistry.wildfire;
}
