// Page-load measurement (not a test): time until each page shows content, request
// counts and transfer size, as anonymous / learner / admin. Needs the backend
// API running and its CORS_ORIGINS to include <baseURL>.
// Usage: node tests/e2e/tools/measure-pages.js http://localhost:3100   (against a production build)
const { chromium } = require('@playwright/test');
const { createTestUser, deleteTestUserSafe } = require('../support/supabaseAdmin');

const base = process.argv[2] || 'http://localhost:3100';

async function login(page, user) {
  await page.goto(`${base}/login`);
  const main = page.locator('main');
  await main.getByLabel('Email address').fill(user.email);
  await main.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function measure(page, path, ready) {
  const reqs = [];
  const onReq = (r) => reqs.push({ url: r.url(), start: Date.now() });
  page.on('request', onReq);
  let bytes = 0;
  const onResp = async (res) => { try { const b = await res.body(); bytes += b.length; } catch {} };
  page.on('response', onResp);
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: 'commit' });
  await page.locator(ready).first().waitFor({ state: 'visible', timeout: 30000 });
  const ready_ms = Date.now() - t0;
  await page.waitForLoadState('networkidle').catch(() => {});
  page.off('request', onReq); page.off('response', onResp);
  const supa = reqs.filter((r) => r.url.includes('supabase.co'));
  const fonts = reqs.filter((r) => /fonts\.(gstatic|googleapis)/.test(r.url));
  console.log(`${path.padEnd(22)} ready=${String(ready_ms).padStart(5)}ms  reqs=${String(reqs.length).padStart(3)}  supabase=${String(supa.length).padStart(2)}  fonts=${fonts.length}  bytes=${(bytes / 1024).toFixed(0)}KB`);
}

(async () => {
  const learner = await createTestUser({ prefix: 'perf' });
  const admin = await createTestUser({ prefix: 'perfadmin', role: 'admin' });
  const browser = await chromium.launch();
  try {
    const anon = await (await browser.newContext()).newPage();
    await measure(anon, '/', 'text=/curiosity/i');
    await measure(anon, '/courses', 'text=Shell 101 — Bash Basics');
    await measure(anon, '/courses/shell-101', 'text=Terminal Fundamentals & Navigation');
    await measure(anon, '/login', 'text=Welcome back');

    const lp = await (await browser.newContext()).newPage();
    await login(lp, learner);
    await measure(lp, '/my-learning', 'text=/lessons completed/');
    await measure(lp, '/courses/shell-101', 'text=Terminal Fundamentals & Navigation');
    await measure(lp, '/account', 'text=Account details');

    const ap = await (await browser.newContext()).newPage();
    await login(ap, admin);
    await measure(ap, '/admin/content', 'text=Chapters & lessons');
    await measure(ap, '/admin/users', 'text=/active admin/');
    await measure(ap, '/admin/activity', 'text=Active sessions');
  } finally {
    await browser.close();
    await deleteTestUserSafe(learner);
    await deleteTestUserSafe(admin);
  }
})();
