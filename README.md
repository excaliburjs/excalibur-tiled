# Tiled Extension for Excalibur.js

This extension adds support for a new `TiledResource` to Excalibur.js to read [Tiled map editor](http://mapeditor.org) files (currently only JSON).

## Quickstart

Install using [npm](http://npmjs.org):

    npm install @excaliburjs/excalibur-tiled

## ES2015 (TS/JS)

You can also use ES module syntax with TypeScript or Babel:

```ts
import * as ex from 'excalibur';
import { TiledResource } from '@excaliburjs/excalibur-tiled';

// Create tiled map resource, pointing to static asset path
const map = new TiledResource("/assets/map.json");

// Create a loader and reference the map
const loader = new ex.Loader([map]);

// Start the game (starts the loader)
game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   // Process the data in the map as you like
   map.data.tilesets.forEach(function(ts) {
      console.log(ts.image, ts.imageTexture.isLoaded());
   });
   
   // get a Excalibur `TileMap` instance
   const tm = map.getTileMap();
   
   // draw the tile map
   game.add(tm);
   
});
```

[Parcel.js](https://parceljs.org) is one of the easiest ways to create an Excalibur game, see this [CodeSandbox sample](https://codesandbox.io/s/excalibur-tiled-example-4f83x?fontsize=14).

## Standalone Script File (JS)

Reference **dist/excalibur-tiled.min.js** in your page and then you can use it like this:

```js

// New game
const game = new ex.Engine({ width: 500, height: 400, canvasElementId: "game" });

// Create a new TiledResource loadable
const map = new Extensions.Tiled.TiledResource("test.json");

// Create a loader and reference the map
const loader = new ex.Loader([map]);

// Start the game (starts the loader)
game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   // Process the data in the map as you like
   map.data.tilesets.forEach(function(ts) {
      console.log(ts.image, ts.imageTexture.isLoaded());
   });
   
   // get a Excalibur `TileMap` instance
   const tm = map.getTileMap();
   
   // draw the tile map
   game.add(tm);
   
});
```

The dist uses a UMD build and will attach itself to the `ex.Extensions.Tiled` global if running in the browser standalone.

## Documentation

The `TiledResource` loadable will load the map file you specify along with any referenced tile set assets (images). 

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

When your game loads and the extension loads your map file (`/assets/maps/map.json`), the paths will be loaded **relative** to the map JSON file, so they will return 404 responses:

```
GET /assets/maps/map.png -> 404 Not Found
GET /assets/maps/map.tsx -> 404 Not Found
```

If you need to override this behavior, you can set `imagePathAccessor` or `externalTilesetPathAccessor` to a custom function that takes two parameters: path and `ITiledTileSet` data.

```js
// Create a new TiledResource loadable
var map = new Extensions.Tiled.TiledResource("map.json");

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

Only supports JSON file format with CSV or Base64 (uncompressed) tile layer format.

## Contributing

- Built with webpack 3
- Uses webpack-dev-server

To start development server:

    npm start

To watch:

    npm run watch

To compile only:

    npm run build

To compile test:

    npm test
