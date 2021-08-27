const fs = require('fs');
var static = require('node-static');
const http = require('http');

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const puppeteer = require('puppeteer');
process.env.CHROME_BIN = require('puppeteer').executablePath();

const file = new(static.Server)('./example');
const server = http.createServer(function (req, res) {
    file.serve(req, res);
  }).listen(8080);


function imageMatch(expectedFile, actualFile) {
    const expected = PNG.sync.read(fs.readFileSync(expectedFile));
    const actual = PNG.sync.read(fs.readFileSync(actualFile));
    const {width, height} = expected;
    const diff = new PNG({width, height});
    const pixelDiff = pixelmatch(expected.data, actual.data, diff.data, width, height, {threshold: 0.1});
    
    if (pixelDiff > 100) {
        console.error(`Image ${expectedFile} did not match acutal ${actualFile}, ${pixelDiff} different!`);
        const diffImage = PNG.sync.write(diff);
        console.log('Diff image: ', 'data:image/png;base64,' + diffImage.toString('base64'));
        const fileSplit = actualFile.split('/');
        fs.writeFileSync('./test/integration/images/' + 'diff-'+ fileSplit[fileSplit.length-1], diffImage)
        process.exit(1);
    }
}

const isLoaded = async (page) => {
   await page.waitForSelector('#excalibur-play', {visible: true});
   await page.waitForTimeout(1000); // give it a second
}

const clickPlay = async (page) => {
   const start = await page.$('#excalibur-play');
   await start.click();
   // Left-over roots :( excalibur bug
   await page.evaluate(() => {
      const root = document.querySelector('#excalibur-play-root');
      document.body.removeChild(root);
   });
}

const selectMap = async (page, map) => {
   const option = (await page.$x(
      `//*[@id = "select-map"]/option[text() = "${map}"]`
   ))[0];
   const value = await (await option.getProperty('value')).jsonValue();
   await page.select('#select-map', value);
}

const expectMap = async (page, map, name, shouldLoad = true) => {
   console.log(`TEST: ${map}`)
   if (shouldLoad) {
      await selectMap(page, map);
      await isLoaded(page);
   }
   await page.screenshot({path: `./test/integration/images/actual-loaded-${name}.png`});

   await clickPlay(page);
   await page.waitForTimeout(2000); // camera centering
   await page.screenshot({path: `./test/integration/images/actual-play-${name}.png`});

   return {
      
      toBe: (expected) => {
         imageMatch('./test/integration/images/expected-loaded.png', `./test/integration/images/actual-loaded-${name}.png`);
         imageMatch(`./test/integration/images/${expected}.png`, `./test/integration/images/actual-play-${name}.png`);
      }
   }
}

(async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: false,
            args: [
              '--window-size=800,600',
            ],
          });
        const page = await browser.newPage();
        await page.goto('http://localhost:8080/')
        
        await isLoaded(page);

        (await expectMap(page, 'tmx map', 'tmx', false)).toBe('expected-play');
        (await expectMap(page, 'tmx map - external tsx', 'external-tmx')).toBe('expected-play');
        (await expectMap(page, 'tmx base64 map', 'base64-tmx')).toBe('expected-play');
        (await expectMap(page, 'tmx gzip map', 'gzip-tmx')).toBe('expected-play');
        (await expectMap(page, 'tmx zlib map', 'zlib-tmx')).toBe('expected-play');
        (await expectMap(page, 'tmx zstd map', 'zstd-tmx')).toBe('expected-play');
        (await expectMap(page, 'json map', 'json')).toBe('expected-play');
        (await expectMap(page, 'v1 map', 'v1')).toBe('expected-play-v1');
        (await expectMap(page, 'v1 external tileset map', 'v1-external')).toBe('expected-play-v1-external');
        (await expectMap(page, 'v0 map gzip', 'v0-gzip')).toBe('expected-play-v0');
        (await expectMap(page, 'v0 map zlib', 'v0-zlib')).toBe('expected-play-v0');

        await browser.close();

        console.log('Test Success!');

    } finally {
        server.close();
    }
})();