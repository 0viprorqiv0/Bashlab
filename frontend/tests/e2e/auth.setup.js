// Playwright "setup" project: runs once before every other test file.
// Provisions disposable e2e.*@bashlab-e2e.test accounts (never real team
// accounts — see tests/e2e/README.md) and saves logged-in browser storage
// state so spec files can start already authenticated instead of re-doing
// the login UI flow in every test.
const fs = require('fs');
const path = require('path');
const { test: setup } = require('@playwright/test');
const { createTestUser } = require('./support/supabaseAdmin');

const authDir = path.join(__dirname, '.auth');

async function loginAndSave(browser, email, password, file) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/login');
  // The footer's newsletter field shares the "Email address" label — scope
  // to <main> to avoid Playwright's strict-mode "resolved to 2 elements".
  const main = page.locator('main');
  await main.getByLabel('Email address').fill(email);
  await main.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/my-learning');
  await context.storageState({ path: file });
  await context.close();
}

setup('provision e2e test users and sessions', async ({ browser }) => {
  fs.mkdirSync(authDir, { recursive: true });

  const [learner, admin, target, locked] = await Promise.all([
    createTestUser({ prefix: 'learner' }),
    createTestUser({ prefix: 'admin', role: 'admin' }),
    createTestUser({ prefix: 'target' }),
    createTestUser({ prefix: 'locked', locked: true }),
  ]);

  fs.writeFileSync(path.join(authDir, 'users.json'), JSON.stringify({ learner, admin, target, locked }, null, 2));

  await loginAndSave(browser, learner.email, learner.password, path.join(authDir, 'learner.json'));
  await loginAndSave(browser, admin.email, admin.password, path.join(authDir, 'admin.json'));
});
