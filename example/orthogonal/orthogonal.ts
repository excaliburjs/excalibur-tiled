import * as ex from 'excalibur';
import { TiledResource } from '@excalibur-tiled';

class Player extends ex.Actor {
   override onPostUpdate(engine: ex.Engine) {
      this.vel = ex.vec(0, 0)
      const speed = 64;
      if (engine.input.keyboard.isHeld(ex.Keys.Right)) {
         this.vel.x = speed;
      }
      if (engine.input.keyboard.isHeld(ex.Keys.Left)) {
         this.vel.x = -speed;
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Up)) {
         this.vel.y = -speed;
      }
      if (game.input.keyboard.isHeld(ex.Input.Keys.Down)) {
         this.vel.y = speed;
      }
   }
}

const game = new ex.Engine({
   width: 800, 
   height: 600, 
   canvasElementId: 'game',
   pointerScope: ex.PointerScope.Canvas,
   antialiasing: false
});
game.toggleDebug();

const tiledMap = new TiledResource('./orthogonal.tmx', {
   useMapBackgroundColor: true,
   entityClassNameFactories: {
      'player-start': (props) => {
         return new Player({
            pos: props.worldPos,
            width: 16,
            height: 16,
            color: ex.Color.Blue,
            collisionType: ex.CollisionType.Active
         });
      }
   }
});

// const tiledMap = new TiledResource('../../test/unit/tiled/parser-spec/orthogonal-infinite.tmx', {
//    useMapBackgroundColor: true,
//    entityClassNameFactories: {
//       'player-start': (props) => {
//          return new Player({
//             pos: props.worldPos,
//             width: 16,
//             height: 16,
//             color: ex.Color.Blue,
//             collisionType: ex.CollisionType.Active
//          });
//       }
//    }
// });

const loader = new ex.Loader([tiledMap]);

let currentPointer!: ex.Vector;
game.input.pointers.primary.on('down', (moveEvent) => {
      currentPointer = moveEvent.worldPos;
      game.currentScene.camera.move(currentPointer, 300, ex.EasingFunctions.EaseInOutCubic);
});

game.input.pointers.primary.on('move', (moveEvent) => {
   const tile = tiledMap.getTileByPoint('ground', moveEvent.worldPos);
   if (tile) {
      console.log(tile);
   }
})

game.input.pointers.primary.on('wheel', (wheelEvent) => {
   // wheel up
   game.currentScene.camera.pos = currentPointer;
   if (wheelEvent.deltaY < 0) {
       game.currentScene.camera.zoom *= 1.2;
   } else {
       game.currentScene.camera.zoom /= 1.2;
   }
});

game.start(loader).then(() => {
   tiledMap.addToScene(game.currentScene);
   currentPointer = game.currentScene.camera.pos;

   (window as any).tiledMap = tiledMap;
});
