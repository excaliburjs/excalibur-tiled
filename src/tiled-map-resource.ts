import {
   Resource,
   Promise as ExcaliburPromise,
   Texture,
   TileMap,
   TileSprite,
   SpriteSheet,
   Logger,
   CollisionType,
   vec,
   Actor,
   Color,
   Vector,
   Scene
} from 'excalibur';
import { ExcaliburData, RawTiledTileset } from './tiled-types';
import { TiledMap } from './tiled-map';

export enum TiledMapFormat {

   /**
    * TMX map layer format
    */
   TMX = 'TMX',

   /**
    * JSON map layer format
    */
   JSON = 'JSON'
}

export class TiledMapResource extends Resource<TiledMap> {

   readonly mapFormat: TiledMapFormat;
   public ex: ExcaliburData;
   public imageMap: Record<string, Texture>;
   public imagePathAccessor: (path: string, ts: RawTiledTileset) => string;
   public externalTilesetPathAccessor: (path: string, ts: RawTiledTileset) => string;

   constructor(path: string, mapFormatOverride?: TiledMapFormat) {
      const detectedType = mapFormatOverride ?? (path.includes('.tmx') ? TiledMapFormat.TMX : TiledMapFormat.JSON); 
      switch (detectedType) {
         case TiledMapFormat.TMX:
            super(path, 'text');
            break;
         case TiledMapFormat.JSON:
            super(path, "json");
            break;
         default:
            throw `The format ${detectedType} is not currently supported. Please export Tiled map as JSON.`;
      }
      this.mapFormat = detectedType;
      this.ex = {};
      this.imageMap = {};
      this.imagePathAccessor = this.externalTilesetPathAccessor = (p, tileset) => {

         // Use absolute path if specified
         if (p.indexOf('/') === 0) {
            return p;
         }

         // Load relative to map path
         let pp = path.split('/');
         let relPath = pp.concat([]);

         if (pp.length > 0) {
            // remove file part of path
            relPath.splice(-1);
         }
         relPath.push(p);
         return relPath.join('/');
      };
   }

   private _addTiledCamera(scene: Scene) {
      const camera = this.ex.camera;
      if (camera) {
         scene.camera.x = camera.x;
         scene.camera.y = camera.y;
         scene.camera.z = camera.zoom;
      }
   }

   private _addTiledColliders(scene: Scene) {
      const colliders = this.ex.colliders;
      if (colliders) {
         for (let collider of colliders) {
            const actor = new Actor({
               pos: vec(collider.x, collider.y),
               collisionType: collider.collisionType ?? CollisionType.Fixed
            });
   
            if (collider.color) {
               actor.color = Color.fromHex(collider.color.value);
            }
            
            if (collider.type === 'box') { 
               actor.body.useBoxCollider(collider.width, collider.height, Vector.Zero);
            }
            if (collider.type === 'circle') {
               actor.body.useCircleCollider(collider.radius);
            }
   
            scene.add(actor);
            
            if (collider.zIndex) {
               actor.z = collider.zIndex;
            }
         }
      }
   }

   public addTiledMapToScene(scene: Scene) {
      this._parseExcaliburInfo();
      const tm = this.getTileMap();
      scene.add(tm);

      this._addTiledCamera(scene);
      this._addTiledColliders(scene);

      const solidLayers = this.data.getLayersByProperty('solid', true);
      for (let solid of solidLayers) {
         for(let i = 0; i < solid.data.length; i++) {
            tm.data[i].solid = !!solid.data[i];
         }
      }
   }

   private _parseExcaliburInfo() {
      // Tiled+Excalibur smarts
      const excalibur = this.data.getExcaliburObjects();

      const ex: ExcaliburData = {};
      if (excalibur) {
         // Parse cameras
         ex.camera = excalibur.getCamera();
         // Parse colliders
         ex.colliders = [];
         const boxColliders = excalibur.getObjectsByType('boxcollider');
         for (let box of boxColliders) {
            const collisionType = box.getProperty<CollisionType>('collisiontype');
            const color = box.getProperty<string>('color');
            const zIndex = box.getProperty<number>('zindex');
            ex.colliders.push({
               ...box,
               width: +(box.width ?? 0),
               height: +(box.height ?? 0),
               collisionType: collisionType?.value ?? CollisionType.Fixed,
               color,
               zIndex: +(zIndex?.value ?? 0),
               radius: 0,
               type: 'box'
            });
         }

         const circleColliders = excalibur.getObjectsByType('circlecollider');
         for (let circle of circleColliders) {
            var collisionType = circle.getProperty<CollisionType>('collisiontype');
            var color = circle.getProperty<string>('color');
            var zIndex = circle.getProperty<number>('zindex');
            ex.colliders.push({
               x: circle.x,
               y: circle.y,
               radius: Math.max(circle.width ?? 0, circle.height?? 0),
               collisionType: collisionType?.value ?? CollisionType.Fixed,
               color,
               zIndex: +(zIndex?.value ?? 0),
               width: circle.width ?? 0,
               height: circle.height ?? 0,
               type: 'circle'
            })
         }
      }
      this.ex = ex;
   }

