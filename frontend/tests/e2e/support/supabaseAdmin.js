// Service-role helpers for E2E fixtures. Only ever used to create/delete
// disposable e2e.*@bashlab-e2e.test accounts — never touches real team
// accounts (see tests/e2e/README.md).
const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = 'Bashlab-E2E-2026!';
const EMAIL_DOMAIN = 'bashlab-e2e.test';

function uniqueEmail(prefix) {
  return `e2e.${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@${EMAIL_DOMAIN}`;
}

async function createTestUser({ role = 'learner', locked = false, prefix = 'user' } = {}) {
  const email = uniqueEmail(prefix);
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createTestUser(${prefix}): ${error.message}`);
  const id = data.user.id;

  if (role !== 'learner') {
    const { error: roleError } = await adminClient.from('profiles').update({ role }).eq('id', id);
    if (roleError) throw new Error(`createTestUser(${prefix}) set role: ${roleError.message}`);
  }
  if (locked) {
    const { error: lockError } = await adminClient.from('profiles').update({ is_locked: true }).eq('id', id);
    if (lockError) throw new Error(`createTestUser(${prefix}) lock: ${lockError.message}`);
    await adminClient.auth.admin.updateUserById(id, { ban_duration: '876000h' });
  }
  return { id, email, password: TEST_PASSWORD, role, locked };
}

async function deleteTestUser(id) {
  if (!id) return;
  await adminClient.auth.admin.deleteUser(id).catch(() => {});
}

// Safety net for teardown: never delete anything outside the e2e domain,
// even if a caller passes a bad id/email by mistake.
async function deleteTestUserSafe(user) {
  if (!user?.id || !user.email?.endsWith(`@${EMAIL_DOMAIN}`)) return;
  await deleteTestUser(user.id);
}

module.exports = { adminClient, createTestUser, deleteTestUser, deleteTestUserSafe, TEST_PASSWORD, EMAIL_DOMAIN };
