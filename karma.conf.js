const path = require('path');
const webpack = require('webpack');
const stdLibBrowser = require('node-stdlib-browser');
// Karma configuration
// Generated on Sun Jan 31 2021 14:58:28 GMT-0600 (Central Standard Time)

const webpackConfig = require('./webpack.config')

const bufferPath = path.resolve(__dirname, 'node_modules/node-stdlib-browser/node_modules/buffer/index.js');

const baseWebpack = webpackConfig({output: 'umd'}, {mode: 'development'});

module.exports = function(config) {
  config.set({
   client: {
      // Excalibur logs / console logs suppressed when captureConsole = false;
      captureConsole: false,
   },

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    webpack: {
      ...baseWebpack,
      resolve: {
        ...baseWebpack.resolve,
        fallback: {
          ...baseWebpack.resolve?.fallback,
          buffer: bufferPath,
          os: stdLibBrowser.os,
          path: stdLibBrowser.path,
          util: stdLibBrowser.util,
          assert: stdLibBrowser.assert,
          events: stdLibBrowser.events,
          stream: stdLibBrowser.stream,
          string_decoder: stdLibBrowser.string_decoder,
          crypto: stdLibBrowser.crypto,
          url: stdLibBrowser.url,
        }
      },
      plugins: [
         new webpack.ProvidePlugin({
            Buffer: [bufferPath, 'Buffer'],
            process: stdLibBrowser.process,
         })
      ]
    },


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'webpack'],

    proxies: {
      // smooths over loading files because karma prepends '/base/' to everything
      '/src/' : '/base/src/',
      '/test/' : '/base/test/',
    },


    // list of files / patterns to load in the browser
    files: [
      'node_modules/excalibur/build/dist/excalibur.js',
      'test/unit/_boot.ts',
      { pattern: './src/**/*.js.map', included: false, served: true },
      { pattern: './test/**/*.js.map', included: false, served: true },
      { pattern: './example/**/*.tmx', included: false, served: true },
      { pattern: './example/**/*.tsx', included: false, served: true },
      { pattern: './example/**/*.png', included: false, served: true },
      { pattern: './test/**/*.tmx', included: false, served: true },
      { pattern: './test/**/*.tsx', included: false, served: true },
      { pattern: './test/**/*.tx', included: false, served: true },
      { pattern: './test/**/*.tmj', included: false, served: true },
      { pattern: './test/**/*.tsj', included: false, served: true },
      { pattern: './test/**/*.tj', included: false, served: true },
      { pattern: './test/**/*.png', included: false, served: true }
    ],


    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
       'test/unit/_boot.ts': ['webpack']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
