import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Run with the frontend running: node scripts/check-personal-viewport.mjs
const origin = process.env.VIEWPORT_TEST_URL || 'http://localhost:3000';
const browser = await chromium.launch();
const course = { slug: 'shell-101', title: 'Shell 101 — Bash Basics', description: 'Learn shell commands.', category: 'Core Track', status: 'published', sort_order: 1 };
async function measure(target) {
  return target.evaluate(() => {
    const main = document.querySelector('main');
    const footer = document.querySelector('footer').getBoundingClientRect();
    const content = main.firstElementChild.getBoundingClientRect();
    const frame = main.getBoundingClientRect();
    return {
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: innerHeight,
      footerTop: footer.top,
      footerBottom: footer.bottom,
      mainBottom: main.getBoundingClientRect().bottom,
      mainHeight: main.clientHeight,
      contentHeight: main.scrollHeight,
      horizontalOverflow: main.scrollWidth > main.clientWidth + 1,
      centered: Math.abs((content.top - frame.top) - (frame.bottom - content.bottom)) <= 1,
    };
  });
}

try {
  // Exercise signed-in layouts without changing a real account or learning data.
  const signedInPage = await browser.newPage();
  const user = { id: 'viewport-user', email: 'learner@example.com', created_at: '2026-09-01T00:00:00Z', email_confirmed_at: '2026-09-01T00:00:00Z' };
  const profile = { name: 'Viewport Learner', bio: 'Learning Linux and shell scripting.', role: 'learner' };
  const token = `test.${Buffer.from(JSON.stringify({ sub: user.id })).toString('base64url')}.test`;
  await signedInPage.addInitScript(() => localStorage.setItem('bashlab.uid', 'viewport-user'));
  await signedInPage.route('**/api/auth/refresh', (route) => route.fulfill({ json: { session: { access_token: token, expires_at: Math.floor(Date.now() / 1000) + 3600 } } }));
  await signedInPage.route('**/api/auth/me', (route) => route.fulfill({ json: { user, profile } }));
  await signedInPage.route('**/api/auth/profile', (route) => route.fulfill({ json: { profile } }));
  await signedInPage.route('**/rest/v1/**', (route) => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/courses') ? [{ ...course, chapters: [{ id: 'chapter-1', title: 'Basics', sort_order: 1, lessons: Array.from({ length: 12 }, (_, i) => ({ id: `lesson-${i}`, slug: `lesson-${i}`, title: `Lesson ${i}`, status: 'published', sort_order: i })) }] }] : [] }));
  for (const [width, height] of [[1920, 1080], [1440, 900], [1680, 800], [1366, 768], [1280, 720], [1024, 600], [390, 844], [844, 390]]) {
    await signedInPage.setViewportSize({ width, height });
    for (const path of ['/account', '/my-learning']) {
      await signedInPage.goto(`${origin}${path}`);
      await signedInPage.locator('main h1').waitFor();
      await signedInPage.evaluate(() => document.fonts.ready);
      for (const state of path === '/account' ? ['profile', 'security', 'editor'] : ['dashboard']) {
        if (state === 'security') await signedInPage.getByRole('button', { name: 'Security & access', exact: true }).click();
        if (state === 'editor') {
          await signedInPage.getByRole('button', { name: 'Personal profile', exact: true }).click();
          await signedInPage.getByRole('button', { name: 'Edit profile', exact: true }).click();
        }
        const m = await measure(signedInPage);
        const label = `${path} ${state} ${width}x${height}`;
        assert(m.documentHeight <= height + 1, `${label}: document overflows`);
        assert(m.footerBottom <= height + 1 && m.mainBottom <= m.footerTop + 1, `${label}: footer overlap`);
        assert(!m.horizontalOverflow, `${label}: horizontal overflow`);
        if (width >= 1280 && state !== 'editor') assert(m.contentHeight <= m.mainHeight + 1, `${label}: default content needs scrolling (${m.contentHeight}/${m.mainHeight}px)`);
        if (m.contentHeight <= m.mainHeight + 1) assert(m.centered, `${label}: content is not vertically centered`);
        if (state === 'editor') {
          const save = signedInPage.getByRole('button', { name: 'Save changes', exact: true });
          await save.scrollIntoViewIfNeeded();
          const bounds = await save.boundingBox();
          assert(bounds.y >= 64 && bounds.y + bounds.height <= m.footerTop + 1, `${label}: save action is unreachable`);
        }
        console.log(`${label}: OK (${m.contentHeight}/${m.mainHeight}px content)`);
        if (process.env.VIEWPORT_SCREENSHOT_DIR && [1440, 390].includes(width) && state !== 'editor') {
          await signedInPage.screenshot({ path: `${process.env.VIEWPORT_SCREENSHOT_DIR}/${path.slice(1)}-${state}-${width}.png` });
        }
      }
    }
  }
  await signedInPage.close();
} finally {
  await browser.close();
}
