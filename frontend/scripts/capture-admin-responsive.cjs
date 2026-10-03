const { chromium } = require('playwright');
const path = require('path');

const viewports = [
  { name: '390_mobile', width: 390, height: 844 },
  { name: '768_tablet', width: 768, height: 1024 },
  { name: '1366_desktop', width: 1366, height: 768 },
  { name: '1920_large_desktop', width: 1920, height: 1080 }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    
    // Log in
    await page.goto('http://localhost:3000/login');
    const main = page.locator('main');
    await main.getByLabel('Email address').fill('admin.revision.1790935914407@bashlab-local.test');
    await main.getByLabel('Password', { exact: true }).fill('Bashlab-E2E-2026!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));

    // Go to admin activity
    await page.goto('http://localhost:3000/admin/activity', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const outPath = path.join('/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541', 'admin-activity-' + vp.name + '.png');
    await page.screenshot({ path: outPath });
    console.log('Captured:', outPath);
    await page.close();
  }
  await browser.close();
})();