   public load(): ExcaliburPromise<TiledMap> {
      var p = new ExcaliburPromise<TiledMap>();

      super.load().then((map?: TiledMap) => {
         this._importMapData(map).then(() => {
            let promises: ExcaliburPromise<any>[] = [];

            // Loop through loaded tileset data
            // If we find an image property, then
            // load the image and sprite

            // If we find a source property, then
            // load the tileset data, merge it with
            // existing data, and load the image and sprite

            this.data.rawMap.tilesets.forEach(ts => {
               if (ts.source) {
                  var tileset = new Resource<RawTiledTileset>(
                     this.externalTilesetPathAccessor(ts.source, ts), "json");

                  promises.push(tileset.load().then(external => {
                     (Object as any).assign(ts, external);
                  }));
               }
            });

            // wait or immediately resolve pending promises
            // for external tilesets
            ExcaliburPromise.join.apply(this, promises).then(() => {

               // clear pending promises
               promises = [];

               // retrieve images from tilesets and create textures
               this.data.rawMap.tilesets.forEach(ts => {
                  const tx = new Texture(this.imagePathAccessor(ts.image, ts));
                  this.imageMap[ts.firstgid] = tx;
                  promises.push(tx.load());

                  Logger.getInstance().debug("[Tiled] Loading associated tileset: " + ts.image);
               });

               ExcaliburPromise.join.apply(this, promises).then(() => {
                  p.resolve(map);
               }, (value?: any) => {
                  p.reject(value);
               });
            }, (value?: any) => {
               p.reject(value);
            });
         });
      });

      return p;
   }

   private async _importMapData(data: any): Promise<TiledMap> {
      if (data === void 0) {
         throw `Tiled map resource ${this.path} is empty`;
      }

      switch (this.mapFormat) {
         case TiledMapFormat.TMX:
            // fall through
            return this.data = await TiledMap.fromTmx(data as any);
         case TiledMapFormat.JSON:
            return this.data = await TiledMap.fromJson(data as any);
         default:
            throw new Error('Unknown map format: ' + this.mapFormat);
      }
   }

   public getTilesetForTile(gid: number): RawTiledTileset {
      for (var i = this.data.rawMap.tilesets.length - 1; i >= 0; i--) {
         var ts = this.data.rawMap.tilesets[i];

         if (ts.firstgid <= gid) {
            return ts;
         }
      }
      throw Error(`No tileset exists for tiled gid [${gid}]!`);
   }

   public getTileMap(): TileMap {
      var map = new TileMap(0, 0, this.data.rawMap.tilewidth, this.data.rawMap.tileheight, this.data.height, this.data.width);

      // register sprite sheets for each tileset in map
      for (var ts of this.data.rawMap.tilesets) {
         var cols = Math.floor(ts.imagewidth / ts.tilewidth);
         var rows = Math.floor(ts.imageheight / ts.tileheight);
         var ss = new SpriteSheet(this.imageMap[ts.firstgid], cols, rows, ts.tilewidth, ts.tileheight);

         map.registerSpriteSheet(ts.firstgid.toString(), ss);
      }

      for (var layer of this.data.rawMap.layers) {

         if (layer.type === "tilelayer") {
            for (var i = 0; i < layer.data.length; i++) {
               let gid = <number>layer.data[i];

               if (gid !== 0) {
                  var ts = this.getTilesetForTile(gid);

                  map.data[i].sprites.push(new TileSprite(ts.firstgid.toString(), gid - ts.firstgid))
               }
            }
         }
      }

      return map;
   }
}