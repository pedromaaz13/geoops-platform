import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const event = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.382, 39.899] },
  properties: {
            id: 'event-1',
            type: 'wildfire',
            subtype: 'ambos',
            title: 'Incendio cerca de Eslida',
            summary: 'CV-223 Km4',
            status: 'activo',
            status_source_id: '112cv',
            severity: 'alta',
            severity_source_id: 'wildfire-public',
            precision_m: 375,
            confidence: null,
            valid_from: '2026-08-04T20:51:00Z',
            valid_to: null,
            last_observed_at: '2026-08-04T20:51:00Z',
            created_at: '2026-08-05T01:00:00Z',
            updated_at: '2026-08-05T01:00:00Z',
            sources: ['wildfire-public'],
    attributes: {},
    geometry_kind: 'point',
    representative_point: { type: 'Point', coordinates: [-0.382, 39.899] },
    observations_count: 1,
    revisions_count: 0,
    impacts_count: 1,
  },
};

async function mockReadOnlyOperationsApi(page: Page) {
  await page.route('**/v1/events?**', (route) =>
    route.fulfill({ json: { type: 'FeatureCollection', features: [event], meta: { next_cursor: null, generated_at: 'now', partial: false, total_matched: 1 } } }),
  );
  await page.route('**/v1/events/event-1', (route) => route.fulfill({ json: event }));
  await page.route('**/v1/events/event-1/observations', (route) => route.fulfill({ json: [] }));
  await page.route('**/v1/events/event-1/impacts', (route) => route.fulfill({ json: [] }));
  await page.route('**/v1/events/event-1/timeline', (route) =>
    route.fulfill({ json: { event_id: 'event-1', generated_at: '2026-08-05T01:00:00Z', points: [] } }),
  );
  await page.route('**/v1/sources/health', (route) =>
    route.fulfill({ json: [{ id: 'wildfire-public', name: 'Wildfire public', kind: 'wildfire', enabled: true, criticality: 'high', freshness_status: 'success', data_age_seconds: 7200, pipeline_age_seconds: 240, records: 1, precision_m: 375, last_run: { status: 'success', latest_observed_at: '2026-08-04T20:51:00Z', records_accepted: 1, records_rejected: 0 } }] }),
  );
  await page.route('**/v1/operations/summary', (route) =>
    route.fulfill({
      json: {
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
      },
    }),
  );
  await page.route('**/v1/assets', (route) => route.fulfill({ json: [] }));
  await page.route('**/v1/alerts', (route) => route.fulfill({ json: [] }));
}

