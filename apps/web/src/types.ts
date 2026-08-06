// API DTOs derive from the OpenAPI-generated types in ./api-types (source of
// truth). Do not hand-edit shapes here: regenerate with `pnpm gen:api` after the
// backend contract changes. EventFilters is frontend-only state, not an API shape.
import type { components } from './api-types';

type Schemas = components['schemas'];

// EventDetailFeature is the superset (list features + detail counts), so it types
// both the collection items and the single-event detail response.
export type EventFeature = Schemas['EventDetailFeature'];
export type EventCollection = Schemas['EventFeatureCollection'];
export type ObservationDto = Schemas['Observation'];
export type ImpactDto = Schemas['Impact'];
export type AssetDto = Schemas['Asset'];
export type AlertDto = Schemas['Alert'];
export type AlertRuleDto = Schemas['AlertRule'];
export type SourceDto = Schemas['Source'];
export type SourceHealthDto = Schemas['SourceHealth'];
export type OperationsSummaryDto = Schemas['OperationsSummary'];
export type TimelinePointDto = Schemas['TimelinePoint'];
export type EventTimelineDto = Schemas['EventTimeline'];
export type AssetCreateDto = Schemas['AssetCreate'];
export type AlertRuleCreateDto = Schemas['AlertRuleCreate'];

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
