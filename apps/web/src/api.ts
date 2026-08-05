import type {
  AlertDto,
  AssetDto,
  EventCollection,
  EventFeature,
  EventFilters,
  EventTimelineDto,
  ImpactDto,
  ObservationDto,
  OperationsSummaryDto,
  SourceHealthDto,
} from './types';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function timeWindowStart(windowName: EventFilters['timeWindow']): string {
  const now = Date.now();
  const hours = { '6h': 6, '24h': 24, '3d': 72, '7d': 168 }[windowName];
  return new Date(now - hours * 60 * 60 * 1000).toISOString();
}

export async function fetchEvents(filters?: Partial<EventFilters>): Promise<EventCollection> {
  const params = new URLSearchParams({
    bbox: '-19,27,5,44.5',
    types: 'wildfire',
    limit: '200',
  });
  if (filters?.timeWindow) params.set('from', timeWindowStart(filters.timeWindow));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.source) params.set('sources', filters.source);
  if (filters?.hasImpact) params.set('has_impact', 'true');
  if (filters?.hasAlert) params.set('has_alert', 'true');
  return request<EventCollection>(`/v1/events?${params.toString()}`);
}

export async function fetchEventDetail(eventId: string): Promise<EventFeature> {
  return request<EventFeature>(`/v1/events/${eventId}`);
}

export async function fetchObservations(eventId: string): Promise<ObservationDto[]> {
  return request<ObservationDto[]>(`/v1/events/${eventId}/observations`);
}

export async function fetchTimeline(eventId: string): Promise<EventTimelineDto> {
  return request<EventTimelineDto>(`/v1/events/${eventId}/timeline`);
}

export async function fetchImpacts(eventId: string): Promise<ImpactDto[]> {
  return request<ImpactDto[]>(`/v1/events/${eventId}/impacts`);
}

export async function fetchOperationsSummary(): Promise<OperationsSummaryDto> {
  return request<OperationsSummaryDto>('/v1/operations/summary');
}

export async function fetchSourcesHealth(): Promise<SourceHealthDto[]> {
  return request<SourceHealthDto[]>('/v1/sources/health');
}

export async function fetchAssets(): Promise<AssetDto[]> {
  return request<AssetDto[]>('/v1/assets');
}

export async function createAsset(payload: {
  name: string;
  asset_type: string;
  longitude: number;
  latitude: number;
  criticality: string;
}): Promise<AssetDto> {
  return request<AssetDto>('/v1/assets', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteAsset(assetId: string): Promise<void> {
  await request<void>(`/v1/assets/${assetId}`, { method: 'DELETE' });
}

export async function createAlertRule(payload: {
  name: string;
  event_type: string;
  asset_id: string;
  distance_threshold_m: number;
  cooldown_minutes: number;
}): Promise<unknown> {
  return request('/v1/alert-rules', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchAlerts(): Promise<AlertDto[]> {
  return request<AlertDto[]>('/v1/alerts');
}

export async function acknowledgeAlert(alertId: string): Promise<AlertDto> {
  return request<AlertDto>(`/v1/alerts/${alertId}/acknowledge`, { method: 'POST' });
}
