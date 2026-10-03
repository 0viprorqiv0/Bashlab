const { test, expect } = require('../support/session');

test('shell 101 lab page does not return HTTP 500', async ({ page }) => {
  const response = await page.goto('/courses/shell-101/labs/5');
  expect(response.status()).not.toBe(500);
});
