import * as ex from 'excalibur';
import { TiledResource } from '@excalibur-tiled';

export class OtherPlayer extends ex.Actor {
   graphic!: ex.Canvas
   constructor() {
      super({
         width: 16,
         height: 17,
         z: 15000,
         anchor: ex.vec(.5, 1.0) // bottom middle
      });
   }
   onInitialize() {
      this.graphic = new ex.Canvas({
         width: this.width,
         height: this.height,
         cache: true,
         draw: (context) => {
            context.lineWidth = 1;
            context.strokeStyle = "#ff0000"

            context.moveTo(0, 0);
            context.lineTo(this.width, 0);
            context.lineTo(this.width, this.height);
            context.lineTo(0, this.height);
            context.lineTo(0, 0);
            context.stroke();

            context.moveTo(this.width / 2, 0);
            context.lineTo(this.width / 2, this.height);
            context.stroke();

            context.moveTo(0, this.height / 2);
            context.lineTo(this.width, this.height / 2);
            context.stroke();
         }
      })
      this.graphics.use(this.graphic);
   }
}

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
      if (game.input.keyboard.isHeld(ex.Keys.Up)) {
         this.vel.y = -speed;
      }
      if (game.input.keyboard.isHeld(ex.Keys.Down)) {
         this.vel.y = speed;
      }
   }
}

// public testPlaceTinInCenterOfTile() {
//    const lastIsoLayer = this.floorMap.getLastIsoMapLayer()
//    const c = 0, r = 0
//    const tile = lastIsoLayer.getTile(c, r)
//    const graphi = tile.get(GraphicsComponent)
//    const bound = graphi.recalculateBounds()
//    console.log("bound", bound)
//    const pos = lastIsoLayer.tileToWorld(vec(c, r))
//    const play = new Player()
//    play.pos = pos
//    play.z = tile.get(TransformComponent).z - 0.1
//    this.add(play)
//    this.camera.zoom = 0.5
// }

ex.Flags.useLegacyImageRenderer();
const game = new ex.Engine({
   width: 800,
   height: 600,
   canvasElementId: 'game',
   pointerScope: ex.PointerScope.Canvas,
   antialiasing: false
});
game.toggleDebug();

const tiledMap = new TiledResource('isometric.tmx', {
   useMapBackgroundColor: true
});

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

   // const topIsoLayer = tiledMap.getIsoTileLayers().at(-1);
   // if (topIsoLayer) {
   //    const pos = topIsoLayer.isometricMap.tileToWorld(ex.vec(0, 0));
   //    const player = new OtherPlayer();
   //    player.pos = pos.add(ex.vec(0, 17/2));
   //    game.currentScene.add(player);
   // }

   (window as any).tiledMap = tiledMap;
});
