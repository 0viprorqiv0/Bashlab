const { test, expect } = require('../support/session');

test.use({ asRole: 'admin' });

const routes = ['/admin/content', '/admin/users', '/admin/activity'];
const widths = [390, 768, 1366];

for (const route of routes) {
  for (const width of widths) {
    test(`${route} has no horizontal overflow and exposes admin semantic tokens at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);

      await expect(page.locator('[data-admin-token="surface"], [data-admin-token="shell"], [data-admin-token="panel"]').first()).toBeVisible();
    });
  }
}


test('activity overview uses approved accessible admin layout', async ({ page }) => {
  await page.goto('/admin/activity');
  await expect(page.getByRole('heading', { name: /System overview/i })).toBeVisible();
  await expect(page.getByRole('combobox', { name: /View/i })).toBeVisible();
  await expect(page.getByLabel('View', { exact: true })).toHaveValue('overview');
  await expect(page.getByLabel('View', { exact: true }).locator('option[value="observability"]')).toHaveText('Observability');
  await expect(page.locator('[data-kpi-card]')).toHaveCount(3);
});

test('activity overview fills desktop lower panels and exposes visible View label', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/admin/activity');
  await expect(page.getByText(/^View:/)).toBeVisible();
  await expect(page.getByText('Service health', { exact: true })).toBeVisible();
  const heights = await page.locator('[data-admin-token=\"panel\"]').evaluateAll((panels) => panels.map((panel) => panel.getBoundingClientRect().height));
  expect(heights.some((height) => height >= 260)).toBe(true);
});

test('activity overview renders real dashboard KPI labels without placeholders', async ({ page }) => {
  await page.goto('/admin/activity');
  await expect(page.getByText('Sandbox capacity', { exact: true })).toBeVisible();
  await expect(page.getByText('In progress', { exact: true })).toBeVisible();
  await expect(page.getByText('Service health', { exact: true })).toBeVisible();
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByText('Needs attention', { exact: true })).toBeVisible();
  await expect(page.locator('[data-kpi-value="placeholder"]')).toHaveCount(0);
});
