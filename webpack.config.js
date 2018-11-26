const path = require("path")
const webpack = require("webpack")

module.exports = {
 entry: {
    'excalibur-tiled': './src/index.ts',
    'excalibur-tiled.min': './src/index.ts'
 },
 module: {
   rules: [
     {
       test: /\.tsx?$/,
       use: 'ts-loader',
       exclude: /node_modules/
     }
   ]
 },
 devtool: 'source-map',
 devServer: {
   contentBase: '.',
 },
 resolve: {
   extensions: [".tsx", ".ts", ".js"]
 },
 output: {
   filename: "[name].js",
   path: path.join(__dirname, "dist"),
   library: ["Extensions","Tiled"],
   libraryTarget: "umd"
 },
 plugins: [
   new webpack.optimize.UglifyJsPlugin({
     minimize: true,
     sourceMap: true,
     include: /\.min\.js$/,
   })
 ],
 externals: {
    "excalibur": {
       commonjs: "excalibur",
       commonjs2: "excalibur",
       amd: "excalibur",
       root: "ex"
    }
 }
};