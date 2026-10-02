// The Activity page's Overview tab: headline numbers from the database, charts
// from Prometheus (through an admin-only API that never forwards PromQL).
const { test, expect } = require('../support/session');
const { signIn, forBackend } = require('../support/apiClient');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'admin' });

const now = Date.now();
const points = (values) => values.map((v, i) => [now - (values.length - i) * 15000, v]);
const FAKE = (range) => ({
  range,
  generatedAt: new Date(now).toISOString(),
  stats: { users: 42, admins: 3, locked: 1, activeSessions: 5, sessions24h: 17, completed24h: 9 },
  available: true,
  reason: null,
  metrics: {
    sessions: [{ name: 'sessions', points: points([1, 2, 3, 5]) }],
    jobsActive: [{ name: 'jobsActive', points: points([0, 1, 1, 2]) }],
    jobsPending: [{ name: 'jobsPending', points: points([0, 0, 0, 1]) }],
    commands: [{ name: 'completed', points: points([4, 6, 8, 12]) }, { name: 'timeout', points: points([0, 1, 0, 1]) }],
    commandP95: [{ name: 'commandP95', points: points([0.1, 0.2, 0.15, 0.3]) }],
    http: [{ name: '2xx', points: points([30, 40, 50, 60]) }, { name: '5xx', points: points([0, 0, 1, 1]) }],
    httpP95: [{ name: 'httpP95', points: points([0.02, 0.03, 0.05, 0.04]) }],
    auth: [{ name: 'login_ok', points: points([1, 2, 1, 3]) }, { name: 'login_failed', points: points([0, 1, 0, 0]) }],
    memoryMb: [{ name: 'memoryMb', points: points([100, 101, 103, 104]) }],
    cpu: [{ name: 'cpu', points: points([0.01, 0.02, 0.02, 0.03]) }],
    rateLimited: [{ name: 'rateLimited', points: points([0, 0, 0, 0]) }],
  },
});

test('the Overview tab is the Activity landing page and degrades gracefully without Prometheus', async ({ page }) => {
  await page.route('**/api/admin/dashboard*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ range: '1h', generatedAt: new Date(now).toISOString(), stats: { users: 42, admins: 3, locked: 1, activeSessions: 5, sessions24h: 17, completed24h: 9 }, available: false, reason: 'Prometheus is not reachable.', metrics: null }),
      headers: { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' },
    });
  });
  await page.goto('/admin/activity');
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  // When Prometheus is unavailable, banner indicates it
  await expect(page.getByText('Prometheus is not connected.')).toBeVisible();
  // ...but the database-backed numbers are still there.
  const users = page.locator('dl[aria-label="Headline numbers"] div').filter({ hasText: 'Users' });
  await expect(users.locator('dd')).not.toHaveText('—');
  await expect(page.getByText('No data in this window yet.').first()).toBeVisible();
});

test('with Prometheus data every chart renders, ranges re-query, and the hover tooltip reads values', async ({ page }) => {
  const requested = [];
  await page.route('**/api/admin/dashboard*', (route) => {
    const range = new URL(route.request().url()).searchParams.get('range');
    requested.push(range);
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE(range)), headers: { 'access-control-allow-origin': 'http://localhost:3000', 'access-control-allow-credentials': 'true' } });
  });
  await page.goto('/admin/activity');

  await expect(page.getByText('Prometheus is not connected.')).toHaveCount(0);
  const stat = (label) => page.locator('dl[aria-label="Headline numbers"] div').filter({ hasText: label }).locator('dd');
  await expect(stat('Users')).toHaveText('42');
  await expect(stat('Active sessions')).toHaveText('5');
  await expect(stat('Labs completed (24h)')).toHaveText('9');
  await expect(stat('Commands / min')).toHaveText('13.0'); // 12 completed + 1 timeout, latest samples
  await expect(stat('API error rate')).toHaveText('1.6%'); // 1 of 61

  for (const title of ['Sandbox load', 'Commands per minute', 'API requests per minute', 'Sign-in activity per minute', 'API memory (RSS)']) {
    await expect(page.locator(`svg[role="img"][aria-label^="${title}."]`)).toBeVisible();
  }
  await expect(page.getByText('login_failed').first()).toBeVisible(); // legend

  const chart = page.getByRole('img', { name: /^Commands per minute/ });
  const box = await chart.boundingBox();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5);
  await expect(page.getByRole('status').filter({ hasText: 'completed:' })).toBeVisible();

  expect(requested[0]).toBe('1h');
  await page.getByRole('button', { name: '6h' }).click();
  await expect.poll(() => requested.at(-1)).toBe('6h');
  await expect(page.getByRole('button', { name: '6h' })).toHaveAttribute('aria-pressed', 'true');
});

test('the dashboard API is admin-only and refuses unknown ranges', async () => {
  const users = loadUsers();
  const learner = forBackend((await signIn(users.learner.email, users.learner.password)).access_token);
  const admin = forBackend((await signIn(users.admin.email, users.admin.password)).access_token);
  expect((await forBackend(null)('GET', '/api/admin/dashboard')).status).toBe(401);
  expect((await learner('GET', '/api/admin/dashboard')).status).toBe(403);
  expect((await admin('GET', '/api/admin/dashboard?range=forever')).status).toBe(400);
  const ok = await admin('GET', '/api/admin/dashboard?range=15m');
  expect(ok.status).toBe(200);
  expect(typeof ok.data.available).toBe('boolean');
  expect(ok.data.stats.users).toBeGreaterThan(0);
});
