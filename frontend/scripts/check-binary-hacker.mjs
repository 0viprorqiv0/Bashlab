import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Run with the frontend up: node scripts/check-binary-hacker.mjs
const origin = process.env.BINARY_TEST_URL || 'http://localhost:3000';
const screenshots = new URL('../../.impeccable/review/auth-binary/', import.meta.url);
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/api/auth/me', (route) => route.fulfill({ json: { user: null, profile: null } }));
await page.addInitScript(() => {
  window.binaryPaints = 0;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (...args) {
    if (this.canvas.closest('[data-binary-hacker]')) window.binaryPaints += 1;
    return original.apply(this, args);
  };
});

const scene = page.locator('[data-binary-hacker]');
const canvas = scene.locator('canvas');
const settle = async () => {
  try {
    await page.waitForFunction(() => document.querySelector('[data-binary-hacker]')?.dataset.transition === 'idle');
  } catch (error) {
    console.error(await scene.evaluate((element) => ({ view: element.dataset.view,
      transition: element.dataset.transition, paints: window.binaryPaints,
      hidden: document.hidden, hover: element.matches(':hover') })));
    throw error;
  }
};
const fingerprint = () => canvas.evaluate((element) => {
  const pixels = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
  let hash = 2166136261;
  let ink = 0;
  for (let i = 0; i < pixels.length; i += 1) {
    hash = Math.imul(hash ^ pixels[i], 16777619);
    if (i % 4 === 3 && pixels[i]) ink += 1;
  }
  return { hash: hash >>> 0, ink };
});

async function load(path) {
  await page.goto(`${origin}${path}`);
  await page.locator('h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
  if (page.viewportSize().width > 850 && ['/login', '/register'].includes(path)) {
    await page.waitForFunction(() => document.querySelector('[data-binary-hacker]')?.dataset.ready === 'true');
    await page.waitForFunction(() => window.binaryPaints > 0);
  }
}

async function layoutCheck(label) {
  const dimensions = await page.evaluate(() => {
    const form = document.querySelector('section[aria-labelledby="auth-title"]');
    const footer = document.querySelector('footer').getBoundingClientRect();
    const rect = form.getBoundingClientRect();
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight, formRight: rect.right,
      formBottom: rect.bottom, footerTop: footer.top, footerBottom: footer.bottom };
  });
  assert(dimensions.scrollWidth <= dimensions.width, `${label}: horizontal overflow`);
  assert(dimensions.scrollHeight <= dimensions.height + 1, `${label}: document overflow`);
  assert(dimensions.formRight <= dimensions.width, `${label}: form clipped`);
  if (dimensions.formBottom > dimensions.footerTop + 1) {
    const reachable = await page.evaluate(() => {
      const main = document.querySelector('main');
      main.scrollTop = main.scrollHeight;
      const bottom = document.querySelector('section[aria-labelledby="auth-title"]').getBoundingClientRect().bottom;
      const footerTop = document.querySelector('footer').getBoundingClientRect().top;
      main.scrollTop = 0;
      return bottom <= footerTop + 1;
    });
    assert(reachable, `${label}: form bottom cannot be reached by scrolling`);
  }
  assert(dimensions.footerBottom <= dimensions.height + 1, `${label}: footer outside viewport`);
}