test('operations wildfire demo flow', async ({ page }) => {
  let assetCreated = false;
  let ruleCreated = false;
  let acknowledged = false;

  await page.route('**/v1/events?**', (route) =>
    route.fulfill({ json: { type: 'FeatureCollection', features: [event], meta: { next_cursor: null, generated_at: 'now', partial: false, total_matched: 1 } } }),
  );
  await page.route('**/v1/events/event-1', (route) => route.fulfill({ json: event }));
  await page.route('**/v1/events/event-1/observations', (route) =>
    route.fulfill({
      json: [
        {
          id: 'obs-1',
          source_id: 'wildfire-public',
          source_record_id: 'official-eslida',
          source_version: 'v1',
          observed_at: '2026-08-04T20:51:00Z',
          ingested_at: '2026-08-05T01:00:00Z',
          published_at: '2026-08-04T22:51:00Z',
          precision_m: 375,
          relation_type: 'supports',
          reconciliation_version: 'wildfire-upstream-id-v1',
          attributes: {},
        },
      ],
    }),
  );
  await page.route('**/v1/events/event-1/impacts', (route) =>
    route.fulfill({ json: assetCreated ? [{ id: 'impact-1', event_id: 'event-1', asset_id: 'asset-1', asset_name: 'Camping demo', distance_m: 1400, intersects: false, score: 0.98, reasons: ['Incendio cerca de Eslida está a 1400 m de Camping demo'] }] : [] }),
  );
  await page.route('**/v1/events/event-1/timeline', (route) =>
    route.fulfill({
      json: {
        event_id: 'event-1',
        generated_at: '2026-08-05T01:00:00Z',
        points: [{ kind: 'observation', timestamp: '2026-08-04T20:51:00Z', source_id: 'wildfire-public', label: 'Observacion wildfire-public', precision_m: 375, payload: {} }],
      },
    }),
  );
  await page.route('**/v1/sources/health', (route) =>
    route.fulfill({ json: [{ id: 'wildfire-public', name: 'Wildfire public', kind: 'wildfire', enabled: true, criticality: 'high', freshness_status: 'success', data_age_seconds: 7200, pipeline_age_seconds: 240, records: 1, precision_m: 375, last_run: { status: 'success', latest_observed_at: '2026-08-04T20:51:00Z', records_accepted: 1, records_rejected: 0 } }] }),
  );
  await page.route('**/v1/operations/summary', (route) =>
    route.fulfill({
      json: {
        generated_at: '2026-08-05T01:00:00Z',
        events_total: 1,
        events_by_status: { activo: 1 },
        events_by_type: { wildfire: 1 },
        events_by_source: { 'wildfire-public': 1 },
        events_recent_24h: 1,
        events_with_impact: assetCreated ? 1 : 0,
        open_alerts: ruleCreated ? 1 : 0,
        assets_total: assetCreated ? 1 : 0,
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
      },
    }),
  );
  await page.route('**/v1/assets', async (route) => {
    if (route.request().method() === 'POST') {
      assetCreated = true;
      return route.fulfill({ status: 201, json: { id: 'asset-1', name: 'Camping demo', asset_type: 'camping', longitude: -0.37, latitude: 39.9, criticality: 'high' } });
    }
    return route.fulfill({ json: assetCreated ? [{ id: 'asset-1', name: 'Camping demo', asset_type: 'camping', longitude: -0.37, latitude: 39.9, criticality: 'high' }] : [] });
  });
  await page.route('**/v1/alert-rules', async (route) => {
    ruleCreated = true;
    return route.fulfill({ status: 201, json: { id: 'rule-1' } });
  });
  await page.route('**/v1/alerts', (route) =>
    route.fulfill({ json: ruleCreated ? [{ id: 'alert-1', event_id: 'event-1', event_title: 'Incendio cerca de Eslida', asset_id: 'asset-1', asset_name: 'Camping demo', distance_m: 1400, status: acknowledged ? 'acknowledged' : 'open', message: 'Incendio cerca de Eslida está a 1400 m de Camping demo', created_at: '2026-08-05T01:00:00Z', acknowledged_at: acknowledged ? '2026-08-05T01:05:00Z' : null }] : [] }),
  );
  await page.route('**/v1/alerts/alert-1/acknowledge', (route) => {
    acknowledged = true;
    return route.fulfill({ json: { id: 'alert-1', status: 'acknowledged' } });
  });

  await page.goto('/operations');
  await expect(page.getByText('Incendio cerca de Eslida').first()).toBeVisible();
  await expect(page.getByLabel('Ficha operacional')).toBeHidden();
  await expect(page.getByText(/Selecciona un evento/)).toBeVisible();
  await page.getByRole('button', { name: /Incendio cerca de Eslida/ }).click();
  await expect(page.getByLabel('Ficha operacional')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar ficha' }).click();
  await expect(page.getByLabel('Ficha operacional')).toBeHidden();
  await page.getByRole('button', { name: /Incendio cerca de Eslida/ }).click();
  await expect(page.getByText(/Datos demo/)).toBeVisible();
  await expect(page.getByText(/Edad dato/)).toBeVisible();
  const rail = page.getByRole('navigation', { name: /Navegacion GeoOps/ });
  await rail.getByRole('button', { name: 'Fuentes' }).click();
  await expect(page.getByText(/Salud de fuentes/)).toBeVisible();
  await rail.getByRole('button', { name: 'Capas' }).click();
  await expect(page.getByText(/Mapas base|registry inicial/)).toBeVisible();
  await rail.getByRole('button', { name: 'Activos' }).click();
  const assetForm = page.locator('form').filter({ hasText: 'Crear activo' });
  await assetForm.getByPlaceholder('Nombre').fill('Camping demo');
  await assetForm.getByPlaceholder('Tipo').fill('camping');
  await assetForm.getByPlaceholder('Longitud').fill('-0.37');
  await assetForm.getByPlaceholder('Latitud').fill('39.9');
  await assetForm.getByRole('button', { name: /Crear activo/ }).click();
  await expect(page.getByText('Camping demo')).toBeVisible();
  await rail.getByRole('button', { name: 'Alertas' }).click();
  const ruleForm = page.locator('form').filter({ hasText: 'Crear regla' });
  await ruleForm.locator('select[name="asset_id"]').selectOption('asset-1');
  await ruleForm.getByRole('button', { name: 'Crear regla' }).click();
  await page.getByRole('tab', { name: 'Impactos' }).click();
  await expect(page.getByText(/1.4 km/)).toBeVisible();
  await rail.getByRole('button', { name: 'Alertas' }).click();
  await page.getByRole('button', { name: 'Reconocer' }).click();
  await expect(page.getByText('acknowledged')).toBeVisible();
});

test('mobile operations shell keeps map visible without global scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockReadOnlyOperationsApi(page);

  await page.goto('/operations');

  await expect(page.getByLabel('Mapa operacional')).toBeVisible();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await page.getByLabel('Buscar evento o activo').fill('Eslida');
  await expect(page.getByText('Incendio cerca de Eslida').first()).toBeVisible();
  const overflowY = await page.evaluate(() => window.getComputedStyle(document.body).overflowY);
  expect(overflowY).toBe('hidden');
});
