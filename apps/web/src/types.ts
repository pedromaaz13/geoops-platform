export interface EventFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    id: string;
    type: string;
    title: string;
    summary: string | null;
    status: string | null;
    status_source_id: string | null;
    severity: string | null;
    severity_source_id?: string | null;
    subtype?: string | null;
    precision_m: number | null;
    confidence?: number | null;
    valid_from?: string | null;
    valid_to?: string | null;
    last_observed_at: string | null;
    created_at?: string;
    updated_at: string;
    sources: string[];
    attributes: Record<string, unknown>;
    observations_count?: number;
    revisions_count?: number;
    impacts_count?: number;
  };
}

export interface EventCollection {
  type: 'FeatureCollection';
  features: EventFeature[];
  meta: {
    next_cursor: string | null;
    generated_at: string;
    partial: boolean;
  };
}

export interface EventFilters {
  status: string;
  source: string;
  origin: string;
  sensor: string;
  minConfidence: string;
  timeWindow: '6h' | '24h' | '3d' | '7d';
  hasImpact: boolean;
  hasAlert: boolean;
}

export interface ObservationDto {
  id: string;
  source_id: string;
  source_record_id: string;
  source_version: string;
  observed_at: string | null;
  published_at: string | null;
  ingested_at: string;
  precision_m: number | null;
  relation_type: string;
  reconciliation_version: string;
  attributes: Record<string, unknown>;
}

export interface AssetDto {
  id: string;
  name: string;
  asset_type: string;
  longitude: number;
  latitude: number;
  criticality: string;
}

export interface ImpactDto {
  id: string;
  event_id: string;
  asset_id: string;
  asset_name: string;
  distance_m: number;
  intersects: boolean;
  score: number;
  reasons: string[];
  calculated_at?: string;
  calculation_version?: string;
}

export interface SourceHealthDto {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  criticality: string;
  region?: string | null;
  organism?: string | null;
  freshness_status?: string;
  last_download_at?: string | null;
  last_success_at?: string | null;
  latest_observed_at?: string | null;
  download_age_seconds?: number | null;
  data_age_seconds?: number | null;
  pipeline_age_seconds?: number | null;
  ttl_seconds?: number | null;
  records?: number | null;
  precision_m?: number | null;
  coverage?: string | null;
  stale_reason?: string | null;
  error?: string | null;
  consecutive_failures?: number | null;
  last_run: {
    id?: string;
    status: string;
    started_at?: string | null;
    finished_at?: string | null;
    latest_observed_at: string | null;
    records_downloaded?: number;
    records_accepted: number;
    records_rejected: number;
    error_type?: string | null;
    error_message?: string | null;
  } | null;
}

export interface AlertDto {
  id: string;
  event_id: string;
  event_title: string;
  asset_id: string;
  asset_name: string;
  distance_m: number;
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  created_at: string;
  acknowledged_at: string | null;
}

export interface OperationsSummaryDto {
  generated_at: string;
  events_total: number;
  events_by_status: Record<string, number>;
  events_by_type: Record<string, number>;
  events_by_source: Record<string, number>;
  events_recent_24h: number;
  events_with_impact: number;
  open_alerts: number;
  assets_total: number;
  sources_total: number;
  sources_degraded: string[];
  source_health?: {
    stale_sources: string[];
    failed_sources: string[];
    worst_data_age_seconds: number | null;
    worst_download_age_seconds: number | null;
    latest_success_at: string | null;
  };
  latest_observed_at: string | null;
  latest_ingested_at: string | null;
  manifest: {
    generated_at: string | null;
    pipeline_age_seconds: number | null;
    data_age_seconds: Record<string, number>;
    worst_data_age_seconds: number | null;
    counts: Record<string, number>;
    frp_total_mw: number | null;
    degraded: boolean;
    degraded_reason: string | null;
    demo: boolean;
    demo_reason: string | null;
  };
}

export interface TimelinePointDto {
  kind: string;
  timestamp: string | null;
  source_id: string | null;
  label: string;
  precision_m?: number | null;
  changed_fields?: string[];
  payload: Record<string, unknown>;
}

export interface EventTimelineDto {
  event_id: string;
  generated_at: string;
  points: TimelinePointDto[];
}