try {
  for (const [width, height, name] of [[1440, 900, 'desktop'], [390, 844, 'mobile'],
    [1280, 720, 'compact'], [1024, 600, 'short'], [2558, 1277, 'reference']]) {
    await page.setViewportSize({ width, height });
    for (const path of ['/login', '/register']) {
      await load(path);
      await layoutCheck(`${path} ${width}x${height}`);
      if (width > 850) assert((await fingerprint()).ink > 10000, `${path}: binary silhouette is empty`);
      else assert(!(await scene.isVisible()), 'Mobile should prioritize the form');
      await page.screenshot({ path: new URL(`${path.slice(1)}-${name}.png`, screenshots).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await load('/login');
  const idle = await fingerprint();
  const paints = await page.evaluate(() => window.binaryPaints);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.binaryPaints), paints, 'Idle canvas should stop rendering');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.43, bounds.y + bounds.height * 0.38);
  await page.waitForTimeout(250);
  assert.notEqual((await fingerprint()).hash, idle.hash, 'Mouse should displace and light up binary');
  await page.screenshot({ path: new URL('login-hover.png', screenshots).pathname.replace(/^\/(\w:)/, '$1') });
  await page.mouse.move(20, 80);
  await page.waitForTimeout(1600);
  assert.equal((await fingerprint()).hash, idle.hash, 'Particles should return to the original silhouette');

  assert.equal(await scene.evaluate((element) => getComputedStyle(element).color), 'rgb(104, 223, 160)', 'Use the BashLab accent');
  await scene.click();
  assert.equal(await scene.getAttribute('aria-pressed'), 'true');
  assert.equal(await scene.getAttribute('data-transition'), 'running', 'Click should start the reveal wave');
  await page.waitForTimeout(120);
  const duringReveal = await fingerprint();
  assert.notEqual(duringReveal.hash, idle.hash, 'Binary should transform during the reveal');
  await page.screenshot({ path: new URL('login-transition.png', screenshots).pathname.replace(/^\/(\w:)/, '$1') });
  await settle();
  const imageView = await fingerprint();
  assert(imageView.ink > idle.ink, 'First click should reveal the full hacker image');
  const imageColor = await scene.locator('img').evaluate(async (element) => {
    await element.decode();
    const mask = document.createElement('canvas');
    mask.width = element.naturalWidth;
    mask.height = element.naturalHeight;
    const context = mask.getContext('2d');
    context.drawImage(element, 0, 0);
    const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
    let bright = 0;
    let lime = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 240 || pixels[index + 1] < 210) continue;
      bright += 1;
      if (pixels[index] / pixels[index + 1] > 0.65 && pixels[index + 2] / pixels[index + 1] < 0.5) lime += 1;
    }
    return { bright, lime };
  });
  assert(imageColor.bright > 1000, 'The hacker image should retain bright outlines');
  assert(imageColor.lime / imageColor.bright < 0.01, 'The revealed image should use mint highlights instead of yellow lime');
  assert((await scene.locator('img').getAttribute('src')).includes('binary-hacker-bashlab.png'), 'Use the recolored PNG asset');
  assert(await canvas.isVisible(), 'Canvas should render the revealed image');
  const imagePaints = await page.evaluate(() => window.binaryPaints);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.binaryPaints), imagePaints, 'Image view should stop particle rendering');
  await page.screenshot({ path: new URL('login-original.png', screenshots).pathname.replace(/^\/(\w:)/, '$1') });
  await scene.click();
  await page.mouse.move(20, 80);
  await settle();
  assert.equal(await scene.getAttribute('aria-pressed'), 'false');
  assert(await canvas.isVisible(), 'Second click should restore binary');
  assert.equal((await fingerprint()).hash, idle.hash, 'Toggle should restore the original particle layout');
  await scene.focus();
  await page.keyboard.press('Enter');
  assert.equal(await scene.getAttribute('aria-pressed'), 'true', 'Enter should reveal the image');
  await page.keyboard.press('Space');
  await settle();
  assert.equal(await scene.getAttribute('aria-pressed'), 'false', 'Space should restore binary');
  assert.equal((await fingerprint()).hash, idle.hash);

  // Reverse an in-flight transition without leaving a partial reveal or an animation loop.
  await scene.click({ position: { x: bounds.width * 0.28, y: bounds.height * 0.35 } });
  await page.waitForTimeout(100);
  await scene.click({ position: { x: bounds.width * 0.72, y: bounds.height * 0.6 } });
  await page.mouse.move(20, 80);
  await settle();
  assert.equal(await scene.getAttribute('aria-pressed'), 'false');
  assert.equal((await fingerprint()).hash, idle.hash, 'Interrupted transitions should restore the silhouette');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100);
  await page.mouse.move(bounds.x + bounds.width * 0.43, bounds.y + bounds.height * 0.38);
  await page.waitForTimeout(100);
  const reduced = await fingerprint();
  const reducedPaints = await page.evaluate(() => window.binaryPaints);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.binaryPaints), reducedPaints, 'Reduced motion should not loop');
  assert.notEqual(reduced.hash, idle.hash, 'Reduced motion should retain highlight feedback');
  await page.mouse.move(20, 80);
  await page.waitForTimeout(100);
  assert.equal((await fingerprint()).hash, idle.hash);
  await scene.focus();
  await page.keyboard.press('Enter');
  await settle();
  assert.equal((await fingerprint()).hash, imageView.hash, 'Reduced motion should still reveal the complete image');
  await page.keyboard.press('Space');
  await settle();
  assert.equal((await fingerprint()).hash, idle.hash);

  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByText('Enter a valid email address.', { exact: true }).waitFor();
  assert(await page.locator('#email').evaluate((element) => element === document.activeElement));
  await page.keyboard.press('Tab');
  await load('/register');
  await scene.click();
  assert.equal(await scene.getAttribute('aria-pressed'), 'true', 'Signup should reveal the image');
  await scene.click();
  assert.equal(await scene.getAttribute('aria-pressed'), 'false', 'Signup should return to binary');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Agree to the terms to continue.', { exact: true }).waitFor();
  await load('/forgot-password');
  assert.equal(await scene.count(), 0, 'Other authentication pages should keep their existing story');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Binary hacker: reveal/reverse wave, interrupted clicks, keyboard toggle, theme color, desktop/mobile layout, hover/return, idle rendering, reduced motion and validation checks passed.');
} finally {
  await browser.close();
}
