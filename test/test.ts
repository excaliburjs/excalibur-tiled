import * as ex from 'excalibur';
import * as Extensions from '../dist/excalibur-tiled'

var game = new ex.Engine({ 
   width: 500, 
   height: 400, 
   canvasElementId: 'game',
   pointerScope: ex.Input.PointerScope.Canvas
});

var start = (mapFile) => {
   var map = new Extensions.TiledResource(mapFile);
   var loader = new ex.Loader([map]);
   
   game.currentScene.tileMaps = []
   game.start(loader).then(function() {
      
      map.data.tilesets.forEach(function(ts) {
         console.log(ts.image, ts.imageTexture.isLoaded());
      });
      
      var tm = map.getTileMap();
      
      game.add(tm);
      
   });
}

document.getElementById('select-map').addEventListener('change', (e) => {
   var map = (e.target as HTMLSelectElement).value;

   if (map) {
      start(map);
   }

   return true;
})

start("test.json");
