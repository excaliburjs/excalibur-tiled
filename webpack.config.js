const path = require("path");
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

/**
 * @returns {import('webpack').Configuration}
 */
module.exports = (env, argv) => {
   const { mode } = argv;

   const umdOutput = {
      path: path.resolve(__dirname, 'build/umd'),
      filename: mode === 'development' ? '[name].development.js' : '[name].js',
      library: {
         name: ["ex", "Plugin", "Tiled"],
         type: 'umd'
      }
   };

   const esmOutput = {
      path: path.resolve(__dirname, 'build/esm'),
      filename: mode === 'development' ? '[name].development.js' : '[name].js',
      module: true,
      library: {
         type: 'module'
      }
   };
   return {
      entry: {
         'excalibur-tiled': './src/index.ts',
         'excalibur-tiled.min': './src/index.ts',
      },
      module: {
         rules: [
            {
               test: /\.ts$/,
               loader: 'ts-loader',
               exclude: /node_modules/,
               options: {
                  compilerOptions: {
                     outDir: env.output === 'esm' ? esmOutput.path : umdOutput.path
                  }
               }
            },
            {
               test: [/\.tm(x|j)$/, /\.ts(x|j)$/],
               loader: 'raw-loader'
            }
         ]
      },
      mode,
      devtool: 'source-map',
      devServer: {
         static: '.',
      },
      resolve: {
         fallback: {
            fs: false
         },
         extensions: [".ts", ".js"],
         alias: {
            "@excalibur-tiled": path.resolve(__dirname, './src/')
         }
      },
      output: env.output === 'esm' ? esmOutput : umdOutput,
      experiments: env.output === 'esm' ? { outputModule: true } : {},
      optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({
            include: /\.min\.js$/
          })
        ]
      },
      externals: env.output === 'esm' ? ["excalibur", "jsdom"] : {
         "excalibur": {
            commonjs: "excalibur",
            commonjs2: "excalibur",
            amd: "excalibur",
            root: "ex"
         },
         "jsdom": {
            commonjs: "jsdom",
            commonjs2: "jsdom",
            amd: "jsdom",
            umd: "jsdom",
            root: "jsdom"
         }
      },
      plugins: [
         //  new BundleAnalyzerPlugin()
      ]
   };
};