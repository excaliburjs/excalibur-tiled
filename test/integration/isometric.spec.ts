import { test, expect } from '@playwright/test';

test('isometric matches', async ({ page }) => {
  await page.goto('http://localhost:8080/example/isometric/');
  await page.click('#excalibur-play');
  await page.waitForTimeout(100);
  await expect(page).toHaveScreenshot();
});

