// Logged-in test contexts for the specs that need a fixed account (learner/admin).
//
// The refresh token lives in an HttpOnly cookie and ROTATES on every refresh
// (Supabase also treats re-use of an old one as theft and revokes the session),
// so a saved storageState cannot be shared by many contexts the way a static
// localStorage token could. Instead each role logs in once through the API;
// every context starts from the latest cookie and hands its (rotated) cookie
// back when the test ends — exactly what one real browser profile does.
const { test: base, expect } = require('@playwright/test');
const { loadUsers } = require('./testUsers');

const API = process.env.E2E_API_URL || 'http://localhost:3001';
const ORIGIN = 'http://localhost:3000';
const sessions = new Map(); // role -> { value, userId }

async function sessionFor(role) {
  if (sessions.has(role)) return sessions.get(role);
  const user = loadUsers()[role];
  const response = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!response.ok) throw new Error(`e2e login for ${role} failed: ${response.status}`);
  const value = decodeURIComponent(response.headers.get('set-cookie').split(';')[0].split('=')[1]);
  const session = { value, userId: user.id };
  sessions.set(role, session);
  return session;
}

async function signIn(context, role) {
  const session = await sessionFor(role);
  await context.addCookies([{ name: 'bashlab_rt', value: session.value, domain: 'localhost', path: '/api/auth', httpOnly: true, sameSite: 'Lax' }]);
  // The user-id hint the app keeps in localStorage (no token in it).
  await context.addInitScript((userId) => { try { localStorage.setItem('bashlab.uid', userId); } catch { /* ignore */ } }, session.userId);
  return session;
}

async function signOutHandBack(context, session) {
  const cookie = (await context.cookies()).find((c) => c.name === 'bashlab_rt');
  if (cookie) session.value = decodeURIComponent(cookie.value);
}

// A fresh signed-in context outside the `test` fixtures: `const { context, done } = await roleContext(browser, 'learner')`.
async function roleContext(browser, role) {
  const context = await browser.newContext();
  const session = await signIn(context, role);
  return { context, done: async () => { await signOutHandBack(context, session); await context.close(); } };
}

const test = base.extend({
  asRole: [null, { option: true }],
  context: async ({ context, asRole }, use) => {
    const session = asRole ? await signIn(context, asRole) : null;
    await use(context);
    if (session) await signOutHandBack(context, session);
  },
});

module.exports = { test, expect, roleContext };
