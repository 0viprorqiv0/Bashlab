import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Run with the frontend running: node scripts/check-viewport.mjs
const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const origin = process.env.VIEWPORT_TEST_URL || 'http://localhost:3000';
const course = { slug: 'shell-101', title: 'Shell 101', description: 'Learn navigation, files, pipes, and everyday shell commands through hands-on practice.', level: 'beginner', category: 'Core Track', duration_minutes: 120, status: 'published', chapters: [] };
await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: null, profile: null } }));
await page.route(/\/rest\/v1\/courses\?/, (route) => route.fulfill({ json: new URL(route.request().url()).searchParams.has('slug') ? [course] : [course, ...['Shell 201', 'Shell Security'].map((title, i) => ({ ...course, slug: `shell-${i + 201}`, title, status: 'upcoming' }))] }));

async function measure() {
  return page.evaluate(() => {
    const main = document.querySelector('main');
    const footer = document.querySelector('footer').getBoundingClientRect();
    return {
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      footerTop: footer.top,
      footerBottom: footer.bottom,
      mainBottom: main.getBoundingClientRect().bottom,
      mainHeight: main.clientHeight,
      contentHeight: main.scrollHeight,
      horizontalOverflow: main.scrollWidth > main.clientWidth + 1,
    };
  });
}

try {
  for (const [width, height] of [[1920, 1080], [1440, 900], [1680, 800], [1366, 768], [1280, 720], [1024, 600], [390, 844], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const path of ['/login', '/register', '/courses', '/courses/shell-101', '/blog']) {
      await page.goto(`${origin}${path}`);
      await page.locator(path === '/courses/shell-101' ? 'h2' : 'h1').first().waitFor({ state: 'attached' });
      await page.evaluate(() => document.fonts.ready);
      const m = await measure();
      const label = `${path} ${width}x${height}`;
      assert(m.documentHeight <= height + 1, `${label}: document overflows`);
      assert(m.footerBottom <= height + 1 && m.footerTop >= 64, `${label}: footer outside viewport`);
      assert(m.mainBottom <= m.footerTop + 1, `${label}: content overlaps footer`);
      assert(!m.horizontalOverflow, `${label}: horizontal overflow`);
      if (width >= 1280 && path !== '/courses/shell-101') assert(m.contentHeight <= m.mainHeight + 1, `${label}: default content needs scrolling (${m.contentHeight}/${m.mainHeight}px)`);
      console.log(`${label}: OK (${m.contentHeight}/${m.mainHeight}px content)`);
    }
  }
  // Errors must stay reachable, including on short landscape screens.
  await page.goto(`${origin}/register`);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Enter a valid email address.', { exact: true }).waitFor();
  await page.locator('main').first().hover();
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(250);
  assert(await page.locator('main').first().evaluate((main) => main.scrollTop > 0), 'Short viewport content must scroll');
  assert((await measure()).footerBottom <= 391, 'Footer moved while scrolling');
  console.log('Validation errors and inner scrolling: OK');


} finally {
  await browser.close();
}
