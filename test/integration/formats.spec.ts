import { test, expect } from '@playwright/test';

test.only('example-city.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('margin.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#margin.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('collider.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#collider.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('example-city-external-tsx.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city-external-tsx.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

test('example-city-base64.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city-base64.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city-gzip.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city-gzip.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city-zlib.tmx', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city-zlib.tmx');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test.skip('example-city-zstd.tmx', async ({ page }) => {
  // FIXME zstd seems to be broken in safari 13.1 i64 integers are not supported
  await page.goto('http://localhost:8080/formats/#example-city-zstd.tmx');
  await page.waitForTimeout(33_500); 
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('example-city.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#example-city.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('test-spacing.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#test-spacing.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('test-v1.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#test-v1.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('test-v1-external.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#test-v1-external.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('test-gzip.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#test-gzip.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});
test('test-zlib.json', async ({ page }) => {
  await page.goto('http://localhost:8080/formats/#test-zlib.json');
  await page.click('#excalibur-play');
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot();
});

