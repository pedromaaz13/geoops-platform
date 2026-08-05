import { expect, test } from '@playwright/test';

test('shows the GeoOps bootstrap screen', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /consola operacional geoespacial/i })).toBeVisible();
  await expect(page.getByText(/sin modelos ni fuentes reales todavía/i)).toBeVisible();
});
