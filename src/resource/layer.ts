import { Actor, Color, ParallaxComponent, Polygon as ExPolygon, Shape, TileMap, Tile as ExTile, Vector, toRadians, vec, GraphicsComponent } from "excalibur";
import { Properties, mapProps } from "./properties";
import { TiledMap, TiledObjectGroup, TiledObjectLayer, TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { TiledResource } from "./tiled-resource";
import { Ellipse, InsertedTile, PluginObject, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";
import { getCanonicalGid } from "./gid-util";
import { Tile } from "./tileset";

export type LayerTypes = ObjectLayer | TileLayer;

export interface Layer extends Properties {
   name: string;
   load(): Promise<void>;
}

// TODO Image layer!

export class ObjectLayer implements Layer {
   public readonly name: string;
   properties = new Map<string, string | number | boolean>();
   objects: Object[] = [];
   actors: Actor[] = [];
   objectToActor = new Map<Object, Actor>();
   constructor(public tiledObjectLayer: TiledObjectLayer, public resource: TiledResource) {
      this.name = tiledObjectLayer.name;

      mapProps(this, tiledObjectLayer.properties);
   }

   _hasWidthHeight(object: PluginObject) {
      return object instanceof Rectangle || object instanceof InsertedTile
   }

   getObjectByName(): PluginObject[] {
      // TODO
      return [];
   }

   getActorByName(): PluginObject[] {
      // TODO
      return [];
   }

   getObjectByProperty(): PluginObject[] {
      // TODO
      return [];
   
   }
   getActorByProperty(): PluginObject[] {
      // TODO
      return [];
   }

   getObjectByClassName(): PluginObject[] {
      return [];
   }

   getActorByClassName(): PluginObject[] {
      return [];
   }

   async load() {
      const opacity = this.tiledObjectLayer.opacity;
      const hasTint = !!this.tiledObjectLayer.tintcolor;
      const tint = this.tiledObjectLayer.tintcolor ? Color.fromHex(this.tiledObjectLayer.tintcolor) : Color.White;
      const offset = vec(this.tiledObjectLayer.offsetx ?? 0, this.tiledObjectLayer.offsety ?? 0);
      // TODO object alignment specified in tileset! https://doc.mapeditor.org/en/stable/manual/objects/#insert-tile
      // TODO factory instantiation!
      // TODO colliders don't match up with sprites in new anchors

      const objects = parseObjects(this.tiledObjectLayer);
      for (let object of objects) {
         // TODO excalibur smarts for solid/collision type/factory map
         const newActor = new Actor({
            name: object.tiledObject.name,
            x: (object.x ?? 0) + offset.x,
            y: (object.y ?? 0) + offset.y,
            anchor: Vector.Zero,
            rotation: toRadians(object.tiledObject.rotation ?? 0), // convert to radians
            ...(this._hasWidthHeight(object) ? {
               width: object.tiledObject.width,
               height: object.tiledObject.height,
            } : {})
         });
         const graphics = newActor.get(GraphicsComponent);
         if (graphics) {
            graphics.opacity = opacity;
         }
         

         if (object instanceof Text) {
            newActor.graphics.use(object.text);
         }

         if (object instanceof InsertedTile) {
             // Inserted tiles pivot from the bottom left in Tiled
            newActor.anchor = vec(0, 1);
            // TODO inserted tile collider?
            newActor.collider.useBoxCollider(object.width, object.height, newActor.anchor);
            const tileset = this.resource.getTilesetForTile(object.gid);
            // need to clone because we are modify sprite properties, sprites are shared by default
            const sprite = tileset.getSpriteForGid(object.gid).clone();
            sprite.destSize.width = object.tiledObject.width ?? sprite.width;
            sprite.destSize.height = object.tiledObject.height ?? sprite.height;
            if (hasTint) {
               sprite.tint = tint;
            }

            newActor.graphics.use(sprite);

            const animation = tileset.getAnimationForGid(object.gid);
            if (animation) {
               const animationScaled = animation.clone();
               const scaleX = (object.tiledObject.width ?? animation.width) / animation.width;
               const scaleY = (object.tiledObject.height ?? animation.height) / animation.height;
               animationScaled.scale = vec(scaleX, scaleY);
               if (hasTint) {
                  animationScaled.tint = tint;
               }
               newActor.graphics.use(animationScaled);

            }
         }

         if (object instanceof Polygon) {
            newActor.anchor = vec(0, 1);
            newActor.pos = vec(object.x, object.y);
            const polygon = Shape.Polygon(object.points)
            newActor.collider.set(polygon);
         }

         if (object instanceof Polyline) {
            console.log('polyline', object);
            // TODO should we do any actor stuff here
         }

         if (object instanceof Point) {
            // TODO should we do any actor stuff here
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

/**
 * Tile information for both excalibur and tiled tile represenations
 */
export interface TileInfo {
   /**
    * Tiled based information for the tile
    */
   tiledTile?: Tile;
   /**
    * Excalibur tile abstraction
    */
   exTile: ExTile;
}

export class TileLayer implements Layer {
   public readonly name: string;
   properties = new Map<string, string | number | boolean>();
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

   getTileByPoint(worldPos: Vector): TileInfo | null {
      // TODO IF the resource is not loaded & decoded THIS WONT WORK
      // log a warning
      if (this.tilemap) {
         const exTile = this.tilemap.getTileByPoint(worldPos);
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
         const gid = getCanonicalGid(this.data[tileIndex])

         if (gid <= 0) {
            return null;
         }

         const tileset = this.resource.getTilesetForTile(gid);
         const tiledTile = tileset.getTileByGid(gid);

         return { tiledTile, exTile };
      }
      return null;
   }

   getTileByCoordinate(x: number, y: number): TileInfo | null {
      // TODO IF the resource is not loaded & decoded THIS WONT WORK
      // log a warning
      if (this.tilemap) {
         const exTile = this.tilemap.getTile(x, y);
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
         const gid = getCanonicalGid(this.data[tileIndex])

         if (gid <= 0) {
            return null;
         }

         const tileset = this.resource.getTilesetForTile(gid);
         const tiledTile = tileset.getTileByGid(gid);

         return { tiledTile, exTile };
      }
      return null;
   }

   getTileByClass() {
      // TODO implement getTileByClass
   }

   getTileByProperty() {
      // TODO implement getTileByProperty
   }

   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource) {
      this.name = tiledTileLayer.name;
      mapProps(this, tiledTileLayer.properties);
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.height;
   }

   async load() {
      const opacity = this.tiledTileLayer.opacity;
      const hasTint = !!this.tiledTileLayer.tintcolor;
      const tint = this.tiledTileLayer.tintcolor ? Color.fromHex(this.tiledTileLayer.tintcolor) : Color.Transparent;
      if (needsDecoding(this.tiledTileLayer)) {
         this.data = await Decoder.decode(this.tiledTileLayer.data, this.tiledTileLayer.compression);
      } else if (isCSV(this.tiledTileLayer)) {
         this.data = this.tiledTileLayer.data;
      }

      // TODO isometric support different tile maps besides orthogonal
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
      const graphics = this.tilemap.get(GraphicsComponent);
      if (graphics) {
         graphics.opacity = opacity;
      }
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
            let sprite = tileset.getSpriteForGid(gid);
            if (hasTint) {
               sprite = sprite.clone();
               sprite.tint = tint;
            }
            const tile = this.tilemap.tiles[i];
            tile.addGraphic(sprite);

            // Tile colliders need to have offset included because
            // the whole tilemap uses a giant composite collider relative to the Tilemap
            // not individual tiles
            const colliders = tileset.getCollidersForGid(gid, true);
            for (let collider of colliders) {
               tile.addCollider(collider);
            }

            let animation = tileset.getAnimationForGid(gid);
            if (animation) {
               if (hasTint) {
                  animation = animation.clone();
                  animation.tint = tint;
               }
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