// Karma configuration
// Generated on Sun Jan 31 2021 14:58:28 GMT-0600 (Central Standard Time)

const webpack = require('./webpack.config')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = function(config) {
  config.set({
   client: {
      // Excalibur logs / console logs suppressed when captureConsole = false;
      captureConsole: false,
   },

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    webpack: {
      ...webpack,
      ...{ plugins: [
         new NodePolyfillPlugin() // for json-diff tests in parser
      ]}
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
