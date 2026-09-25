import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { TILED_CASES } from './manifest';

const INSTALL_DETERMINISM_HOOKS = `
  (function () {
    let seed = 0x2f6e2b1;
    Math.random = function () {
      seed |= 0;
      seed = (seed + 0x9e3779b9) | 0;
      let t = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  })();
  window.__exStep = async function (steps, stepMs) {
    const engine = window.___EXCALIBUR_DEVTOOL;
    if (!engine || !engine.clock) {
      return false;
    }
    if (!engine.clock.__isFrozen) {
      if (engine.clock.isRunning()) {
        engine.clock.stop();
      }
      engine.clock.__isFrozen = true;
      engine.clock.start = function () {};
    }
    var YIELD_EVERY = 3;
    for (let i = 0; i < steps; i++) {
      engine.clock.update(stepMs || 16.6);
      if ((i + 1) % YIELD_EVERY === 0 || i === steps - 1) {
        await new Promise(function (resolve) {
          requestAnimationFrame(resolve);
        });
      }
    }
    return true;
  };
`;

async function stepEngineClock(page: Page, steps: number) {
  await page.evaluate((steps) => (window as any).__exStep?.(steps), steps);
}

for (const tiledCase of TILED_CASES) {
  const file = tiledCase.file ?? 'index.html';
  const name = tiledCase.name ?? tiledCase.dir;
  const hash = tiledCase.hash ? `#${tiledCase.hash}` : '';

  test(`${name} matches golden master`, async ({ page }) => {
    test.skip(!!tiledCase.skip, tiledCase.skip);

    await page.addInitScript(INSTALL_DETERMINISM_HOOKS);
    await page.goto(`/${tiledCase.dir}/${file}${hash}`);

    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 10_000 });

    await stepEngineClock(page, 1);

    let playButtonReady = false;
    for (let i = 0; i < 200 && !playButtonReady; i++) {
      playButtonReady = await page.evaluate(() => {
        const root = document.getElementById('excalibur-play-root');
        if (!root) {
          return false;
        }
        if (root.getAttribute('aria-busy') === 'false') {
          return true;
        }
        const button = root.querySelector('button');
        return !!button && getComputedStyle(button).display !== 'none';
      });
      if (!playButtonReady) {
        await stepEngineClock(page, 2);
      }
    }
    const playButton = page.locator('#excalibur-play-root button');
    if (playButtonReady) {
      await playButton.click();
    }
    await expect(playButton, 'loader play button should be dismissed before capturing').toBeHidden();

    if (tiledCase.action) {
      await tiledCase.action(page, canvas);
    }

    await stepEngineClock(page, tiledCase.settleSteps ?? 10);

    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot(`${name}.png`, { maxDiffPixelRatio: tiledCase.tolerance ?? 0.01 });
  });
}
