import * as ex from 'excalibur';
import * as Extensions from '../dist/excalibur-tiled'

var game = new ex.Engine({ 
   width: 500, 
   height: 400, 
   canvasElementId: 'game',
   pointerScope: ex.Input.PointerScope.Canvas
});
// game.isDebug = true;

var player = new ex.Actor({
   pos: ex.vec(100, 100),
   width: 25,
   height: 25,
   color: ex.Color.Blue,
   collisionType: ex.CollisionType.Active
});
player.on('collisionstart', () => {
   console.log('entered an area');
});
player.on('collisionend', () => {
   console.log('left an area');
});

game.currentScene.camera.strategy.elasticToActor(player, .5, .9);

player.onPostUpdate = () => {
   player.vel.setTo(0, 0);
   const speed = 100;
   if (game.input.keyboard.isHeld(ex.Input.Keys.Right)) {
      player.vel.x = speed;
   }
   if (game.input.keyboard.isHeld(ex.Input.Keys.Left)) {
      player.vel.x = -speed;
   }
   if (game.input.keyboard.isHeld(ex.Input.Keys.Up)) {
      player.vel.y = -speed;
   }
   if (game.input.keyboard.isHeld(ex.Input.Keys.Down)) {
      player.vel.y = speed;
   }
}
game.add(player);

var start = (mapFile) => {
   var map = new Extensions.TiledResource(mapFile);
   var loader = new ex.Loader([map]);
   
   game.currentScene.tileMaps = []
   game.start(loader).then(function() {
      const start = map.data.getExcaliburObjects().getObjectByName('Start');
      player.pos.x = start.x;
      player.pos.y = start.y;
      map.addTiledMapToScene(game.currentScene);
   });
}

document.getElementById('select-map').addEventListener('change', (e) => {
   var map = (e.target as HTMLSelectElement).value;

   if (map) {
      start(map);
   }

   return true;
})

start("test.tmx");
