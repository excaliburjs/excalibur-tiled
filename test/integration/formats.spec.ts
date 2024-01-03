import { test, expect } from '@playwright/test';

test('example-city.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('margin.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#margin.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('collider.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#collider.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('example-city-external-tsx.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city-external-tsx.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('example-city-base64.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city-base64.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city-gzip.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city-gzip.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city-zlib.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city-zlib.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city-zstd.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/example/formats/#example-city-zstd.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

