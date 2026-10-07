const { chromium } = require('@playwright/test');
const path = require('path');
const { createTestUser, deleteTestUserSafe } = require('../tests/e2e/support/supabaseAdmin');

const artifactsDir = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541';

async function scan() {
  console.log('1. Provisioning test admin...');
  const admin = await createTestUser({ role: 'admin', prefix: 'scan' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    console.log('2. Logging in...');
    await page.goto('http://localhost:3000/login');
    const main = page.locator('main');
    await main.getByLabel('Email address').fill(admin.email);
    await main.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    console.log('Logged in successfully.');

    const routes = [
      { url: 'http://localhost:3000/', name: 'scan-landing.png' },
      { url: 'http://localhost:3000/courses', name: 'scan-courses.png' },
      { url: 'http://localhost:3000/my-learning', name: 'scan-my-learning.png' },
      { url: 'http://localhost:3000/account', name: 'scan-account.png' },
      { url: 'http://localhost:3000/subscription', name: 'scan-subscription.png' },
      { url: 'http://localhost:3000/admin/content', name: 'scan-admin-content.png' },
      { url: 'http://localhost:3000/admin/users', name: 'scan-admin-users.png' },
      { url: 'http://localhost:3000/admin/activity', name: 'scan-admin-activity.png' },
    ];

    for (const r of routes) {
      console.log(`Scanning: ${r.url}`);
      await page.goto(r.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(artifactsDir, r.name) });
      console.log(`Saved ${r.name}`);
    }
  } finally {
    await browser.close();
    await deleteTestUserSafe(admin);
    console.log('Cleanup complete.');
  }
}

scan().catch(console.error);
