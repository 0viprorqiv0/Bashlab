// /admin/users — role changes and lock/unlock through the real UI (search,
// ReasonDialog, RPC, admin_logs). Acts only on the disposable `target`
// learner from auth.setup.js, and restores it to plain/unlocked afterwards
// so other spec files see a known baseline.
const path = require('path');
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { signIn } = require('../support/apiClient');
const { loadUsers } = require('../support/testUsers');

test.use({ asRole: 'admin' });

let users;
test.beforeAll(() => { users = loadUsers(); });

// Finds the disposable target learner in the list and opens its "Manage User" dialog.
async function openManage(page, email) {
  await page.goto('/admin/users');
  await page.getByLabel('Search learners').fill(email);
  await expect(page.getByRole('button', { name: 'Manage' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Manage' }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage User' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.afterAll(async () => {
  // Belt-and-suspenders: whatever the UI test left target in, force it back
  // to a clean learner/unlocked baseline via service role.
  await adminClient.from('profiles').update({ role: 'learner', is_locked: false }).eq('id', users.target.id);
  await adminClient.auth.admin.updateUserById(users.target.id, { ban_duration: 'none' });
});

test('a reason is required before a role/lock change is applied', async ({ page }) => {
  const manage = await openManage(page, users.target.email);
  await manage.getByTitle('Click to toggle role').click();
  await page.getByRole('button', { name: 'Make admin' }).last().click(); // confirm button in the reason dialog
  await expect(page.getByText('A reason is required.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('promote to admin, then demote back to learner, each recorded with its reason', async ({ page }) => {
  const manage = await openManage(page, users.target.email);
  await manage.getByTitle('Click to toggle role').click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: promoting for admin-users.spec coverage');
  await page.getByRole('button', { name: 'Make admin' }).last().click();
  await expect(page.getByText(`Role of ${users.target.email} changed to admin.`)).toBeVisible();
  await expect(manage.getByTitle('Click to toggle role')).toHaveText('Admin');

  await manage.getByTitle('Click to toggle role').click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: demoting back to baseline');
  await page.getByRole('button', { name: 'Make learner' }).last().click();
  await expect(page.getByText(`Role of ${users.target.email} changed to learner.`)).toBeVisible();
  await expect(manage.getByTitle('Click to toggle role')).toHaveText('Learner');

  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', users.target.id).single();
  expect(profile.role).toBe('learner');
  const { data: log } = await adminClient.from('admin_logs').select('action, reason').eq('target_id', users.target.id).order('created_at', { ascending: false }).limit(2);
  expect(log.map((row) => row.reason)).toEqual(['e2e: demoting back to baseline', 'e2e: promoting for admin-users.spec coverage']);
});

test('lock blocks the account, unlock restores it, both visible in the Status row', async ({ page }) => {
  const manage = await openManage(page, users.target.email);
  await manage.getByRole('button', { name: /Lock Account/ }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: locking for admin-users.spec coverage');
  await page.getByRole('button', { name: 'Lock account', exact: true }).click();
  await expect(page.getByText(`${users.target.email} locked.`)).toBeVisible();
  await expect(manage.getByText('Locked', { exact: true })).toBeVisible();

  // The lock is real, not just a UI flag: the target can no longer log in.
  await expect(signIn(users.target.email, users.target.password)).rejects.toThrow(/banned|locked/i);

  await manage.getByRole('button', { name: /Unlock Account/ }).click();
  await page.getByRole('textbox', { name: /Reason/ }).fill('e2e: unlocking to restore baseline');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await expect(page.getByText(`${users.target.email} unlocked.`)).toBeVisible();

  const { data: profile } = await adminClient.from('profiles').select('is_locked').eq('id', users.target.id).single();
  expect(profile.is_locked).toBe(false);
});
