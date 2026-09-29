// /admin/activity — Sessions tab (admin_stop_session RPC) and Admin log tab
// (reads admin_logs, the audit trail every admin_* RPC writes to).
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'admin.json') });

let users;
let sessionId;

test.beforeAll(async () => {
  users = loadUsers();
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('slug', 'hello-bashlab').single();
  const { data: session, error } = await adminClient
    .from('practice_sessions')
    .insert({ user_id: users.target.id, lesson_id: lesson.id, status: 'active' })
    .select('id')
    .single();
  if (error) throw error;
  sessionId = session.id;
});

test.afterAll(async () => {
  if (sessionId) await adminClient.from('practice_sessions').delete().eq('id', sessionId);
});

test('Sessions tab lists the active session and Stop records a reason + updates status', async ({ page }) => {
  await page.goto('/admin/activity');
  await expect(page.getByRole('tab', { name: 'Sessions' })).toHaveAttribute('aria-selected', 'true');

  const row = page.getByRole('row').filter({ hasText: users.target.email });
  await expect(row).toBeVisible();
  await expect(row.getByText('active')).toBeVisible();

  await row.getByRole('button', { name: 'Stop' }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: stopping session for admin-activity.spec coverage');
  await page.getByRole('button', { name: 'Stop session' }).click();
  await expect(page.getByText(`Session of ${users.target.email} stopped.`)).toBeVisible();

  const { data: after } = await adminClient.from('practice_sessions').select('status').eq('id', sessionId).single();
  expect(after.status).toBe('stopped');
});

test('Admin log tab shows the stop_session entry, filterable by action, with a reason detail dialog', async ({ page }) => {
  await page.goto('/admin/activity');
  await page.getByRole('tab', { name: 'Admin log' }).click();
  await page.getByLabel('Action').selectOption('stop_session');

  // A stop_session log's "Target" column shows the session id, not the
  // learner's email (admin_logs only records who was stopped by session
  // id) — filter by actor (the admin who acted) and action instead.
  const row = page.getByRole('row').filter({ hasText: 'stop_session' }).first();
  await expect(row).toBeVisible();

  await row.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('e2e: stopping session for admin-activity.spec coverage')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
});
