import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

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
      if (url.includes('/v1/events/event-1')) return Promise.resolve(Response.json(event));
      if (url.includes('/v1/sources/health')) {
        return Promise.resolve(Response.json([{ id: 'wildfire-public', name: 'Wildfire', kind: 'wildfire', enabled: true, criticality: 'high', last_run: { status: 'success', latest_observed_at: '2026-08-04T20:51:00Z', records_accepted: 1, records_rejected: 0 } }]));
      }
      if (url.includes('/v1/assets')) return Promise.resolve(Response.json([]));
      if (url.includes('/v1/alerts')) return Promise.resolve(Response.json([]));
      return Promise.resolve(Response.json({}));
    }),
  );
}

describe('App', () => {
  it('renders operations list and provenance fields', async () => {
    mockFetch();

    render(<App />);

    await waitFor(() => expect(screen.getAllByText('Incendio cerca de Eslida').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/observed_at/i)).toBeTruthy());
    expect(screen.getByText(/ingested_at/i)).toBeTruthy();
    expect(screen.getByText(/112cv/i)).toBeTruthy();
  });
});
