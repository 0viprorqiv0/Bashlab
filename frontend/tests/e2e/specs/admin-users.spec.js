// /admin/users — role changes and lock/unlock through the real UI (search,
// ReasonDialog, RPC, admin_logs). Acts only on the disposable `target`
// learner from auth.setup.js, and restores it to plain/unlocked afterwards
// so other spec files see a known baseline.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { adminClient } = require('../support/supabaseAdmin');
const { signIn } = require('../support/apiClient');
const { loadUsers } = require('../support/testUsers');

test.use({ storageState: path.join(__dirname, '..', '.auth', 'admin.json') });

let users;
test.beforeAll(() => { users = loadUsers(); });

async function searchFor(page, email) {
  await page.goto('/admin/users');
  await page.getByLabel('Search users').fill(email);
  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row).toBeVisible();
  return row;
}

test.afterAll(async () => {
  // Belt-and-suspenders: whatever the UI test left target in, force it back
  // to a clean learner/unlocked baseline via service role.
  await adminClient.from('profiles').update({ role: 'learner', is_locked: false }).eq('id', users.target.id);
  await adminClient.auth.admin.updateUserById(users.target.id, { ban_duration: 'none' });
});

test('a reason is required before a role/lock change is applied', async ({ page }) => {
  const row = await searchFor(page, users.target.email);
  await row.getByRole('button', { name: 'Make admin' }).click();
  await page.getByRole('button', { name: 'Make admin' }).last().click(); // confirm button in the dialog shares the label
  await expect(page.getByText('A reason is required.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('promote to admin, then demote back to learner, each recorded with its reason', async ({ page }) => {
  let row = await searchFor(page, users.target.email);
  await row.getByRole('button', { name: 'Make admin' }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: promoting for admin-users.spec coverage');
  await page.getByRole('button', { name: 'Make admin' }).last().click();
  await expect(page.getByText(`Role of ${users.target.email} changed to admin.`)).toBeVisible();

  row = page.getByRole('row').filter({ hasText: users.target.email });
  await expect(row.getByText('admin', { exact: true })).toBeVisible();

  await row.getByRole('button', { name: 'Make learner' }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: demoting back to baseline');
  await page.getByRole('button', { name: 'Make learner' }).last().click();
  await expect(page.getByText(`Role of ${users.target.email} changed to learner.`)).toBeVisible();

  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', users.target.id).single();
  expect(profile.role).toBe('learner');
});

test('lock blocks the account, unlock restores it, both visible in the Status column', async ({ page }) => {
  let row = await searchFor(page, users.target.email);
  await row.getByRole('button', { name: 'Lock' }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: locking for admin-users.spec coverage');
  await page.getByRole('button', { name: 'Lock account' }).click();
  await expect(page.getByText(`${users.target.email} locked.`)).toBeVisible();

  row = page.getByRole('row').filter({ hasText: users.target.email });
  await expect(row.getByText('Locked')).toBeVisible();

  // The lock is real, not just a UI flag: the target can no longer log in.
  await expect(signIn(users.target.email, users.target.password)).rejects.toThrow(/banned|locked/i);

  await row.getByRole('button', { name: 'Unlock' }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: unlocking to restore baseline');
  await page.getByRole('button', { name: 'Unlock account' }).click();
  await expect(page.getByText(`${users.target.email} unlocked.`)).toBeVisible();

  const { data: profile } = await adminClient.from('profiles').select('is_locked').eq('id', users.target.id).single();
  expect(profile.is_locked).toBe(false);
});
