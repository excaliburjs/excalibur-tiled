# Tiled Plugin for Excalibur.js

This extension adds support for tile maps from all [Tiled map editor](http://mapeditor.org) files in Excalibur. Use the `TiledMapResource` to load and interact with Tiled based maps!

![](./readme/example.gif)

## Quickstart

Install using [npm](http://npmjs.org):

```
> npm install @excaliburjs/plugin-tiled
```

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

## Features

* Parse default Tiled tmx files
  - Supports all Tiled compressions zlib, gzip, and zstd
* Parse Tiled exported json files
* Supports external tilesets `.tsx` and `json`
* New TypeScript based object model for working with Tiled data
  * Query for layers by property
  * Query for objects by property
  * Easy helpers to locate Polygons, Polylines, and Text
* Automatic Excalibur wiring for certain Tiled properties and objects:
  * Camera
  * Colliders
  * Solid TileMap Layers
  * Tiled Text
  * Inserted Tiled Tiles

### Excalibur Wiring

You may opt-in to the Excalibur wiring by calling `addTiledMapToScene(someScene)`

```typescript
// After loading tiledMapResource
tiledMapResource.addTiledMapToScene(game.currentScene);
```

* **Only object layers with `"excalibur"=true` are parsed for objects**. These object layers can be retrieved with

   ```typescript
   const objects: TiledObjectGroup[] = tiledMapResource.getExcaliburObjects();
   ```

  ![](./readme/excalibur-object.png)

* **Camera Position & Zoom** - You may set the starting camera position and zoom

  ![](./readme/camera.png)
  - In an object layer with a custom property "excalibur"=true
  - **Note** Only the first Camera in the first "excalibur"=true layer will be used 
  - Create a Tiled "Point" with the Tiled Type "Camera"
  - Optionally, to set zoom other than the default of 1.0, create a custom property named "Zoom" with a numeric value

* **Solid layers** - You can mark a particular layers tiles as solid in Tiled

  ![](./readme/solid.png)  
  - In the Tiled layer properties, add a custom property named "Solid" with a boolean value `true`
  - The presence of a tile in this layer indicates that space is solid, the abscence of a tile means it is not solid

* **Colliders** - You may position Excalibur colliders within Tiled
  ![](./readme/collider.png)
  - In an object layer with a custom property "excalibur"=true
  - Create a "Circle" (ellipses are not supported) or "Rectangle"
     - Set the Tiled type to "BoxCollider" or "CircleCollider" 
     - Optionally, to set an Excalibur collision type specify a custom property named "CollisionType" with the value
        - "Fixed" (default for colliders) - non-movable object
        - "Passive" - triggers events, does not participate in collision
        - "Active" - participates in collision and can be pushed around
        - "PreventCollision" - all collisions are ignored

* **Text** - You may insert excalibur labels within Tiled
   ![](./readme/text.png)
   - In an object layer with a custom property "excalibur"=true
   - Create a Tiled Text object
   - Optionally, you can set the "ZIndex" as a float custom tiled property 
   - **⚠ A word of caution around fonts ⚠** - fonts are different on every operating system (some may not be available to your user unless you explicitly load them into the page with a font loader). See [here for some detail](https://erikonarheim.com/posts/dont-test-fonts/)

* **Inserted Tile Objects** - You may insert tiles on or off grid in Tiled with inserted tiles
   ![](./readme/insertedtile.png)
   - In an object layer with a custom property "excalibur"=true
   - Create a Tiled inserted Tile
   - Optionally, you can set the "ZIndex" as a float custom tiled property 
   - Optionally, to set an Excalibur collision type specify a custom property named "CollisionType" with the value
        - "Fixed" non-movable object
        - "Passive" (default for inserted tiles) - triggers events, does not participate in collision
        - "Active" - participates in collision and can be pushed around
        - "PreventCollision" - all collisions are ignored

## Not Yet Supported Out of the Box

* Currently Isometric and Hexagonal maps are not directly supported by Excalibur TileMaps, however the data is still parsed by this plugin and can be used manually by accessing the `RawTiledMap` in `TiledMapResource.data.rawMap` after loading.

* Excalibur Text is limited at the moment and doesn't support Tiled word wrapping or Tiled text alignment other than the default "Left" horizontal, "Top" vertical alignments.

* Layer offsets are yet not supported.

* [Layer tinting](https://doc.mapeditor.org/en/latest/manual/layers/#tinting-layers) is not yet supported

* [Parallax factor](https://doc.mapeditor.org/en/latest/manual/layers/#parallax-factor) is not yet supported.

* Image Layers - Tiled image layers are not yet fully supported, but do show up in the `RawTiledMap` so can be used that way. Using inserted [Tile Objects](https://doc.mapeditor.org/fr/latest/manual/layers/#image-layers) is a way to achieve the same effect in a fully supported way.

* Group Layers - Tiled group layers are not yet supported at all, currently layers in a group do not load.

* Infinite maps - Tiled infinite maps are not yet supported, but do show up in the `RawTiledMap`.

* `RawTiledMap` fully types the Tiled 1.4.3 api, this can be used to write custom code for anything this plugin doesn't yet support.

```typescript

import * as ex from 'excalibur';
import { TiledMapeResource } from '@excaliburjs/plugin-tiled';

// Create tiled map resource, pointing to static asset path
const tiledMap = new TiledMapResource("/assets/map.tmx");

// Create a loader and reference the map
const loader = new ex.Loader([tiledMap]);

game.start(loader).then(function() {
   
   // Access raw data
   const rawMap = tiledMap.data.rawMap;
   
});

```



## Webpack Configuration

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

When your game loads and the extension loads your map file (`/assets/maps/map.tmx`), the paths will be loaded **relative** to the map tmx or any tsx file, so they will return 404 responses:

```
GET /assets/maps/map.png -> 404 Not Found
GET /assets/maps/map.tsx -> 404 Not Found
```

If you need to override this behavior, you can set `convertPath` to a custom function that takes two parameters: `originPath` and `relativePath` data.

`originPath` is the path of the original source file (for example the `map.tmx`), and `relativePath` is referenced external fil (for example the `map.tsx`)

```js
// Create a new TiledResource loadable
var map = new ex.Plugin.Tiled.TiledMapResource("map.tmx");

map.convertPath = function (originPath, relativePath) {
   return "/assets/tx/" + path;
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

To run tests:

    npm test
