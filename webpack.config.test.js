const path = require("path")
module.exports = {
 entry: './test/test.ts',
 mode: 'development',
 devtool: 'source-map',
 module: {
   rules: [
     {
       test: /\.ts$/,
       use: 'ts-loader',
       exclude: /node_modules/
     }
   ]
 },
 node: {
   fs: "empty"
 },
 resolve: {
   extensions: [".ts", ".js"],
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
    }
 }
};