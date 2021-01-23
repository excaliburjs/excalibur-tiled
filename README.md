# Tiled Extension for Excalibur.js

This extension adds support for a new `TiledMapeResource` to Excalibur.js to read [Tiled map editor](http://mapeditor.org) files (now all types supported!).

## Features

* Parse default Tiled tmx files
  - Supports all Tiled compressions zlib, gzip, and zstd
* Parse Tiled exported json files
* New TypeScript based object model for working with Tiled data
* Automatic Excalibur wiring for certain Tiled properties and objects:
  * Camera
  * Colliders
  * Solid TileMap Layers

### Excalibur Wiring




## Quickstart

Install using [npm](http://npmjs.org):

    npm install @excaliburjs/plugin-tiled

## ES2015 (TS/JS)

The ES2015 `import` syntax is the recommended way to use Excalibur with Excalibur Tiled and is supported through a module loader like [webpack](https://github.com/excaliburjs/example-ts-webpack) or [Parcel](https://parceljs.org) with TypeScript or Babel:

```ts
import * as ex from 'excalibur';
import { TiledMapeResource } from '@excaliburjs/plugin-tiled';

// Create tiled map resource, pointing to static asset path
const tiledMap = new TiledMapResource("/assets/map.tmx");

// Create a loader and reference the map
const loader = new ex.Loader([tiledMap]);

// Start the game (starts the loader)
game.start(loader).then(function() {
   
   console.log("Game loaded");
   tiledMap.addTiledMapToScene(game.currentScene);
   
});
```

For reference, see this [CodeSandbox sample](https://codesandbox.io/s/excalibur-tiled-example-4f83x?fontsize=14) for a Parcel-based game.

### Webpack Configuration

You will need to modify your webpack configuration to load Tiled JSON files using `file-loader` and then ensure any tilemap images are copied to the same output directory as your bundle, see [this example-ts-webpack branch](https://github.com/excaliburjs/example-ts-webpack/tree/feature/excalibur-tiled-with-webpack) for an example.

## Standalone Script File (JS)

In your HTML file, add a reference **dist/excalibur-tiled.min.js** in your page:

```html
<script type="text/javascript" src="node_modules/excalibur/dist/excalibur.min.js"></script>
<script type="text/javascript" src="node_modules/@excaliburjs/excalibur-tiled/dist/excalibur-tiled.min.js"></script>
```

and then you can use it like this:

```js

// New game
const game = new ex.Engine({ width: 500, height: 400, canvasElementId: "game" });

// Create a new TiledMapResource loadable
const tiledMap = new ex.Plugin.Tiled.TiledMapResource("test.tmx");

// Create a loader and reference the map
const loader = new ex.Loader([tiledMap]);

// Start the game (starts the loader)
game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   tiledMap.addTiledMapToScene(game.currentScene);
   
});
```

The dist uses a UMD build and will attach itself to the `ex.Plugin.Tiled` global if running in the browser standalone.

## Documentation

The `TiledMapResource` loadable will load the map file you specify along with any referenced tile set assets (images). 

### Handling Tiled Paths

The image paths and external tileset paths loaded will be relative to where the exported file was saved.

For example, let's say this is your source working directory structure when you make your Tiled map:

```
work/
  - map.tmx
  - map.png
  - map.tsx
```

The tileset image and/or source are stored next to the TMX file.

So when you export to JSON, say to **map.json**, Tiled will save the paths like this:

```js
{
  "tilesets": [
    {
      "image": "map.png"
    },
    {
      "source": "map.tsx"
    }
  ]
}
```

But for your game, your file structure looks like this:

```
assets/
  - maps/map.json
  - tx/map.png
  - tsx/map.tsx
```

When your game loads and the extension loads your map file (`/assets/maps/map.tmx`), the paths will be loaded **relative** to the map tmx file, so they will return 404 responses:

```
GET /assets/maps/map.png -> 404 Not Found
GET /assets/maps/map.tsx -> 404 Not Found
```

If you need to override this behavior, you can set `imagePathAccessor` or `externalTilesetPathAccessor` to a custom function that takes two parameters: path and `TiledTileSet` data.

```js
// Create a new TiledResource loadable
var map = new ex.Plugin.Tiled.TiledMapResource("map.tmx");

map.imagePathAccessor = function (path, tileset) {
   return "/assets/tx/" + path;
}
map.externalTilesetPathAccessor = function (path, tileset) {
   return "/assets/tsx/" + path;
}
```

That will fix the paths:

```
GET /assets/tx/map.png -> 200 OK
GET /assets/tsx/map.tsx -> 200 OK
```

### Supported Formats

Supports all currently supported Tiled 1.4.3 formats!

* TMX - CSV, Base64 + Compressed (`zlib`, `gzip`, and `zstd`)
* JSON Tiled Export

## Contributing

- Built with webpack 4
- Uses webpack-dev-server

To start development server:

    npm start

To watch:

    npm run watch

To compile only:

    npm run build

To compile test:

    npm test
