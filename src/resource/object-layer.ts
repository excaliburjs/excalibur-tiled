import { Actor, CollisionType, Color, Entity, GraphicsComponent, IsometricEntityComponent, Logger, Shape, Vector, toRadians, vec } from "excalibur";
import { Layer } from "./layer";
import { InsertedTile, PluginObject, TemplateObject, Text, Polygon, Rectangle, Ellipse, parseObjects } from "./objects";
import { TiledObjectLayer } from "../parser/tiled-parser";
import { FactoryProps, TiledResource } from "./tiled-resource";
import { mapProps } from "./properties";
import { byClassCaseInsensitive, byNameCaseInsensitive, byPropertyCaseInsensitive } from "./filter-util";
import { Tileset } from "./tileset";
import { ExcaliburTiledProperties } from "./excalibur-properties";
import { TiledDataComponent } from "./tiled-data-component";

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
   constructor(public tiledObjectLayer: TiledObjectLayer, public resource: TiledResource, public readonly order: number) {
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


   getTemplates(): TemplateObject[] {
      if (!this._loaded) this._logLoadedWarning('getTemplates');
      return this.objects.filter(o => o instanceof TemplateObject) as TemplateObject[];
   }

   /**
    * Runs or re-runs a specific registered factory given a class name on this object layer
    * @param className
    */
   runFactory(className: string) {
      const offset = vec(this.tiledObjectLayer.offsetx ?? 0, this.tiledObjectLayer.offsety ?? 0);
      // create a copy of the objects to prevent editing the current collection
      const objects = this.objects.slice();
      for (let object of objects) {
         let objectType = object.class;
         if (object instanceof TemplateObject) {
            objectType = objectType ? objectType : object.template.object.class;
         }

         if (className !== objectType) continue;

         let worldPos = vec((object.x ?? 0) + offset.x, (object.y ?? 0) + offset.y);

         // When isometric, Tiled positions are in isometric coordinates
         if (this.resource.map.orientation === 'isometric') {
            worldPos = this.resource.isometricTiledCoordToWorld(worldPos.x, worldPos.y);
         }

         const factory = this.resource.factories.get(className);
         if (factory) {
            // TODO does this entity get added to the scene?
            const entity = factory({
               worldPos,
               name: object.name,
               class: objectType,
               layer: this,
               object,
               properties: object.properties
            } satisfies FactoryProps);
            if (entity) {
               this._recordObjectEntityMapping(object, entity);
            }
         }
      }
   }

   _actorFromObject(object: PluginObject, newActor: Actor, tileset?: Tileset): void {
      const headless = this.resource.headless;
      const hasTint = !!this.tiledObjectLayer.tintcolor;
      const tint = this.tiledObjectLayer.tintcolor ? Color.fromHex(this.tiledObjectLayer.tintcolor) : Color.White;

      if (object instanceof InsertedTile && tileset) {
         // handle case where we have isometric map but orthogonal tileset!s
         const overrideAlignment = this.resource.map.orientation === 'isometric' && tileset.orientation === 'orthogonal' ? 'bottom' : undefined;
         const anchor = tileset.getTilesetAlignmentAnchor(overrideAlignment);
         // Inserted tiles pivot from the bottom left in Tiled
         newActor.anchor = anchor;
         const scaleX = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
         const scaleY = (object.tiledObject.width ?? this.resource.map.tilewidth) / this.resource.map.tilewidth;
         const scale = vec(scaleX, scaleY);

         if (!headless) {
            // need to clone because we are modify sprite properties, sprites are shared by default
            const sprite = tileset.getSpriteForGid(object.gid).clone();
            sprite.destSize.width = object.tiledObject.width ?? sprite.width;
            sprite.destSize.height = object.tiledObject.height ?? sprite.height;
            if (hasTint) {
               sprite.tint = tint;
            }

            newActor.graphics.use(sprite);
            newActor.graphics.offset = tileset.tileOffset;

            const animation = tileset.getAnimationForGid(object.gid);
            if (animation) {
               const animationScaled = animation.clone();
               animationScaled.scale = scale;
               if (hasTint) {
                  animationScaled.tint = tint;
               }
               newActor.graphics.use(animationScaled);
               newActor.graphics.offset = tileset.tileOffset;
            }
         }

         // insertable tiles have an x, y, width, height, gid
         // by default they pivot from the bottom left (0, 1)
         const width = (object.tiledObject.width ?? 0);
         const height = (object.tiledObject.height ?? 0);
         const offsetx = -width * anchor.x;
         const offsety = -height * anchor.y;
         const halfTileWidth = this.resource.map.tilewidth / 2;
         const tileHeight = this.resource.map.tileheight;
         let offset = vec(offsetx, offsety);
         if (this.resource.map.orientation === 'isometric') {
            offset = vec(offsetx + halfTileWidth, offsety + tileHeight);
            if (tileset.orientation === 'orthogonal') {
               // Handling odd case where the tileset is orthogonal but the map is isometric
               offset = offset.sub(vec(halfTileWidth, tileHeight));
            }
         }

         const colliders = tileset.getCollidersForGid(object.gid, { anchor: Vector.Zero, scale, offset });
         if (colliders.length) {
            newActor.collider.useCompositeCollider(colliders);
         } else {
            let width = object.width;
            let height = object.height;
            if (this.resource.map.orientation === 'isometric') {
               // Isometric uses height to organize grid alignment
               const dimension = object.height / 2;
               width = dimension;
               height = dimension;
            }
            // Anchor at 1,1 for isometric is a quirk of the coord transformation
            let boxCollider = Shape.Box(width, height, this.resource.map.orientation === 'isometric' ? vec(1, 1) : vec(0, 1));
            if (this.resource.map.orientation === 'isometric') {
               boxCollider.points = boxCollider.points.map(p => this.resource.isometricTiledCoordToWorld(p.x, p.y));
            }
            newActor.collider.set(boxCollider);
         }
      }

      if (object instanceof Text) {
         newActor.graphics.use(object.text);
      }

      if (object instanceof Polygon) {
         let pos = vec(object.x, object.y);
         let points = object.localPoints;

         if (this.resource.map.orientation === 'isometric') {
            pos = this.resource.isometricTiledCoordToWorld(pos.x, pos.y);
            points = points.map(p => this.resource.isometricTiledCoordToWorld(p.x, p.y));
         }

         newActor.anchor = vec(0, 1);
         newActor.pos = pos;
         const polygon = Shape.Polygon(points, Vector.Zero, true);
         if (!polygon.isConvex()) {
            newActor.collider.set(polygon.triangulate());
         } else {
            newActor.collider.set(polygon);
         }
      }

      if (object instanceof Rectangle) {
         newActor.anchor = object.anchor;
         let boxCollider = Shape.Box(object.width, object.height, object.anchor);
         if (this.resource.map.orientation === 'isometric') {
            boxCollider.points = boxCollider.points.map(p => this.resource.isometricTiledCoordToWorld(p.x, p.y));
         }
         newActor.collider.set(boxCollider);
      }

      if (object instanceof Ellipse) {
         // FIXME: Circles are positioned differently in isometric as ellipses and currently arent supported
         // FIXME: Excalibur doesn't support ellipses :( fallback to circle
         // pick the smallest dimension and that's our radius
         newActor.collider.useCircleCollider(Math.min(object.width, object.height) / 2);
      }
   }

   async load() {
      const opacity = this.tiledObjectLayer.opacity;
      const offset = vec(this.tiledObjectLayer.offsetx ?? 0, this.tiledObjectLayer.offsety ?? 0);
      const objects = parseObjects(this.tiledObjectLayer, this.resource);

      for (let object of objects) {
         let worldPos = vec((object.x ?? 0) + offset.x, (object.y ?? 0) + offset.y);

         // When isometric, Tiled positions are in isometric coordinates
         if (this.resource.map.orientation === 'isometric') {
            worldPos = this.resource.isometricTiledCoordToWorld(worldPos.x, worldPos.y);
         }

         let objectType = object.class;
         if (object instanceof TemplateObject) {
            objectType = objectType ? objectType : object.template.object.class;
         }
         if (objectType) {
            const factory = this.resource.factories.get(objectType);
            if (factory) {
               const entity = factory({
                  worldPos,
                  name: object.name,
                  class: objectType,
                  layer: this,
                  object,
                  properties: object.properties
               } satisfies FactoryProps);
               if (entity) {
                  this._recordObjectEntityMapping(object, entity);
               }
               continue; // If we do a factor method we skip any default processing
            }
         }

         let zindex = undefined;
         let zoverride = this.properties.get(ExcaliburTiledProperties.ZIndex.ZIndex) as number | undefined;
         if (typeof zoverride === 'number') {
            zindex = zoverride;
         }

         const newActor = new Actor({
            name: object.tiledObject.name,
            pos: worldPos,
            anchor: Vector.Zero,
            rotation: toRadians(object.tiledObject.rotation ?? 0),
            z: zindex
         });
         const graphics = newActor.get(GraphicsComponent);
         if (graphics) {
            graphics.visible = this.tiledObjectLayer.visible && (object.tiledObject.visible === undefined ? true : !!object.tiledObject.visible);
            graphics.opacity = opacity;
         }

         if (this.resource.map.orientation === 'isometric') {
            const iso = new IsometricEntityComponent({
               rows: this.resource.map.height,
               columns: this.resource.map.width,
               tileWidth: this.resource.map.tilewidth,
               tileHeight: this.resource.map.tileheight
            });
            iso.elevation = zindex ?? this.order;
            newActor.addComponent(iso);
         }

         if (this.resource.useExcaliburWiring) {
            const collisionType = object.properties.get(ExcaliburTiledProperties.Collision.Type);
            if (collisionType && typeof collisionType === 'string') {
               switch (collisionType.toLowerCase()) {
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


         if (object instanceof TemplateObject) {
            // templates reference their own tilesets
            const tileset = object.template.tileset;
            if (object.template.object) {
               this._actorFromObject(object.template.object, newActor, tileset);
            }
         } else {
            let tileset: Tileset | undefined;
            if (object instanceof InsertedTile) {
               tileset = this.resource.getTilesetForTileGid(object.gid);
            }
            this._actorFromObject(object, newActor, tileset);
         }

         this._recordObjectEntityMapping(object, newActor);
      }

      this._loaded = true;
   }

   private _recordObjectEntityMapping(object: PluginObject, entity: Entity) {
      entity.addComponent(new TiledDataComponent({
         tiledObject: object
      }));
      this.objects.push(object);
      this.entities.push(entity);
      this._objectToEntity.set(object, entity);
      this._entityToObject.set(entity, object);
   }
}