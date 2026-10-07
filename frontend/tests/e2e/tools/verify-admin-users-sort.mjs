import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541';

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const BASE_URL = 'https://fat-corrections-hamburg-speaker.trycloudflare.com';
  console.log('Navigating to login at', BASE_URL);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Fill login
  console.log('Logging in as admin@bashlab.com...');
  await page.locator('main').getByLabel('Email address').fill('admin@bashlab.com');
  await page.locator('main').getByLabel('Password', { exact: true }).fill('Bashlab-Admin-2026!');
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
  console.log('Logged in successfully. Navigating to /admin/users...');

  await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check initial pager
  let pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  console.log('Initial Pager:', pagerInfo);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-initial.png') });

  // 1. Test Sort: Name A to Z
  console.log('\n--- Testing Sort: Name A to Z ---');
  const sortTrigger = page.locator('button[aria-label^="Sort by activity"]');
  await sortTrigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitemradio', { name: 'Name: A to Z' }).click();
  await page.waitForTimeout(1000);

  let namesPage1 = await page.locator('div[class*="userRow"] div[class*="userNameRow"]').allTextContents();
  console.log('Page 1 Names (A-Z):', namesPage1.map(n => n.replace(/\s+/g, ' ').trim()));
  pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  console.log('Pager:', pagerInfo);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-name-asc-page1.png') });

  // Click Next Page (Page 2)
  console.log('Navigating to Page 2...');
  const nextBtn = page.getByRole('button', { name: 'Next page' });
  await nextBtn.click();
  await page.waitForTimeout(1000);

  let namesPage2 = await page.locator('div[class*="userRow"] div[class*="userNameRow"]').allTextContents();
  console.log('Page 2 Names (A-Z):', namesPage2.map(n => n.replace(/\s+/g, ' ').trim()));
  pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  console.log('Pager:', pagerInfo);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-name-asc-page2.png') });

  // 2. Test Sort: Labs Completed
  console.log('\n--- Testing Sort: Labs Completed ---');
  await sortTrigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitemradio', { name: 'Labs Completed' }).click();
  await page.waitForTimeout(1000);

  let labs = await page.locator('div[class*="userRow"] div[class*="metricCell"]').allTextContents();
  let rowNames = await page.locator('div[class*="userRow"] div[class*="userName"]').allTextContents();
  console.log('Labs Completed rows:');
  for (let i = 0; i < labs.length; i++) {
    console.log(`  ${rowNames[i]}: ${labs[i]}`);
  }
  pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  console.log('Pager:', pagerInfo);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-labs-desc.png') });

  // 3. Test Filter: Role Learner
  console.log('\n--- Testing Filter: Role Learner ---');
  const roleTrigger = page.locator('button[aria-label^="Filter by role"]');
  await roleTrigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitemradio', { name: 'Role: Learner' }).click();
  await page.waitForTimeout(1000);

  pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  console.log('Role Learner Pager:', pagerInfo);
  let roles = await page.locator('div[class*="userRow"] div[class*="roleCell"]').allTextContents();
  console.log('Roles on page 1:', roles.map(r => r.trim()));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-role-learner-page1.png') });

  // Go to page 3 of learners
  const page3Btn = page.getByRole('button', { name: 'Page 3' });
  if (await page3Btn.isVisible()) {
    console.log('Navigating to Page 3 of Learners...');
    await page3Btn.click();
    await page.waitForTimeout(1000);
    pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
    let page3Rows = await page.locator('div[class*="userRow"]').count();
    console.log('Pager:', pagerInfo, 'Row count on last page:', page3Rows);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-role-learner-page3.png') });
  }

  // 4. Test Filter: Role Admin
  console.log('\n--- Testing Filter: Role Admin ---');
  await roleTrigger.click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitemradio', { name: 'Role: Admin' }).click();
  await page.waitForTimeout(1000);

  pagerInfo = await page.locator('span[class*="pagerInfo"]').textContent();
  let adminRows = await page.locator('div[class*="userRow"]').count();
  let adminRoles = await page.locator('div[class*="userRow"] div[class*="roleCell"]').allTextContents();
  console.log('Role Admin Pager:', pagerInfo, 'Admin rows count:', adminRows);
  console.log('Roles:', adminRoles.map(r => r.trim()));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-role-admin.png') });

  console.log('\nAll tests completed successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
