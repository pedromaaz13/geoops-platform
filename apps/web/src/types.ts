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
    precision_m: number | null;
    last_observed_at: string | null;
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
  reasons: string[];
}

export interface SourceHealthDto {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  criticality: string;
  last_run: {
    status: string;
    latest_observed_at: string | null;
    records_accepted: number;
    records_rejected: number;
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
