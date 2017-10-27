import * as ex from 'excalibur';
import TiledResource from '../src';

var game = new ex.Engine({ 
   width: 500, 
   height: 400, 
   canvasElementId: 'game'
});
var map = new TiledResource("test-v1-external.json");
var loader = new ex.Loader([map]);

game.start(loader).then(function() {
   
   console.log("Game loaded");
   
   map.data.tilesets.forEach(function(ts) {
      console.log(ts.image, ts.imageTexture.isLoaded());
   });
   
   var tm = map.getTileMap();
   
   game.add(tm);
   
});