import * as ex from 'excalibur';
import { Point, TiledResource } from '@excalibur-tiled';
import { ImageFiltering, ImageSource, Keys, IsometricEntityComponent, Shape } from 'excalibur';

const game = new ex.Engine({
   width: 800, 
   height: 600, 
   canvasElementId: 'game',
   pointerScope: ex.PointerScope.Canvas,
   antialiasing: false
});

// game.toggleDebug();
// game.debug.isometric.showGrid = true;
game.input.keyboard.on("press", (evt) => {
   if (evt.key === Keys.D) {
      game.toggleDebug();
   }
});

let currentPointer!: ex.Vector;
game.input.pointers.primary.on('down', (moveEvent) => {
   currentPointer = moveEvent.worldPos;
   game.currentScene.camera.move(currentPointer, 300, ex.EasingFunctions.EaseInOutCubic);
});

game.input.pointers.primary.on('wheel', (wheelEvent) => {
   // wheel up
   game.currentScene.camera.pos = currentPointer;
   if (wheelEvent.deltaY < 0) {
      game.currentScene.camera.zoom *= 1.2;
   } else {
      game.currentScene.camera.zoom /= 1.2;
   }
});

const reset = () => {
   game.stop();
   game.currentScene.camera.clearAllStrategies();
   game.currentScene.camera.zoom = 1;
   game.currentScene.tileMaps.forEach(t => {
      game.currentScene.remove(t);
   });
   game.currentScene.entities.forEach(a => {
      game.currentScene.remove(a);
   });
   game.currentScene.clear();
   game.start();
}

const start = (mapFile: string) => {
   const isIsometric = mapFile === 'example-isometric.tmx';
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
      const speed = isIsometric ? 64*2 : 64;
      if (game.input.keyboard.isHeld(ex.Input.Keys.Right)) {
         player.vel.x = speed;
         if (isIsometric) {
            player.vel.y = speed;
         }
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Left)) {
         player.vel.x = -speed;
         if (isIsometric) {
            player.vel.y = -speed;
         }
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Up)) {
         player.vel.y = -speed;
         if (isIsometric) {
            player.vel.x = speed;
         }
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Down)) {
         player.vel.y = speed;
         if (isIsometric) {
            player.vel.x = -speed;
         }
      }
   }
   game.add(player);

   const map = new TiledResource(mapFile, { 
      startZIndex: -2
   });
   (window as any).tiledMap = map;
   const playercube = new ImageSource('./player-cube.png', true, ImageFiltering.Blended);
   const loader = new ex.Loader([map, playercube]);

   (window as any).map = map;
   game.start(loader).then(() => {

      game.input.pointers.primary.on('down', evt => {
         const tile = map.getTileByPoint('Ground', evt.worldPos);
      });

      player.pos = ex.vec(100, 100);
      if (isIsometric) {
         player.graphics.use(playercube.toSprite());
         player.collider.set(Shape.Polygon([
            ex.vec(0,94.9975),
            ex.vec(55.0546,-32.6446 + 94.9975),
            ex.vec( 110.639,-0.352914 +94.9975),
            ex.vec(55.584,31.7623+94.9975)
         ].map(p => p.sub(ex.vec(111/2, 64)))));

         const playerlevel = map.getIsoTileLayers('playerlevel')[0];
         const iso = new IsometricEntityComponent(playerlevel.isometricMap);
         iso.elevation = playerlevel.isometricMap.elevation;
         player.addComponent(iso);
      }
      const start = map.getObjectsByName('player-start')[0];
      if (start) {
         player.pos.x = start.x;
         player.pos.y = start.y;
         console.log("player start", start.x, start.y);
      }

      //    // Use polyline for patrols
      //    const lines = excalibur[0].getPolyLines();
      //    for (let line of lines) {
      //       if (line && line.polyline) {
      //          const start = ex.vec(line.x, line.y);
      //          const firstpoint = line.polyline[0];
      //          const patrol = new ex.Actor({x: line.x + firstpoint.x, y: line.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
      //          patrol.actions.repeatForever(ctx => {
      //             for (const p of (line.polyline ?? [])) {
      //                ctx.moveTo(p.x + start.x, p.y + start.y, 100);
      //             }
      //          });
      //          game.add(patrol);
      //       }
      //    }

      //    // Use polygon for patrols
      //    const polys = excalibur[0].getPolygons();
      //    for (let poly of polys) {
      //       poly.polygon?.push(poly.polygon[0]); // needs to end where it started
      //       if (poly && poly.polygon) {
      //          const start = ex.vec(poly.x, poly.y);
      //          const firstpoint = poly.polygon[0];
      //          const patrol = new ex.Actor({x: poly.x + firstpoint.x, y: poly.y + firstpoint.y, color: ex.Color.Green, width: 25, height: 25});
      //          patrol.actions.repeatForever(ctx => {
      //             for (const p of (poly.polygon ?? [])) {
      //                ctx.moveTo(p.x + start.x, p.y + start.y, 100);
      //             }
      //          })
      //          game.add(patrol);
      //       }
      //    }
      // }
      // Camera init bug :( forcing a a hack
      setTimeout(() => {
         game.currentScene.camera.x = player.pos.x;
         game.currentScene.camera.y = player.pos.y;
         game.currentScene.camera.zoom = 4;
         if (isIsometric) {
            game.currentScene.camera.zoom = 1;
            player.pos.x = 100;
            player.pos.y = 200;
         }
      });
      map.addToScene(game.currentScene);
      currentPointer = game.currentScene.camera.pos;
   });
}

const selectMapEl = document.getElementById('select-map') as HTMLSelectElement;
selectMapEl.addEventListener('change', (e) => {
   var map = (e.target as HTMLSelectElement).value;

   if (map) {
      reset();
      window.location.hash = map;
      start(map);
   }

   return true;
})

window.onload = function () {
   var map = window.location.hash.slice(1) ?? '';
   if (map) {
      console.log(map);
      var options = Array.from(selectMapEl.options);
      var index = options.findIndex(o => o.value === map);
      if (index > -1) {
         selectMapEl.selectedIndex = index;
         start(map);
      }
   } else {
      window.location.hash = "example-city.tmx";
      selectMapEl.selectedIndex = 0;
      start("example-city.tmx");
   }
}