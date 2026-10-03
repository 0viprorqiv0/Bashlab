const { chromium } = require('@playwright/test');
const path = require('path');
const { createTestUser, deleteTestUserSafe } = require('../tests/e2e/support/supabaseAdmin');

const artifactsDir = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541';

async function runAudit() {
  console.log('1. Provisioning disposable test admin...');
  const admin = await createTestUser({ role: 'admin', prefix: 'audit' });
  console.log(`Admin provisioned: ${admin.email}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('\n2. Logging in...');
    await page.goto('http://localhost:3000/login');
    const main = page.locator('main');
    await main.getByLabel('Email address').fill(admin.email);
    await main.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    console.log(`Landed on: ${page.url()}`);

    const checkScroll = async (name) => {
      return await page.evaluate((label) => {
        const doc = document.documentElement;
        const body = document.body;
        const shell = document.querySelector('main > div');
        
        const windowVerticalScroll = doc.scrollHeight > doc.clientHeight || body.scrollHeight > window.innerHeight;
        const windowHorizontalScroll = doc.scrollWidth > doc.clientWidth;
        const shellVerticalScroll = shell ? shell.scrollHeight > shell.clientHeight : false;
        const shellHorizontalScroll = shell ? shell.scrollWidth > shell.clientWidth : false;

        return {
          label,
          window: {
            innerHeight: window.innerHeight,
            docScrollHeight: doc.scrollHeight,
            docClientHeight: doc.clientHeight,
            docScrollWidth: doc.scrollWidth,
            docClientWidth: doc.clientWidth,
            hasVerticalScroll: windowVerticalScroll,
            hasHorizontalScroll: windowHorizontalScroll,
          },
          shell: shell ? {
            scrollHeight: shell.scrollHeight,
            clientHeight: shell.clientHeight,
            scrollWidth: shell.scrollWidth,
            clientWidth: shell.clientWidth,
            hasVerticalScroll: shellVerticalScroll,
            hasHorizontalScroll: shellHorizontalScroll,
          } : null,
          zeroScrollPassed: !windowVerticalScroll && !windowHorizontalScroll && !shellVerticalScroll && !shellHorizontalScroll
        };
      }, name);
    };

    const results = {};

    // 1. Audit /admin/users
    console.log('\n3. Auditing /admin/users...');
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="search"]');
    await page.waitForTimeout(1000);
    results.users = await checkScroll('admin/users');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-users-no-scroll.png'), fullPage: false });

    // 2. Audit /admin/activity - Overview (Category 1: sandbox)
    console.log('\n4. Auditing /admin/activity - Overview (Terminal & Sandbox)...');
    await page.goto('http://localhost:3000/admin/activity', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    results.activity_overview_sandbox = await checkScroll('admin/activity - Overview (sandbox)');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-activity-overview-no-scroll.png'), fullPage: false });

    // Category 2: API & Reliability
    console.log('Testing category: API & Reliability...');
    await page.click('button:has-text("API & Reliability")');
    await page.waitForTimeout(500);
    results.activity_overview_api = await checkScroll('admin/activity - Overview (api)');

    // Category 3: System & Security
    console.log('Testing category: System & Security...');
    await page.click('button:has-text("System & Security")');
    await page.waitForTimeout(500);
    results.activity_overview_system = await checkScroll('admin/activity - Overview (system)');

    // 3. Audit /admin/activity - Sessions
    console.log('\n5. Auditing /admin/activity - Sessions...');
    await page.click('button[role="tab"]:has-text("Sessions")');
    await page.waitForTimeout(1000);
    results.activity_sessions = await checkScroll('admin/activity - Sessions');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-activity-sessions-no-scroll.png'), fullPage: false });

    // 4. Audit /admin/activity - Admin log
    console.log('\n6. Auditing /admin/activity - Admin log...');
    await page.click('button[role="tab"]:has-text("Admin log")');
    await page.waitForTimeout(1000);
    results.activity_log = await checkScroll('admin/activity - Admin log');
    await page.screenshot({ path: path.join(artifactsDir, 'admin-activity-logs-no-scroll.png'), fullPage: false });

    console.log('\n========================================');
    console.log('       AUTOMATED AUDIT REPORT');
    console.log('========================================');
    console.log(JSON.stringify(results, null, 2));

    const allPassed = Object.values(results).every(r => r.zeroScrollPassed);
    console.log('\n========================================');
    console.log(`FINAL RESULT: ${allPassed ? 'ALL PASSED (100% ZERO SCROLLBARS)' : 'FAILED'}`);
    console.log('========================================');

    if (!allPassed) process.exit(1);
  } finally {
    await browser.close();
    console.log('\nCleaning up disposable admin...');
    await deleteTestUserSafe(admin);
    console.log('Cleanup complete.');
  }
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
