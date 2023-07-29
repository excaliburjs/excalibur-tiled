import { expectLoaded, expectPage, test } from '@excaliburjs/testing'

const selectMap = async (page, map: string) => {
   const option = (await page.$x(
      `//*[@id = "select-map"]/option[text() = "${map}"]`
   ))[0];
   const value = await (await option.getProperty('value')).jsonValue();
   await page.select('#select-map', value);
}

const dashify = (string: string) => {
   return string.replace(/\s/g, '-')
}

test('Tiled Tests', async (page) => {
   let mapTypes = [
      'tmx',
      'tmx external tsx',
      'tmx base64',
      'tmx gzip',
      'tmx zlib',
      'tmx zstd',
      'json',
   ]
   for (let map of mapTypes) {
      await selectMap(page, map);
      await expectLoaded();
      await expectPage(map, `./test/integration/images/actual-${dashify(map)}.png`).toBe('./test/integration/images/expected-play.png');
   }

   const legacyMapTypes = [
      'margin.tmx',
      'isometric',
      'v1',
      'v1 external tileset',
      'v0 gzip',
      'v0 zlib',
      'test spacing',
   ];

   for (let legacyMap of legacyMapTypes) {
      await selectMap(page, legacyMap);
      await expectLoaded();
      await expectPage(legacyMap, `./test/integration/images/actual-${dashify(legacyMap)}.png`).toBe(`./test/integration/images/expected-play-${dashify(legacyMap)}.png`);
   }
});