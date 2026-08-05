import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { AppProviders } from './app/providers';

const event = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.38, 39.89] },
  properties: {
    id: 'event-1',
    type: 'wildfire',
    title: 'Incendio cerca de Eslida',
    summary: 'CV-223 Km4',
    status: 'activo',
    status_source_id: '112cv',
    severity: 'alta',
    precision_m: 375,
    last_observed_at: '2026-08-04T20:51:00Z',
    updated_at: '2026-08-05T01:00:00Z',
    sources: ['wildfire-public'],
    attributes: {},
    valid_from: '2026-08-04T20:51:00Z',
    valid_to: null,
    created_at: '2026-08-05T01:00:00Z',
    observations_count: 1,
    revisions_count: 0,
    impacts_count: 0,
  },
};

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/v1/events?')) {
        return Promise.resolve(Response.json({ type: 'FeatureCollection', features: [event], meta: { next_cursor: null, generated_at: 'now', partial: false } }));
      }
      if (url.includes('/v1/events/event-1/observations')) {
        return Promise.resolve(Response.json([
          {
            id: 'obs-1',
            source_id: 'wildfire-public',
            source_record_id: 'upstream-1',
            source_version: 'v1',
            observed_at: '2026-08-04T20:51:00Z',
            ingested_at: '2026-08-05T01:00:00Z',
            published_at: '2026-08-04T22:51:00Z',
            precision_m: 375,
            relation_type: 'supports',
            reconciliation_version: 'wildfire-upstream-id-v1',
            attributes: {},
          },
        ]));
      }
      if (url.includes('/v1/events/event-1/impacts')) return Promise.resolve(Response.json([]));
      if (url.includes('/v1/events/event-1/timeline')) {
        return Promise.resolve(Response.json({
          event_id: 'event-1',
          generated_at: '2026-08-05T01:00:00Z',
          points: [{ kind: 'observation', timestamp: '2026-08-04T20:51:00Z', source_id: 'wildfire-public', label: 'Observacion wildfire-public', precision_m: 375, payload: {} }],
        }));
      }
      if (url.includes('/v1/events/event-1')) return Promise.resolve(Response.json(event));
      if (url.includes('/v1/sources/health')) {
        return Promise.resolve(Response.json([{ id: 'wildfire-public', name: 'Wildfire', kind: 'wildfire', enabled: true, criticality: 'high', freshness_status: 'success', data_age_seconds: 7200, pipeline_age_seconds: 240, records: 1, precision_m: 375, last_run: { status: 'success', latest_observed_at: '2026-08-04T20:51:00Z', records_accepted: 1, records_rejected: 0 } }]));
      }
      if (url.includes('/v1/operations/summary')) {
        return Promise.resolve(Response.json({
          generated_at: '2026-08-05T01:00:00Z',
          events_total: 1,
          events_by_status: { activo: 1 },
          events_by_type: { wildfire: 1 },
          events_by_source: { 'wildfire-public': 1 },
          events_recent_24h: 1,
          events_with_impact: 0,
          open_alerts: 0,
          assets_total: 0,
          sources_total: 1,
          sources_degraded: [],
          latest_observed_at: '2026-08-04T20:51:00Z',
          latest_ingested_at: '2026-08-05T01:00:00Z',
          manifest: {
            generated_at: '2026-08-04T22:51:00Z',
            pipeline_age_seconds: 240,
            data_age_seconds: { 'wildfire-public': 7200 },
            worst_data_age_seconds: 7200,
            counts: { hotspots_24h: 33 },
            frp_total_mw: 426.36,
            degraded: false,
            degraded_reason: null,
            demo: true,
            demo_reason: 'Reduced fixture for GeoOps MVP tests.',
          },
        }));
      }
      if (url.includes('/v1/assets')) return Promise.resolve(Response.json([]));
      if (url.includes('/v1/alerts')) return Promise.resolve(Response.json([]));
      return Promise.resolve(Response.json({}));
    }),
  );
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/operations');
    vi.unstubAllGlobals();
  });

  it('renders operations list and provenance fields', async () => {
    mockFetch();

    render(<AppProviders><App /></AppProviders>);

    await waitFor(() => expect(screen.getAllByText('Incendio cerca de Eslida').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/Datos demo/i)).toBeTruthy());
    expect(screen.getByText(/Edad dato/i)).toBeTruthy();
    expect(screen.getAllByText(/Pipeline/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: /Navegacion GeoOps/i })).toBeTruthy();
    expect(screen.getAllByText(/112cv/i).length).toBeGreaterThan(0);
  });

  it('keeps selection while switching workspace and detail tabs', async () => {
    mockFetch();

    render(<AppProviders><App /></AppProviders>);

    await waitFor(() => expect(screen.getAllByText('Incendio cerca de Eslida').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByRole('button', { name: 'Fuentes' })[0]);
    expect(screen.getByText(/Salud de fuentes/i)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Operaciones' })[0]);
    fireEvent.click(screen.getByRole('tab', { name: /Evidencias/i }));

    await waitFor(() => expect(screen.getByText(/observed_at/i)).toBeTruthy());
    expect(window.location.search).toContain('tab=evidence');
  });

  it('collapses the rail and exposes accessible tooltips', async () => {
    mockFetch();

    render(<AppProviders><App /></AppProviders>);

    await waitFor(() => expect(screen.getAllByText('Incendio cerca de Eslida').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: /Contraer navegacion/i }));
    fireEvent.focus(screen.getAllByRole('button', { name: 'Fuentes' }).at(-1)!);

    expect(screen.getByRole('tooltip').textContent).toContain('Fuentes');
  });
});
