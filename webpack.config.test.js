module.exports = {
 entry: './test/test.ts',
 module: {
   rules: [
     {
       test: /\.tsx?$/,
       use: 'ts-loader',
       exclude: /node_modules/
     }
   ]
 },
 resolve: {
   extensions: [".tsx", ".ts", ".js"]
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