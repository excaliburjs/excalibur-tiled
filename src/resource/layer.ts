import { Actor, Color, ParallaxComponent, Polygon as ExPolygon, Shape, TileMap, Tile as ExTile, Vector, toRadians, vec, GraphicsComponent, CompositeCollider, Entity } from "excalibur";
import { Properties, mapProps } from "./properties";
import { TiledMap, TiledObjectGroup, TiledObjectLayer, TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { FactoryProps, TiledResource } from "./tiled-resource";
import { Ellipse, InsertedTile, PluginObject, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";
import { getCanonicalGid } from "./gid-util";
import { Tile } from "./tileset";
import { TiledDataComponent } from "./tiled-data-component";
import { satisfies } from "compare-versions";

export type LayerTypes = ObjectLayer | TileLayer;

export interface Layer extends Properties {
   name: string;
   load(): Promise<void>;
}

// TODO Image layer!

export class ObjectLayer implements Layer {
   public readonly name: string;
   properties = new Map<string, string | number | boolean>();
   objects: PluginObject[] = [];
   entities: Entity[] = [];
   private _objectToActor = new Map<PluginObject, Entity>();
   private _actorToObject = new Map<Entity, PluginObject>();
   constructor(public tiledObjectLayer: TiledObjectLayer, public resource: TiledResource) {
      this.name = tiledObjectLayer.name;

      mapProps(this, tiledObjectLayer.properties);
   }

   _hasWidthHeight(object: PluginObject) {
      return object instanceof Rectangle || object instanceof InsertedTile;
   }

   getObjectByName(name: string): PluginObject[] {
      return this.objects.filter(o => o.tiledObject.name === name);
   }

   getEntityByName(name: string): Entity[] {
      return this.entities.filter(a => a.name === name);
   }

   getEntityByObject(object: PluginObject): Entity | undefined {
      return this._objectToActor.get(object);
   }

   getObjectByEntity(actor: Entity): PluginObject | undefined {
      return this._actorToObject.get(actor);
   }

   /**
    * Search for a tiled object that has a property name, and optionally specify a value
    * @param propertyName 
    * @param value 
    * @returns 
    */
   getObjectsByProperty(propertyName: string, value?: any): PluginObject[] {
      if (value !== undefined) {
         return this.objects.filter(o => o.properties.get(propertyName) === value);
      } else {
         return this.objects.filter(o => o.properties.has(propertyName));
      }
   }
   /**
    * Search for actors that were created from tiled objects
    * @returns 
    */
   getActorsByProperty(propertyName: string, value?: any): Actor[] {
      return this.getObjectsByProperty(propertyName, value).map(o => this._objectToActor.get(o)).filter(a => !!a) as Actor[];
   }

   /**
    * Search for an Tiled object by it's Tiled class name
    * @returns 
    */
   getObjectsByClassName(className: string): PluginObject[] {
      return this.objects.filter(o => o.tiledObject.name === className);
   }

   /**
    * Search for an Actor created by the plugin by it's Tiled object
    * @param className 
    * @returns 
    */
   getActorByClassName(className: string): Actor[] {
      return this.getObjectsByClassName(className).map(o => this._objectToActor.get(o)).filter(a => !!a) as Actor[];
   }

   async load() {
      // TODO object alignment specified in tileset! https://doc.mapeditor.org/en/stable/manual/objects/#insert-tile
      const opacity = this.tiledObjectLayer.opacity;
      const hasTint = !!this.tiledObjectLayer.tintcolor;
      const tint = this.tiledObjectLayer.tintcolor ? Color.fromHex(this.tiledObjectLayer.tintcolor) : Color.White;
      const offset = vec(this.tiledObjectLayer.offsetx ?? 0, this.tiledObjectLayer.offsety ?? 0);

      const objects = parseObjects(this.tiledObjectLayer);

      for (let object of objects) {
         let worldPos = vec((object.x ?? 0) + offset.x, (object.y ?? 0) + offset.y);

         if (object.tiledObject.type) {
            // TODO we should also use factories on templates
            const factory = this.resource.factories.get(object.tiledObject.type);
            if (factory) {
               const entity = factory({
                  worldPos,
                  name: object.tiledObject.name,
                  class: object.tiledObject.type,
                  layer: this,
                  object,
                  properties: object.properties
               } satisfies FactoryProps);
               this._recordObjectEntityMapping(object, entity);
               continue; // If we do a factor method we skip any default processing
            }
         }

         // TODO excalibur smarts for solid/collision type/factory map
         // TODO collision type
         const newActor = new Actor({
            name: object.tiledObject.name,
            x: (object.x ?? 0) + offset.x,
            y: (object.y ?? 0) + offset.y,
            anchor: Vector.Zero,
            rotation: toRadians(object.tiledObject.rotation ?? 0),
         });
         const graphics = newActor.get(GraphicsComponent);
         if (graphics) {
            graphics.opacity = opacity;
         }

         if (object instanceof Text) {
            newActor.graphics.use(object.text);
         }

         if (object instanceof InsertedTile) {
            const anchor = vec(0, 1);
             // Inserted tiles pivot from the bottom left in Tiled
            newActor.anchor = anchor;
            const scaleX = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
            const scaleY = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
            const scale = vec(scaleX, scaleY);
            
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
               animationScaled.scale = scale;
               if (hasTint) {
                  animationScaled.tint = tint;
               }
               newActor.graphics.use(animationScaled);
            }

            const colliders = tileset.getCollidersForGid(object.gid, { anchor: Vector.Zero, scale});
            if (colliders) {
               // insertable tiles have an x, y, width, height, gid
               // by default they pivot from the bottom left (0, 1)
               const width = (object.tiledObject.width ?? 0);
               const height = (object.tiledObject.height ?? 0);
               const offsetx = -width * anchor.x;
               const offsety = -height * anchor.y;
               const offset = vec(offsetx, offsety);
               console.log('tiled collider', newActor.name, offset, object, colliders[0]);
               for (let collider of colliders) {
                  collider.offset = offset;
               }
               newActor.collider.useCompositeCollider(colliders);
            }
         }

         if (object instanceof Polygon) {
            newActor.anchor = vec(0, 1);
            newActor.pos = vec(object.x, object.y);
            const polygon = Shape.Polygon(object.points)
            newActor.collider.set(polygon);
         }

         if (object instanceof Polyline) {
            // ? should we do any excalibur things here
         }

         if (object instanceof Point) {
            // ? should we do any excalibur things here
         }

         if (object instanceof Rectangle) {
            newActor.anchor = object.anchor;
            newActor.collider.useBoxCollider(object.width, object.height, object.anchor);
         }

         if (object instanceof Ellipse) {
            // FIXME: Excalibur doesn't support ellipses :( fallback to circle
            // pick the smallest dimension and that's our radius
            newActor.collider.useCircleCollider(Math.min(object.width, object.height) / 2);
            console.log(object);
         }

         this._recordObjectEntityMapping(object, newActor);
      }
   }

   private _recordObjectEntityMapping(object: PluginObject, entity: Entity){
      entity.addComponent(new TiledDataComponent({
         tiledObject: object
      }));
      this.objects.push(object);
      this.entities.push(entity);
      this._objectToActor.set(object, entity);
      this._actorToObject.set(entity, object);
   }
}

/**
 * Tile information for both excalibur and tiled tile representations
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

            // the whole tilemap uses a giant composite collider relative to the Tilemap
            // not individual tiles
            const colliders = tileset.getCollidersForGid(gid);
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
   }
}