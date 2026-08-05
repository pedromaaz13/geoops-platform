import { expect, test } from '@playwright/test';

const event = {
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.382, 39.899] },
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
    observations_count: 1,
    revisions_count: 0,
    impacts_count: 1,
  },
};

test('operations wildfire demo flow', async ({ page }) => {
  let assetCreated = false;
  let ruleCreated = false;
  let acknowledged = false;

  await page.route('**/v1/events?**', (route) =>
    route.fulfill({ json: { type: 'FeatureCollection', features: [event], meta: { next_cursor: null, generated_at: 'now', partial: false } } }),
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
    route.fulfill({ json: assetCreated ? [{ id: 'impact-1', event_id: 'event-1', asset_id: 'asset-1', asset_name: 'Camping demo', distance_m: 1400, intersects: false, reasons: ['Incendio cerca de Eslida está a 1400 m de Camping demo'] }] : [] }),
  );
  await page.route('**/v1/sources/health', (route) =>
    route.fulfill({ json: [{ id: 'wildfire-public', name: 'Wildfire public', kind: 'wildfire', enabled: true, criticality: 'high', last_run: { status: 'success', latest_observed_at: '2026-08-04T20:51:00Z', records_accepted: 1, records_rejected: 0 } }] }),
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
  await expect(page.getByText(/observed_at/)).toBeVisible();
  const assetForm = page.locator('form').filter({ hasText: 'Activo puntual' });
  await assetForm.getByPlaceholder('Nombre').fill('Camping demo');
  await assetForm.getByPlaceholder('Tipo').fill('camping');
  await assetForm.getByPlaceholder('Longitud').fill('-0.37');
  await assetForm.getByPlaceholder('Latitud').fill('39.9');
  await assetForm.getByRole('button', { name: 'Crear activo' }).click();
  await expect(assetForm.locator('.asset-chip').getByText('Camping demo')).toBeVisible();
  const ruleForm = page.locator('form').filter({ hasText: 'Regla' });
  await ruleForm.locator('select[name="asset_id"]').selectOption('asset-1');
  await ruleForm.getByRole('button', { name: 'Crear regla' }).click();
  await expect(page.getByText(/1400 m/)).toBeVisible();
  await page.getByRole('button', { name: 'Reconocer' }).click();
  await expect(page.getByText('acknowledged')).toBeVisible();
});
