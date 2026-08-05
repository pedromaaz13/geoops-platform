import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  fetchOperationsSummary,
  fetchSourcesHealth,
  fetchTimeline,
} from '../api';
import type { EventFilters } from '../types';

export function useOperationsData(selectedEventId: string | null, filters: EventFilters) {
  const queryClient = useQueryClient();
  const events = useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
  });
  const sources = useQuery({
    queryKey: ['sources-health'],
    queryFn: fetchSourcesHealth,
  });
  const summary = useQuery({
    queryKey: ['operations-summary'],
    queryFn: fetchOperationsSummary,
  });
  const assets = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });
  const alerts = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
  });
  const detail = useQuery({
    queryKey: ['event-detail', selectedEventId],
    queryFn: () => fetchEventDetail(String(selectedEventId)),
    enabled: Boolean(selectedEventId),
  });
  const observations = useQuery({
    queryKey: ['event-observations', selectedEventId],
    queryFn: () => fetchObservations(String(selectedEventId)),
    enabled: Boolean(selectedEventId),
  });
  const impacts = useQuery({
    queryKey: ['event-impacts', selectedEventId],
    queryFn: () => fetchImpacts(String(selectedEventId)),
    enabled: Boolean(selectedEventId),
  });
  const timeline = useQuery({
    queryKey: ['event-timeline', selectedEventId],
    queryFn: () => fetchTimeline(String(selectedEventId)),
    enabled: Boolean(selectedEventId),
  });

  const invalidateOperations = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['events'] }),
      queryClient.invalidateQueries({ queryKey: ['operations-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      queryClient.invalidateQueries({ queryKey: ['event-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['event-impacts'] }),
    ]);
  };

  const createAssetMutation = useMutation({
    mutationFn: createAsset,
    onSuccess: invalidateOperations,
  });
  const deleteAssetMutation = useMutation({
    mutationFn: deleteAsset,
    onSuccess: invalidateOperations,
  });
  const createAlertRuleMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: invalidateOperations,
  });
  const acknowledgeAlertMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: invalidateOperations,
  });

  return {
    events,
    sources,
    summary,
    assets,
    alerts,
    detail,
    observations,
    impacts,
    timeline,
    actions: {
      createAsset: createAssetMutation.mutateAsync,
      deleteAsset: deleteAssetMutation.mutateAsync,
      createAlertRule: createAlertRuleMutation.mutateAsync,
      acknowledgeAlert: acknowledgeAlertMutation.mutateAsync,
      invalidateOperations,
    },
    busy:
      events.isLoading ||
      sources.isLoading ||
      summary.isLoading ||
      assets.isLoading ||
      alerts.isLoading,
    error:
      events.error ||
      sources.error ||
      summary.error ||
      assets.error ||
      alerts.error ||
      detail.error ||
      observations.error ||
      impacts.error ||
      timeline.error,
  };
}
