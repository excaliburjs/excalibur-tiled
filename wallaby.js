const path = require('path');
const webpack = require('webpack');

module.exports = function (wallaby) {
  return {
    files: [
      { pattern: 'src/**/*.ts', load: false },
      { pattern: 'src/spec/images/**/*.mp3' },
      { pattern: 'src/spec/images/**/*.ogg' },
      { pattern: 'src/spec/images/**/*.png' },
      { pattern: 'src/spec/images/**/*.gif' },
      { pattern: 'src/spec/images/**/*.txt' },
      { pattern: 'src/spec/images/**/*.css' },
      { pattern: 'src/spec/images/**/*.woff2' },
      { pattern: 'test/unit/**/*.tmx' },
      { pattern: 'test/unit/**/*.tsx' },
      { pattern: 'test/unit/**/*.tmj' },
      { pattern: 'test/unit/**/*.tsj' }
    ],
    tests: ['./test/unit/*.spec.ts'],
    env: {
      kind: 'chrome',
      // This is tied to the puppeteer install
      // runner: './node_modules/puppeteer/.local-chromium/win64-1011831/chrome-win/chrome.exe',
      params: {
        runner: '--headless --mute-audio --autoplay-policy=no-user-gesture-required'
      }
    },
    testFramework: 'jasmine',
    setup: function () {
      window.__moduleBundler.loadTests();
    },
    postprocessor: wallaby.postprocessors.webpack({
      mode: 'none',
      devtool: 'source-map',
      resolve: {
        extensions: ['.ts', '.js'],
        alias: {
          '@excalibur-tiled': path.resolve(__dirname, './src/')
        }
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.__EX_VERSION': "'test-runner'"
        })
      ],
      module: {
         rules: [
            {
              test: /\.ts$/,
              use: 'ts-loader',
              exclude: /node_modules/
            },
            {
               test: [/\.tm(x|j)$/, /\.ts(x|j)$/],
               use: 'raw-loader'
            }
          ]
      }
    })
  };
};
