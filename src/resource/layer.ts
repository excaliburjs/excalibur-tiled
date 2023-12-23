import { Actor, Color, ParallaxComponent, Polygon as ExPolygon, Shape, TileMap, Tile as ExTile, Vector, toRadians, vec, GraphicsComponent, CompositeCollider, Entity, ImageSource, Logger, AnimationStrategy, CollisionType } from "excalibur";
import { Properties, mapProps } from "./properties";
import { TiledImageLayer, TiledMap, TiledObjectGroup, TiledObjectLayer, TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { FactoryProps, TiledResource } from "./tiled-resource";
import { Ellipse, InsertedTile, PluginObject, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";
import { getCanonicalGid } from "./gid-util";
import { Tile } from "./tileset";
import { TiledDataComponent } from "./tiled-data-component";
import { pathRelativeToBase } from "./path-util";
import { byNameCaseInsensitive, byPropertyCaseInsensitive, byClassCaseInsensitive } from "./filter-util";
import { ExcaliburTiledProperties } from "./excalibur-properties";

export type LayerTypes = ObjectLayer | TileLayer;

export interface Layer extends Properties {
   name: string;
   class?: string;
   load(): Promise<void>;
}

export class ImageLayer implements Layer {
   public readonly name: string;
   public readonly class?: string;
   properties = new Map<string, string | number | boolean>();
   image: ImageSource | null = null;
   imageActor: Actor | null = null;
   constructor(public tiledImageLayer: TiledImageLayer, public resource: TiledResource) {
      this.name = tiledImageLayer.name;
      this.class = tiledImageLayer.class;
      mapProps(this, tiledImageLayer.properties);
      if (tiledImageLayer.image) {
         this.image = new ImageSource(pathRelativeToBase(this.resource.path, tiledImageLayer.image))
      }
   }
   async load(): Promise<void> {
      const opacity = this.tiledImageLayer.opacity;
      const hasTint = !!this.tiledImageLayer.tintcolor;
      const tint = this.tiledImageLayer.tintcolor ? Color.fromHex(this.tiledImageLayer.tintcolor) : Color.White;
      const offset = vec(this.tiledImageLayer.offsetx ?? 0, this.tiledImageLayer.offsety ?? 0);
      if (this.image) {
         await this.image.load();
         this.imageActor = new Actor({
            name: this.tiledImageLayer.name,
            pos: offset,
            anchor: Vector.Zero
         });
         // FIXME when excalibur supports tiling we should use it here for repeatx/repeaty!
         const sprite = this.image.toSprite();
         this.imageActor.graphics.use(sprite);
         this.imageActor.graphics.opacity = opacity;
         if (hasTint) {
            sprite.tint = tint;
         }
      }
   }
}

export class ObjectLayer implements Layer {
   private logger = Logger.getInstance();

   public readonly name: string;
   public readonly class?: string;
   properties = new Map<string, string | number | boolean>();
   objects: PluginObject[] = [];
   entities: Entity[] = [];
   private _objectToEntity = new Map<PluginObject, Entity>();
   private _entityToObject = new Map<Entity, PluginObject>();
   private _loaded = false;
   constructor(public tiledObjectLayer: TiledObjectLayer, public resource: TiledResource) {
      this.name = tiledObjectLayer.name;
      this.class = tiledObjectLayer.class;

      mapProps(this, tiledObjectLayer.properties);
   }

   private _logLoadedWarning<TMethod extends keyof ObjectLayer>(name: TMethod) {
      this.logger.warn(`ObjectLayer ${this.name} is not yet loaded, ${name}() will always be empty!`);
   }

   getObjectsByName(name: string): PluginObject[] {
      if (!this._loaded) this._logLoadedWarning('getObjectsByName');
      return this.objects.filter(byNameCaseInsensitive(name));
   }

   getEntitiesByName(name: string): Entity[] {
      if (!this._loaded) this._logLoadedWarning('getEntitiesByName');
      return this.entities.filter(byNameCaseInsensitive(name));
   }

   getEntityByObject(object: PluginObject): Entity | undefined {
      if (!this._loaded) this._logLoadedWarning('getEntityByObject');
      return this._objectToEntity.get(object);
   }

   getObjectByEntity(actor: Entity): PluginObject | undefined {
      if (!this._loaded) this._logLoadedWarning('getObjectByEntity');
      return this._entityToObject.get(actor);
   }

   /**
    * Search for a tiled object that has a property name, and optionally specify a value
    * @param propertyName 
    * @param value 
    * @returns 
    */
   getObjectsByProperty(propertyName: string, value?: any): PluginObject[] {
      if (!this._loaded) this._logLoadedWarning('getObjectsByProperty');
      return this.objects.filter(byPropertyCaseInsensitive(propertyName, value));
   }
   /**
    * Search for actors that were created from tiled objects
    * @returns 
    */
   getEntitiesByProperty(propertyName: string, value?: any): Entity[] {
      if (!this._loaded) this._logLoadedWarning('getEntitiesByProperty');
      return this.getObjectsByProperty(propertyName, value).map(o => this._objectToEntity.get(o)).filter(a => !!a) as Entity[];
   }

   /**
    * Search for an Tiled object by it's Tiled class name
    * @returns 
    */
   getObjectsByClassName(className: string): PluginObject[] {
      if (!this._loaded) this._logLoadedWarning('getObjectsByClassName');
      return this.objects.filter(byClassCaseInsensitive(className));
   }

   /**
    * Search for an Actor created by the plugin by it's Tiled object
    * @param className 
    * @returns 
    */
   getEntitiesByClassName(className: string): Entity[] {
      if (!this._loaded) this._logLoadedWarning('getEntitiesByClassName');
      return this.getObjectsByClassName(className).map(o => this._objectToEntity.get(o)).filter(a => !!a) as Entity[];
   }

   async load() {
      const opacity = this.tiledObjectLayer.opacity;
      const hasTint = !!this.tiledObjectLayer.tintcolor;
      const tint = this.tiledObjectLayer.tintcolor ? Color.fromHex(this.tiledObjectLayer.tintcolor) : Color.White;
      const offset = vec(this.tiledObjectLayer.offsetx ?? 0, this.tiledObjectLayer.offsety ?? 0);

      const objects = parseObjects(this.tiledObjectLayer, this.resource.textQuality);

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

         const newActor = new Actor({
            name: object.tiledObject.name,
            x: (object.x ?? 0) + offset.x,
            y: (object.y ?? 0) + offset.y,
            anchor: Vector.Zero,
            rotation: toRadians(object.tiledObject.rotation ?? 0),
         });

         if (this.resource.useExcaliburWiring) {
            const collisionType = object.properties.get(ExcaliburTiledProperties.Collision.Type);
            if (collisionType && typeof collisionType === 'string') {
               switch(collisionType.toLowerCase()) {
                  case CollisionType.Active.toLowerCase(): {
                     newActor.body.collisionType = CollisionType.Active;
                     break;
                  }
                  case CollisionType.Fixed.toLowerCase(): {
                     newActor.body.collisionType = CollisionType.Fixed;
                     break;
                  }
                  case CollisionType.Passive.toLowerCase(): {
                     newActor.body.collisionType = CollisionType.Passive;
                     break;
                  }
                  case CollisionType.PreventCollision.toLowerCase(): {
                     newActor.body.collisionType = CollisionType.PreventCollision;
                     break;
                  }
                  default: {
                     this.logger.warn(`Unknown collision type in layer ${this.name}, for object id ${object.id} and name ${object.name}: ${collisionType}`);
                     break;
                  }
               }
            }
         }

         const graphics = newActor.get(GraphicsComponent);
         if (graphics) {
            graphics.opacity = opacity;
         }

         if (object instanceof Text) {
            newActor.graphics.use(object.text);
         }

         if (object instanceof InsertedTile) {
            const tileset = this.resource.getTilesetForTileGid(object.gid);
            const anchor = tileset.getTilesetAlignmentAnchor();
             // Inserted tiles pivot from the bottom left in Tiled
            newActor.anchor = anchor;
            const scaleX = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
            const scaleY = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
            const scale = vec(scaleX, scaleY);
            
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

            const colliders = tileset.getCollidersForGid(object.gid, { anchor: Vector.Zero, scale });
            if (colliders) {
               // insertable tiles have an x, y, width, height, gid
               // by default they pivot from the bottom left (0, 1)
               const width = (object.tiledObject.width ?? 0);
               const height = (object.tiledObject.height ?? 0);
               const offsetx = -width * anchor.x;
               const offsety = -height * anchor.y;
               const offset = vec(offsetx, offsety);
               for (let collider of colliders) {
                  collider.offset = offset;
               }
               newActor.collider.useCompositeCollider(colliders);
            }
         }

         if (object instanceof Polygon) {
            newActor.anchor = vec(0, 1);
            newActor.pos = vec(object.x, object.y);
            const polygon = Shape.Polygon(object.localPoints).triangulate();
            newActor.collider.set(polygon);
         }

         if (object instanceof Rectangle) {
            newActor.anchor = object.anchor;
            newActor.collider.useBoxCollider(object.width, object.height, object.anchor);
         }

         if (object instanceof Ellipse) {
            // FIXME: Excalibur doesn't support ellipses :( fallback to circle
            // pick the smallest dimension and that's our radius
            newActor.collider.useCircleCollider(Math.min(object.width, object.height) / 2);
         }

         this._recordObjectEntityMapping(object, newActor);
      }

      this._loaded = true;
   }

   private _recordObjectEntityMapping(object: PluginObject, entity: Entity){
      entity.addComponent(new TiledDataComponent({
         tiledObject: object
      }));
      this.objects.push(object);
      this.entities.push(entity);
      this._objectToEntity.set(object, entity);
      this._entityToObject.set(entity, object);
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
   private logger = Logger.getInstance();
   public readonly name: string;
   public readonly class?: string;
   /**
    * Number of tiles wide
    */
   public readonly width: number = 0;
   /**
    * Number of tiles high
    */
   public readonly height: number = 0;

   properties = new Map<string, string | number | boolean>();

   /**
    * Original list of gids for this layer from tiled
    */
   data: number[] = [];

   /**
    * Excalibur TileMap structure for drawing in excalibur
    */
   tilemap!: TileMap;


   getTileByPoint(worldPos: Vector): TileInfo | null {
      if (!this.tilemap) {
         this.logger.warn('Tilemap has not yet been loaded! getTileByPoint() will only return null');
         return null;
      }
      if (this.tilemap) {
         const exTile = this.tilemap.getTileByPoint(worldPos);
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
         const gid = getCanonicalGid(this.data[tileIndex])

         if (gid <= 0) {
            return null;
         }

         const tileset = this.resource.getTilesetForTileGid(gid);
         const tiledTile = tileset.getTileByGid(gid);

         return { tiledTile, exTile };
      }
      return null;
   }

   getTileByCoordinate(x: number, y: number): TileInfo | null {
      if (!this.tilemap) {
         this.logger.warn('Tilemap has not yet been loaded! getTileByCoordinate() will only return null');
         return null;
      }
      if (this.tilemap) {
         const exTile = this.tilemap.getTile(x, y);
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
         const gid = getCanonicalGid(this.data[tileIndex])

         if (gid <= 0) {
            return null;
         }

         const tileset = this.resource.getTilesetForTileGid(gid);
         const tiledTile = tileset.getTileByGid(gid);

         return { tiledTile, exTile };
      }
      return null;
   }

   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource) {
      this.name = tiledTileLayer.name;
      this.class = tiledTileLayer.class;
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.height;
      mapProps(this, tiledTileLayer.properties);
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

      const isSolidLayer = !!this.properties.get(ExcaliburTiledProperties.Layer.Solid);

      // Read tiled data into Excalibur's tilemap type
      for (let i = 0; i < this.data.length; i++) {
         let gid = this.data[i];
         if (gid !== 0) {
            const tile = this.tilemap.tiles[i];
            if (this.resource.useExcaliburWiring && isSolidLayer) {
               tile.solid = true;
            }

            const tileset = this.resource.getTilesetForTileGid(gid);
            let sprite = tileset.getSpriteForGid(gid);
            if (hasTint) {
               sprite = sprite.clone();
               sprite.tint = tint;
            }
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
               if (this.resource.useExcaliburWiring) {
                  const tileObj = tileset.getTileByGid(gid);
                  const strategy = tileObj?.properties.get(ExcaliburTiledProperties.Animation.Strategy);
                  if (strategy && typeof strategy === 'string') {
                     switch(strategy.toLowerCase()) {
                        case AnimationStrategy.End.toLowerCase(): {
                           animation.strategy = AnimationStrategy.End;
                           break;
                        }
                        case AnimationStrategy.Freeze.toLowerCase(): {
                           animation.strategy = AnimationStrategy.Freeze;
                           break;
                        }
                        case AnimationStrategy.Loop.toLowerCase(): {
                           animation.strategy = AnimationStrategy.Loop;
                           break;
                        }
                        case AnimationStrategy.PingPong.toLowerCase(): {
                           animation.strategy = AnimationStrategy.PingPong;
                           break;
                        }
                        default: {
                           // unknown animation strategy
                           this.logger.warn(`Unknown animation strategy in tileset ${tileset.name} on tile gid ${gid}: ${strategy}`);
                           break;
                        }
                     }
                  }

               }
            }
         }
      }
   }
}