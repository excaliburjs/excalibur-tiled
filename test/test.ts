import * as ex from 'excalibur';
import { TiledMapResource } from '@excalibur-tiled';

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

var start = (mapFile: string) => {
   var map = new TiledMapResource(mapFile);
   var loader = new ex.Loader([map]);
   game.currentScene.tileMaps = []
   game.start(loader).then(function() {
      const excalibur = map.data.getExcaliburObjects();
      if (excalibur) {
         const start = excalibur.getObjectByName('Start');
         player.pos.x = start.x;
         player.pos.y = start.y;


         // Use polyline for patrols
         const line = excalibur.getPolyLines()[0]
         if (line && line.polyline) {
            const start = ex.vec(line.x, line.y);
            const firstpoint = line.polyline[0];
            const patrol = new ex.Actor({x: line.x + firstpoint.x, y: line.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
            for (const p of line.polyline) {
               patrol.actions.moveTo(p.x + start.x, p.y + start.y, 100);
            }
            patrol.actions.repeatForever();
            game.add(patrol);
         }

         // Use polygon for patrols
         const poly = excalibur.getPolygons()[0]
         poly.polygon?.push(poly.polygon[0]);
         if (poly && poly.polygon) {
            const start = ex.vec(poly.x, poly.y);
            const firstpoint = poly.polygon[0];
            const patrol = new ex.Actor({x: poly.x + firstpoint.x, y: poly.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
            for (const p of poly.polygon) {
               patrol.actions.moveTo(p.x + start.x, p.y + start.y, 100);
            }
            patrol.actions.repeatForever();
            game.add(patrol);
         }

         const textobjects = excalibur.getText();
         for (const text of textobjects) {
            const label = new ex.Label({
               x: text.x,
               y: text.y + (text.height ?? 0),
               anchor: ex.vec(0, 0),
               width: text.width,
               height: text.height,
               text: text.text?.text, 
               rotation: text.rotation,
               fontFamily: text.text?.fontFamily,
               fontSize: text.text?.pixelSize,
               fontUnit: ex.FontUnit.Px,
               color: ex.Color.fromHex(text.text?.color ?? '#ffffff')
            });
            game.add(label);
         }

         
      }
      map.addTiledMapToScene(game.currentScene);
   });
}

document.getElementById('select-map')!.addEventListener('change', (e) => {
   var map = (e.target as HTMLSelectElement).value;

   if (map) {
      start(map);
   }

   return true;
})

start("test.tmx");
