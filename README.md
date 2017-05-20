# Tiled Extension for Excalibur.js

This extension adds support for a new `TiledResource` to Excalibur.js to read [Tiled map editor](http://mapeditor.org) files (currently only JSON).

## Quickstart

Install using [Bower](http://bower.io):

    bower install excalibur-tiled
    
Reference **bower_components/excalibur-tiled/dist/excalibur-tiled.js** in your page and then you can use it like this:

```js

// New game
var game = new ex.Engine({ width: 500, height: 400, canvasElementId: "game" });

// Create a new TiledResource loadable
var map = new Extensions.Tiled.TiledResource("test.json");

// Create a loader and reference the map
var loader = new ex.Loader([map]);

// Start the game (starts the loader)
game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   // Process the data in the map as you like
   map.data.tilesets.forEach(function(ts) {
      console.log(ts.image, ts.imageTexture.isLoaded());
   });
   
   // get a Excalibur `TileMap` instance
   var tm = map.getTileMap();
   
   // draw the tile map
   game.add(tm);
   
});
```

## Documentation

The `TiledResource` loadable will load the map file you specify along with any referenced tile set assets (images). 

### Handling Tile Image Paths

The image paths loaded will be relative to where the exported file was saved.

If you need to override this behavior, you can set `imagePathAccessor` to a custom function that takes two parameters: path and `ITiledTileSet` data.

```js
// Create a new TiledResource loadable
var map = new Extensions.Tiled.TiledResource("test.json");

map.imagePathAccessor = function (path, tileset) {
   return "/maps/tx/" + path;
}
```

### Supported Formats

Only supports JSON file format with CSV or Base64 (uncompressed) tile layer format.

## Contributing

To compile source:

    npm start

To compile test:

    npm test

You have to view the test in a web server (IIS, Apache, etc.).