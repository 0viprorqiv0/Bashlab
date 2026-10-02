import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseURL = process.env.BLOG_TEST_URL || 'http://localhost:3000';
const output = fileURLToPath(new URL('../../.impeccable/review/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

async function checkWidth() {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Page must not overflow horizontally');
}

try {
  await page.goto(`${baseURL}/blog`);
  const cards = page.locator('article');
  await cards.first().waitFor();
  assert.equal(await cards.count(), 5);
  await page.getByRole('button', { name: 'Linux Basics' }).click();
  assert.equal(await cards.count(), 2);
  await page.getByRole('button', { name: 'All articles' }).click();
  const search = page.getByRole('searchbox', { name: 'Search articles' });
  await search.fill('pipes');
  assert.equal(await cards.count(), 1);
  await search.fill('no-matching-article');
  await page.getByRole('heading', { name: 'No articles found' }).waitFor();
  await page.getByRole('button', { name: 'Reset Filters' }).click();
  await cards.first().waitFor();
  assert.equal(await cards.count(), 5);
  await page.evaluate(() => document.fonts.ready);
  await checkWidth();
  await page.screenshot({ path: `${output}/blog-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await checkWidth();
  await page.screenshot({ path: `${output}/blog-mobile.png`, fullPage: true });

  await page.goto(`${baseURL}/blog/getting-started-with-linux-terminal`);
  await page.getByRole('navigation', { name: 'Table of contents' }).waitFor();
  const contents = page.getByRole('navigation', { name: 'Table of contents' }).locator('li a');
  assert.equal(await contents.count(), 5);
  for (const anchor of await contents.all()) {
    assert.equal(await page.locator(await anchor.getAttribute('href')).count(), 1, 'Each contents link must target a heading');
  }
  await contents.nth(1).click();
  await page.waitForTimeout(1200);
  const target = page.locator(await contents.nth(1).getAttribute('href'));
  assert.ok((await target.boundingBox()).y >= 60 && (await target.boundingBox()).y < 180, 'Contents navigation must clear the fixed header');
  await page.getByRole('button', { name: 'Copy code', exact: true }).first().click();
  await page.getByText('Copied', { exact: true }).first().waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.ok(copied.includes('pwd') && copied.includes('cd /var/log'));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => document.fonts.ready);
  await checkWidth();
  await page.screenshot({ path: `${output}/article-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await checkWidth();
  await page.screenshot({ path: `${output}/article-desktop.png`, fullPage: true });

  await page.getByRole('link', { name: '#Terminal', exact: true }).click();
  await search.waitFor();
  await page.waitForFunction(() => document.querySelector('input[type="search"]').value === 'Terminal');
  assert.ok(await cards.count() > 0);

  // All article headings (including inline code) share the same TOC targets.
  await page.goto(`${baseURL}/blog`);
  const articleLinks = await page.locator('article h3').evaluateAll((headings) => headings.map((heading) => heading.closest('a').getAttribute('href')));
  for (const href of articleLinks) {
    await page.goto(`${baseURL}${href}`);
    await page.getByRole('navigation', { name: 'Table of contents' }).waitFor();
    for (const anchor of await contents.all()) assert.equal(await page.locator(await anchor.getAttribute('href')).count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await checkWidth();
  }
  await page.goto(`${baseURL}/blog/missing-article`);
  await page.getByRole('heading', { name: 'Article not found' }).waitFor();
  await page.getByRole('link', { name: 'Back to all articles' }).click();
  await page.getByRole('heading', { name: 'Latest articles' }).waitFor();
  assert.deepEqual(pageErrors, []);

  const smoothContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const smoothPage = await smoothContext.newPage();
  smoothPage.on('pageerror', (error) => pageErrors.push(error.message));
  await smoothPage.goto(`${baseURL}/blog/getting-started-with-linux-terminal`);
  await smoothPage.waitForFunction(() => window.lenis?.options.duration === 0.6);

  async function readerPosition() {
    return smoothPage.evaluate(() => ({
      page: scrollY,
      article: document.querySelector('article').scrollTop,
      frame: document.querySelector('article').getBoundingClientRect().top,
      sidebar: document.querySelector('nav[aria-label="Table of contents"]').getBoundingClientRect().top,
    }));
  }

  async function wheelAt(x, y) {
    await smoothPage.mouse.move(x, y);
    const before = await readerPosition();
    await smoothPage.mouse.wheel(0, 240);
    await smoothPage.waitForTimeout(120);
    const middle = await readerPosition();
    assert.ok(middle.article > before.article && middle.article < before.article + 480, 'Article wheel should interpolate instead of jumping');
    await smoothPage.waitForTimeout(650);
    const after = await readerPosition();
    assert.ok(Math.abs(after.article - before.article - 480) <= 2, 'Article wheel must settle at exactly 200% speed');
    assert.ok(Math.abs(after.page - before.page) <= 1, 'The page must stay still while the article scrolls');
    assert.ok(Math.abs(after.sidebar - before.sidebar) <= 1, 'The entire table of contents must stay still');
    assert.ok(Math.abs(after.frame - before.frame) <= 1, 'The white reading frame must stay still');
  }

  // Enter the reading phase. Further wheel input moves only the white pane.
  await smoothPage.mouse.move(30, 500);
  await smoothPage.mouse.wheel(0, 300);
  await smoothPage.waitForTimeout(750);
  assert.ok(Math.abs((await readerPosition()).frame - 94) <= 1);
  await wheelAt(30, 500);
  await wheelAt(500, 300);
  await smoothPage.getByRole('navigation', { name: 'Table of contents' }).locator('li a').nth(1).click();
  await smoothPage.waitForTimeout(750);
  const codeBox = await smoothPage.locator('pre').first().boundingBox();
  await wheelAt(codeBox.x + 50, codeBox.y + 30);
  await smoothPage.screenshot({ path: `${output}/reader-desktop.png` });

  // Returning to an earlier section must scroll inside the same fixed pane.
  const fixedPage = (await readerPosition()).page;
  await smoothPage.getByRole('navigation', { name: 'Table of contents' }).locator('li a').first().click();
  await smoothPage.waitForTimeout(750);
  const firstHeading = await smoothPage.locator('article h2').first().boundingBox();
  assert.ok(firstHeading.y >= 110 && firstHeading.y < 140);
  assert.ok(Math.abs((await readerPosition()).page - fixedPage) <= 1);

  // Keyboard reading also preserves the sidebar and frame.
  await smoothPage.getByRole('article', { name: 'Article content' }).focus();
  const keyboardStart = await readerPosition();
  await smoothPage.keyboard.press('PageDown');
  await smoothPage.waitForTimeout(750);
  assert.ok((await readerPosition()).article > keyboardStart.article + 500);
  assert.ok(Math.abs((await readerPosition()).page - fixedPage) <= 1);

  // Rapid wheel ticks must accumulate completely instead of cutting off the
  // unfinished animation from the preceding tick.
  await smoothPage.getByRole('navigation', { name: 'Table of contents' }).locator('li a').first().click();
  await smoothPage.waitForTimeout(750);
  await smoothPage.mouse.move(30, 500);
  const burstStart = await readerPosition();
  let previousPosition = burstStart.article;
  for (let index = 0; index < 5; index++) {
    await smoothPage.mouse.wheel(0, 120);
    await smoothPage.waitForTimeout(40);
    const sample = await readerPosition();
    assert.ok(sample.article >= previousPosition, 'Continuous wheel motion must not jump backward');
    previousPosition = sample.article;
  }
  await smoothPage.waitForTimeout(900);
  const burstEnd = await readerPosition();
  assert.ok(Math.abs(burstEnd.article - burstStart.article - 1200) <= 2, 'Five rapid wheel ticks must retain all input at 200% speed');
  assert.ok(Math.abs(burstEnd.sidebar - burstStart.sidebar) <= 1);

  await smoothPage.mouse.move(30, 700);
  for (let index = 0; index < 4; index++) await smoothPage.mouse.wheel(0, 1800);
  await smoothPage.waitForTimeout(750);
  const footer = await smoothPage.getByRole('navigation', { name: 'Footer links' }).boundingBox();
  assert.ok(footer.y > 64 && footer.y + footer.height < 1000, 'Footer links must be revealed at the bottom');
  await smoothPage.screenshot({ path: `${output}/article-footer.png` });
  const bottom = await smoothPage.evaluate(() => scrollY);
  await smoothPage.mouse.wheel(0, -240);
  await smoothPage.waitForTimeout(750);
  assert.ok(await smoothPage.evaluate(() => scrollY) < bottom - 200, 'Scrolling back up must remain available');

  // On the way back, the page returns to the reading frame before its
  // contents scroll upward; the sidebar then remains stationary again.
  const distanceToReader = (await readerPosition()).page - fixedPage;
  await smoothPage.mouse.wheel(0, -(distanceToReader + 240) / 2);
  await smoothPage.waitForTimeout(750);
  const reverseStart = await readerPosition();
  assert.ok(Math.abs(reverseStart.frame - 94) <= 1);
  await smoothPage.mouse.wheel(0, -120);
  await smoothPage.waitForTimeout(750);
  const reverseEnd = await readerPosition();
  assert.ok(reverseEnd.article < reverseStart.article - 200);
  assert.ok(Math.abs(reverseEnd.sidebar - reverseStart.sidebar) <= 1);

  await smoothPage.getByRole('navigation', { name: 'Table of contents' }).getByRole('link', { name: 'All articles', exact: true }).click();
  await smoothPage.getByRole('heading', { name: 'Latest articles' }).waitFor();
  await smoothPage.setViewportSize({ width: 390, height: 844 });
  await smoothPage.locator('main').hover();
  await smoothPage.mouse.wheel(0, 240);
  await smoothPage.waitForTimeout(250);
  assert.ok(await smoothPage.locator('main').evaluate((main) => main.scrollTop > 0), 'Blog list must scroll inside its viewport frame on mobile');
  assert.equal(await smoothPage.evaluate(() => scrollY), 0, 'Blog list must keep the document stationary');

  // Native wheel scrolling also works for people who prefer reduced motion.
  await page.goto(`${baseURL}/blog/getting-started-with-linux-terminal`);
  await page.locator('pre').first().waitFor();
  await page.evaluate(() => window.scrollTo(0, document.querySelector('pre').getBoundingClientRect().top + scrollY - 200));
  const nativeBox = await page.locator('pre').first().boundingBox();
  await page.mouse.move(nativeBox.x + 50, nativeBox.y + 30);
  const nativeStart = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(250);
  assert.ok(await page.evaluate(() => scrollY) > nativeStart + 200, 'Code blocks must allow native vertical scroll');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseURL}/blog/getting-started-with-linux-terminal`);
  await page.getByRole('article', { name: 'Article content' }).waitFor();
  await page.mouse.move(30, 500);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(250);
  const reducedStart = await page.evaluate(() => ({ page: scrollY, article: document.querySelector('article').scrollTop }));
  await page.mouse.wheel(0, 240);
  await page.waitForTimeout(250);
  const reducedEnd = await page.evaluate(() => ({ page: scrollY, article: document.querySelector('article').scrollTop }));
  assert.ok(Math.abs(reducedEnd.article - reducedStart.article - 480) <= 2, 'Reduced motion must retain 200% article wheel speed');
  assert.equal(reducedEnd.page, reducedStart.page);
  assert.deepEqual(pageErrors, []);
  await smoothContext.close();
  console.log('Blog checks passed: 200% wheel speed, rapid input accumulation, stationary sidebar/frame, contents links, keyboard, footer handoff, reverse scrolling, reduced motion, mobile layout, and no runtime errors.');
} finally {
  await browser.close();
}
