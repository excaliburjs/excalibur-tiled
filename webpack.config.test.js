const path = require("path")
module.exports = {
 entry: './example/game.ts',
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
   filename: 'example/game.js',
   path: __dirname,
   libraryTarget: "umd"
 }
};