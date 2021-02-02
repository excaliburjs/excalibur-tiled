const path = require("path");
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
 entry: {
    'excalibur-tiled': './src/index.ts',
    'excalibur-tiled.min': './src/index.ts',
 },
 module: {
   rules: [
     {
       test: /\.ts$/,
       use: 'ts-loader',
       exclude: /node_modules/
     },
     {
        test: [/\.tmx$/, /\.tsx$/],
        use: 'raw-loader'
     }
   ]
 },
 node: {
   fs: "empty"
 },
 mode: 'development',
 devtool: 'source-map',
 devServer: {
   contentBase: '.',
 },
 resolve: {
   extensions: [".ts", ".js"],
   alias: {
      "@excalibur-tiled": path.resolve(__dirname, './src/')
   }
 },
 output: {
   filename: "[name].js",
   path: path.join(__dirname, "dist"),
   library: ["ex", "Plugin", "Tiled"],
   libraryTarget: "umd"
 },
 optimization: {
   minimize: true,
 },
 externals: {
    "excalibur": {
       commonjs: "excalibur",
       commonjs2: "excalibur",
       amd: "excalibur",
       root: "ex"
   }
 },
 plugins: [
   //  new BundleAnalyzerPlugin()
 ]
};