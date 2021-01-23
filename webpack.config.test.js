const path = require("path")
module.exports = {
 entry: './test/test.ts',
 mode: 'development',
 devtool: 'source-map',
 module: {
   rules: [
     {
       test: /\.tsx?$/,
       use: 'ts-loader',
       exclude: /node_modules/
     }
   ]
 },
 node: {
   fs: "empty"
 },
 resolve: {
   extensions: [".tsx", ".ts", ".js"],
   alias: {
      "@excalibur-tiled": path.resolve(__dirname, './src/')
   }
 },
 output: {
   filename: 'test/test.js',
   path: __dirname,
   libraryTarget: "umd"
 },
 externals: {
   "excalibur": {
       commonjs: "excalibur",
       commonjs2: "excalibur",
       amd: "excalibur",
       root: "ex"
    },
    "excalibur-tiled": {
      commonjs: "excalibur-tiled",
      commonjs2: "excalibur-tiled",
      amd: "excalibur-tiled",
      root: "ExtensionsTiled"
    }
 }
};