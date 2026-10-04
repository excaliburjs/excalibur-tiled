import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const exampleDir = __dirname;
const repoRoot = resolve(exampleDir, '..');

const TILED_MIME_TYPES: Record<string, string> = {
  '.tmx': 'text/xml',
  '.tsx': 'text/xml',
  '.tx': 'text/xml',
  '.tmj': 'application/json',
  '.tsj': 'application/json',
  '.tj': 'application/json'
};

function serveTiledAssetsRaw(): Plugin {
  return {
    name: 'tiled-assets-raw',
    configureServer(server) {
      // Registered inside configureServer's body (rather than in a returned callback) so it
      // runs *before* Vite's internal transform middleware gets a chance at the request.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0].split('#')[0];
        const mime = TILED_MIME_TYPES[extname(url).toLowerCase()];
        if (!mime) {
          return next();
        }
        const filePath = normalize(join(exampleDir, decodeURIComponent(url)));
        if (!filePath.startsWith(exampleDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
          return next();
        }
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(res);
      });
    }
  };
}

export default defineConfig({
  root: exampleDir,
  plugins: [serveTiledAssetsRaw()],
  resolve: {
    alias: {
      // The examples import the plugin through the same alias the webpack build uses.
      '@excalibur-tiled': resolve(repoRoot, 'src/index.ts')
    }
  },
  server: {
    fs: {
      // src/ lives outside the vite root
      allow: [repoRoot]
    }
  },
  optimizeDeps: {
    // jsdom is only reached in the Node code path of the parser (see
    // src/parser/tiled-parser.ts) and is marked external by the webpack build too.
    exclude: ['jsdom']
  }
});
