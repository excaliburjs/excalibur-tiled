import * as ex from 'excalibur';
import { TiledMapResource } from '@excalibur-tiled';
import { ImageFiltering, ImageSource, Input, IsometricEntityComponent, Shape } from 'excalibur';

ex.Flags.enable(ex.Experiments.WebGL);
const game = new ex.Engine({ 
   width: 800, 
   height: 600, 
   canvasElementId: 'game',
   pointerScope: ex.Input.PointerScope.Canvas,
   antialiasing: false,
});
game.input.keyboard.on("press", (evt) => {
   if (evt.key === Input.Keys.D) {
      game.toggleDebug();
   }
});

const reset = () => {
   game.currentScene.camera.clearAllStrategies();
   game.currentScene.camera.zoom = 1;
   game.currentScene.tileMaps.forEach(t => {
      game.currentScene.remove(t);
   });
   game.currentScene.actors.forEach(a => {
      game.currentScene.remove(a);
   });
}

const start = (mapFile: string) => {
   let player = new ex.Actor({
      pos: ex.vec(100, 100),
      width: 16,
      height: 16,
      color: ex.Color.Blue,
      collisionType: ex.CollisionType.Active
   });
   (window as any).player = player;
   (window as any).game = game;
   player.on('collisionstart', () => {
      console.log('entered an area');
   });
   player.on('collisionend', () => {
      console.log('left an area');
   });
   
   game.currentScene.camera.strategy.elasticToActor(player, .8, .9);
   
   player.onPostUpdate = () => {
      player.vel.setTo(0, 0);
      const speed = 64*2;
      if (game.input.keyboard.isHeld(ex.Input.Keys.Right)) {
         player.vel.x = speed;
         player.vel.y = speed;
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Left)) {
         player.vel.x = -speed;
         player.vel.y = -speed;
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Up)) {
         player.vel.y = -speed;
         player.vel.x = speed;
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Down)) {
         player.vel.y = speed;
         player.vel.x = -speed;
      }
   }
   game.add(player);

   const map = new TiledMapResource(mapFile, { startingLayerZIndex: -2 });
   const playercube = new ImageSource('./player-cube.png', true, ImageFiltering.Blended);
   const loader = new ex.Loader([map, playercube]);
   game.start(loader).then(() => {
      player.pos = ex.vec(100, 100);
      player.graphics.use(playercube.toSprite());
      player.collider.set(Shape.Polygon([
         ex.vec(0,94.9975),
         ex.vec(55.0546,-32.6446 + 94.9975),
         ex.vec( 110.639,-0.352914 +94.9975),
         ex.vec(55.584,31.7623+94.9975)
      ].map(p => p.sub(ex.vec(111/2, 64)))));
      const iso = new IsometricEntityComponent();
      iso.elevation = 1;
      iso.map = map.isoLayers[0];
      player.addComponent(iso);
      const excalibur = map.data.getExcaliburObjects();
      if (excalibur.length > 0) {
         const start = excalibur[0].getObjectByName('player-start');
         if (start) {
            player.pos.x = start.x;
            player.pos.y = start.y;
         }

         // Use polyline for patrols
         const lines = excalibur[0].getPolyLines();
         for (let line of lines) {
            if (line && line.polyline) {
               const start = ex.vec(line.x, line.y);
               const firstpoint = line.polyline[0];
               const patrol = new ex.Actor({x: line.x + firstpoint.x, y: line.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
               patrol.actions.repeatForever(ctx => {
                  for (const p of (line.polyline ?? [])) {
                     ctx.moveTo(p.x + start.x, p.y + start.y, 100);
                  }
               });
               game.add(patrol);
            }
         }

         // Use polygon for patrols
         const polys = excalibur[0].getPolygons();
         for (let poly of polys) {
            poly.polygon?.push(poly.polygon[0]); // needs to end where it started
            if (poly && poly.polygon) {
               const start = ex.vec(poly.x, poly.y);
               const firstpoint = poly.polygon[0];
               const patrol = new ex.Actor({x: poly.x + firstpoint.x, y: poly.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
               patrol.actions.repeatForever(ctx => {
                  for (const p of (poly.polygon ?? [])) {
                     ctx.moveTo(p.x + start.x, p.y + start.y, 100);
                  }
               })
               game.add(patrol);
            }
         }
      }
      // Camera init bug :( forcing a a hack
      setTimeout(() => {
         game.currentScene.camera.x = player.pos.x;
         game.currentScene.camera.y = player.pos.y;
         game.currentScene.camera.zoom = 1;
         player.pos.x = 100;
         player.pos.y = 200;
      });
      map.addTiledMapToScene(game.currentScene);
   });
}

document.getElementById('select-map')!.addEventListener('change', (e) => {
   var map = (e.target as HTMLSelectElement).value;

   if (map) {
      reset();
      start(map);
   }

   return true;
})

start("example-isometric.tmx");
// start("example-city.tmx");
