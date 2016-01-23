/// <reference path="../bower_components/excalibur/dist/excalibur-0.6.0.d.ts" />
/// <reference path="../dist/excalibur-tiled.d.ts" />

var game = new ex.Engine(500, 400, "game");
var map = new ex.Extensions.Tiled.TiledResource("test.json");
var loader = new ex.Loader([map]);

game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   map.data.tilesets.forEach(function(ts) {
      console.log(ts.image, ts.imageTexture.isLoaded());
   });
   
   var tm = map.getTileMap();
   
   game.add(tm);
   
});