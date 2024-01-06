import { test, expect } from '@playwright/test';

test('orthogonal infinite matches', async ({ page }) => {
  await page.goto('http://localhost:8080/orthogonal-infinite/');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

