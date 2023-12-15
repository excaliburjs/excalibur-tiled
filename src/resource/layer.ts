import { Actor, Color, ParallaxComponent, Polygon as ExPolygon, Shape, TileMap, Vector, toRadians, vec } from "excalibur";
import { Properties, mapProps } from "./properties";
import { TiledMap, TiledObjectGroup, TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { TiledResource } from "./tiled-resource";
import { Ellipse, InsertedTile, PluginObject, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";

export class Layer implements Properties {
   properties = new Map<string, string | number | boolean>();
   constructor(public readonly name: string) {}
   async decodeAndBuild() {}
}

export class ObjectLayer extends Layer {

   objects: Object[] = [];
   actors: Actor[] = [];
   objectToActor = new Map<Object, Actor>();
   constructor(public tiledObjectLayer: TiledObjectGroup, public resource: TiledResource) {
      super(tiledObjectLayer.name);

      mapProps(this, tiledObjectLayer.properties);
   }

   _hasWidthHeight(object: PluginObject) {
      return object instanceof Rectangle || object instanceof InsertedTile
   }

   async decodeAndBuild() {
      // TODO layer offsets!
      // TODO layer opacity
      // TODO factory instantiation!
      // TDOO colliders don't match up with sprites in new anchors

      const debug = true;

      const objects = parseObjects(this.tiledObjectLayer);
      for (let object of objects) {
         // TODO excalibur smarts for solid/collision type/factory map
         const newActor = new Actor({
            name: object.tiledObject.name,
            x: object.x ?? 0,
            y: object.y ?? 0,
            anchor: Vector.Zero,
            rotation: toRadians(object.tiledObject.rotation ?? 0), // convert to radians
            ...(this._hasWidthHeight(object) ? {
               width: object.tiledObject.width,
               height: object.tiledObject.height,
            } : {})
         })
         

         if (object instanceof Text) {
            newActor.graphics.use(object.text);
         }

         if (object instanceof InsertedTile) {
             // Inserted tiles pivot from the bottom left in Tiled
            newActor.anchor = vec(0, 1);
            const tileset = this.resource.getTilesetForTile(object.gid);
            // need to clone because we are modify sprite properties, sprites are shared by default
            const sprite = tileset.getSpriteForGid(object.gid).clone();
            sprite.destSize.width = object.tiledObject.width ?? sprite.width;
            sprite.destSize.height = object.tiledObject.height ?? sprite.height;
            newActor.graphics.use(sprite);

            const animation = tileset.getAnimationForGid(object.gid);
            if (animation) {
               const animationScaled = animation.clone();
               const scaleX = (object.tiledObject.width ?? animation.width) / animation.width;
               const scaleY = (object.tiledObject.height ?? animation.height) / animation.height;
               animationScaled.scale = vec(scaleX, scaleY);
               newActor.graphics.use(animationScaled)

            }
         }

         if (object instanceof Polygon) {
            newActor.anchor = vec(0, 1);
            newActor.pos = vec(object.x, object.y);
            const polygon = Shape.Polygon(object.points)
            newActor.collider.set(polygon);

            if (debug) {
               // the origin is the first point
               // console.log(object.points);
               // const polygonGfx = new ExPolygon({
               //    points: object.points,
               //    color: Color.Green,
               //    quality: 4
               // })
               // newActor.graphics.anchor = vec(0, 0);
               // newActor.graphics.offset = vec(polygonGfx.width / 4, polygonGfx.height / 4);
               // newActor.graphics.use(polygonGfx);
            }
            // console.log('star', newActor, object);
         }

         if (object instanceof Polyline) {
            console.log('polyline', object);
         }

         if (object instanceof Point) {
            
         }

         if (object instanceof Rectangle) {
            newActor.anchor = vec(0, 1);
            newActor.collider.useBoxCollider(object.width, object.height);
         }

         if (object instanceof Ellipse) {
            // FIXME: Excalibur doesn't support ellipses :( fallback to circle
            // pick the smallest dimension and that's our radius
            newActor.collider.useCircleCollider(Math.min(object.width, object.height) / 2);
            console.log(object);
         }

         // TODO tile animations
         // TODO Tile colliders

         this.objects.push(object);
         this.actors.push(newActor);
         // TODO do we need this?
         this.objectToActor.set(object, newActor);
      }
   }
}

export class TileLayer extends Layer {
   /**
    * Number of tiles wide
    */
   width: number = 0;
   /**
    * Number of tiles high
    */
   height: number = 0;

   /**
    * Original list of gids for this layer from tiled
    */
   data: number[] = [];

   /**
    * Excalibur TileMap structure for drawing in excalibur
    */
   tilemap!: TileMap;

   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource) {
      super(tiledTileLayer.name);

      mapProps(this, tiledTileLayer.properties);
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.height;
   }

   async decodeAndBuild() {
      // TODO layer tints
      // TODO layer opacity
      if (needsDecoding(this.tiledTileLayer)) {
         this.data = await Decoder.decode(this.tiledTileLayer.data, this.tiledTileLayer.compression);
      } else if (isCSV(this.tiledTileLayer)) {
         this.data = this.tiledTileLayer.data;
      }

      // TODO support different tile maps besides orthogonal
      // this.data.orientation === "orthogonal"
      const layer = this.tiledTileLayer;
      this.tilemap = new TileMap({
         name: this.name,
         pos: vec(layer.offsetx ?? 0, layer.offsety ?? 0),
         tileWidth: this.resource.map.tilewidth,
         tileHeight: this.resource.map.tileheight,
         columns: layer.width,
         rows: layer.height
      });
      // TODO attach the "this" to the tilemap
      // this.tilemap.addComponent(new TiledLayerComponent(layer));
      if (layer.parallaxx || layer.parallaxy) {
         const factor = vec(layer.parallaxx ?? 1.0, layer.parallaxy ?? 1.0);
         this.tilemap.addComponent(new ParallaxComponent(factor));
      }

      // Read tiled data into Excalibur's tilemap type
      for (let i = 0; i < this.data.length; i++) {
         let gid = this.data[i];
         if (gid !== 0) {
            const tileset = this.resource.getTilesetForTile(gid);
            const sprite = tileset.getSpriteForGid(gid);
            const tile = this.tilemap.tiles[i];
            tile.addGraphic(sprite);

            const colliders = tileset.getCollidersForGid(gid);
            for (let collider of colliders) {
               tile.addCollider(collider);
            }

            const animation = tileset.getAnimationForGid(gid);
            if (animation) {
               tile.clearGraphics();
               tile.addGraphic(animation);
            }
         }
      }

      // I know this looks goofy, but the entity and the layer "it belongs" to are the same here
      // tileMapLayer.z = this._calculateZIndex(layer, layer); 
      // for (let i = 0; i < rawLayer.data.length; i++) {
      //    let gid = <number>rawLayer.data[i];
      //    if (gid !== 0) {
      //       const sprite = this.getSpriteForGid(gid);
      //       tileMapLayer.tiles[i].addGraphic(sprite);
      //       const colliders = this.getCollidersForGid(gid);
      //       for (let collider of colliders) {
      //          tileMapLayer.tiles[i].addCollider(collider);
      //       }
      //       const animation = this.getAnimationForGid(gid);
      //       if (animation) {
      //          tileMapLayer.tiles[i].clearGraphics();
      //          tileMapLayer.tiles[i].addGraphic(animation);
      //       }
      //    }
      // }
   }
   
}