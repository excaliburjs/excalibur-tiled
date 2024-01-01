const path = require("path")
module.exports = {
   mode: 'development',
   devtool: 'source-map',
   devServer: {
      static: '.',
      compress: false,
      allowedHosts: 'all',
      devMiddleware: {
         mimeTypeDefault: 'text/xml',
         mimeTypes: {
            '.tmx': 'text/xml',
            '.tsx': 'text/xml',
            '.tx': 'text/xml',
            '.tmj': 'application/json',
            '.tsj': 'application/json',
            '.tj': 'application/json',
         }
      },
   },
   entry: {
      test: './example/game.ts',
      orthogonal: './example/orthogonal/orthogonal.ts',
      isometric: './example/isometric/isometric.ts',
   },
   output: {
      filename: 'example/[name]/[name].js',
      path: __dirname,
      libraryTarget: "umd"
   },
   module: {
      rules: [
         {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
         }
      ]
   },
   resolve: {
      fallback: {
         fs: false
      },
      extensions: [".ts", ".js"],
      alias: {
         "@excalibur-tiled": path.resolve(__dirname, './src/')
      }
   }
};