import {
   Resource,
   Texture,
   TileMap,
   SpriteSheet,
   Logger,
   CollisionType,
   vec,
   Actor,
   Color,
   Vector,
   Scene,
   FontUnit,
   Label,
   Sprite,
   Loadable
} from 'excalibur';
import { ExcaliburData, RawTiledMap, RawTiledTileset } from './tiled-types';
import { TiledMap } from './tiled-map';
import { parseExternalTsx } from './tiled-tileset';
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from './tiled-layer';

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

export class TiledMapResource implements Loadable<TiledMap> {
   private _resource: Resource<string | RawTiledMap>;
   public data!: TiledMap;

   readonly mapFormat: TiledMapFormat;
   public ex: ExcaliburData;
   public imageMap: Record<string, Texture>;
   public sheetMap: Record<string, SpriteSheet>;
   public map?: TileMap;
   public imagePathAccessor: (path: string, ts: RawTiledTileset) => string;
   public externalTilesetPathAccessor: (path: string, ts: RawTiledTileset) => string;
   public pathFinder: (originPath: string, relativePath: string) => string;

   constructor(public path: string, mapFormatOverride?: TiledMapFormat) {
      const detectedType = mapFormatOverride ?? (path.includes('.tmx') ? TiledMapFormat.TMX : TiledMapFormat.JSON); 
      switch (detectedType) {
         case TiledMapFormat.TMX:
            this._resource = new Resource(path, 'text');
            break;
         case TiledMapFormat.JSON:
            this._resource = new Resource(path, 'json');
            break;
         default:
            throw `The format ${detectedType} is not currently supported. Please export Tiled map as JSON.`;
      }
      this.mapFormat = detectedType;
      this.ex = {};
      this.imageMap = {};
      this.sheetMap = {};
      this.pathFinder = (originPath: string, relativePath: string) => {
         const originSplit = originPath.split('/');
         const relativeSplit = relativePath.split('/');
         // if origin path is a file
         if (originSplit[originSplit.length - 1].includes('.')) {
            originSplit.pop();
         }
         return originSplit.concat(relativeSplit).join('/');
      }
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

   private _addTiledText(scene: Scene) {
      const excalibur = this.data?.getExcaliburObjects();
      if (excalibur) {
         const textobjects = excalibur.getText();
         for (const text of textobjects) {
            const label = new Label({
               x: text.x,
               y: text.y + (text.height ?? 0),
               anchor: vec(0, 0),
               text: text.text?.text, 
               rotation: text.rotation,
               fontFamily: text.text?.fontFamily,
               fontSize: text.text?.pixelSize,
               fontUnit: FontUnit.Px,
               color: Color.fromHex(text.text?.color ?? '#ffffff')
            });
            scene.add(label);
         }
      }
   }

   private _addTiledInsertedTiles(scene: Scene) {
      const excalibur = this.data?.getExcaliburObjects();
      if (excalibur) {
         const inserted = excalibur.getInsertedTiles();
         for (const tile of inserted) {
            const collisionTypeProp = tile.getProperty<CollisionType>('collisionType');
            let collisionType = CollisionType.PreventCollision;
            if (collisionTypeProp) {
               collisionType = collisionTypeProp.value;
            }
            if (tile.gid) {
               const sprite = this.getSpriteForGid(tile.gid);
               const actor = new Actor({
                  x: tile.x,
                  y: tile.y,
                  width: tile.width,
                  height: tile.height,
                  anchor: vec(0, 1),
                  rotation: tile.rotation,
                  collisionType
               });
               actor.addDrawing(sprite);
               scene.add(actor);
               const z = tile.getProperty<number>('zindex');
               if (z) {
                  actor.z = +z.value;
               }
            }
         }
      }
   }

   public addTiledMapToScene(scene: Scene) {
      this._parseExcaliburInfo();
      const tm = this.getTileMap();
      tm.components.transform.z = -1;
      scene.add(tm);

      this._addTiledCamera(scene);
      this._addTiledColliders(scene);
      this._addTiledText(scene);
      this._addTiledInsertedTiles(scene);

      const solidLayers = this.data?.getLayersByProperty('solid', true) ?? [];
      for (const solid of solidLayers) {
         for(let i = 0; i < solid.data.length; i++) {
            tm.data[i].solid ||= !!solid.data[i];
         }
      }
   }

   private _parseExcaliburInfo() {
      // Tiled+Excalibur smarts
      const excalibur = this.data?.getExcaliburObjects();

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

   public isLoaded() {
      return !!this.data;
   }

   public async load(): Promise<TiledMap> {
      const mapData = await this._resource.load();
      const tiledMap = await this._importMapData(mapData);
      let externalTilesets: Promise<any>[] = [];

      // Loop through loaded tileset data
      // If we find an image property, then
      // load the image and sprite

      tiledMap.rawMap.tilesets.forEach(ts => {
         // If we find a source property, then
         // load the tileset data, merge it with
         // existing data, and load the image and sprite
         if (ts.source) {
            const type = ts.source.includes('.tsx') ? 'text' : 'json';
            var tileset = new Resource<RawTiledTileset>(
               this.externalTilesetPathAccessor(ts.source, ts), type);

            externalTilesets.push(tileset.load().then((external: any) => {
               if (type === 'text') {
                  external = parseExternalTsx(external, ts);
               }
               Object.assign(ts, external);
               tiledMap.tileSets.push(external);
            }, () => {
               Logger.getInstance().error(`[Tiled] Error loading external tileset file ${tileset.path}`)
            }));
         }
      });

      // Load all tilesets if necessary
      await Promise.all(externalTilesets).then(() => {

         // external images
         let externalImages: Promise<any>[] = [];

         // retrieve images from tilesets and create textures
         tiledMap.rawMap.tilesets.forEach(ts => {
            // if external
            let tileSetImage = ts.image;
            if (ts.source) {
               tileSetImage = this.pathFinder(ts.source, ts.image)
            }
            const tx = new Texture(this.imagePathAccessor(tileSetImage, ts));
            this.imageMap[ts.firstgid] = tx;
            externalImages.push(tx.load());

            Logger.getInstance().debug("[Tiled] Loading associated tileset: " + ts.image);
         });

         return Promise.all(externalImages).then(() => {
            this._createTileMap();
         }, () => {
            Logger.getInstance().error("[Tiled] Error loading tileset images")
         });
      });

      return tiledMap;
   }

   private async _importMapData(data: string | RawTiledMap): Promise<TiledMap> {
      if (data === void 0) {
         throw `Tiled map resource ${this.path} is empty`;
      }

      switch (this.mapFormat) {
         case TiledMapFormat.TMX:
            return this.data = await TiledMap.fromTmx(data as string);
         case TiledMapFormat.JSON:
            return this.data = await TiledMap.fromJson(data as RawTiledMap);
         default:
            throw new Error('Unknown map format: ' + this.mapFormat);
      }
   }

   public getTilesetForTile(gid: number): RawTiledTileset {
      if (this.data) {
         for (var i = this.data.rawMap.tilesets.length - 1; i >= 0; i--) {
            var ts = this.data.rawMap.tilesets[i];
   
            if (ts.firstgid <= gid) {
               return ts;
            }
         }
      }
      throw Error(`No tileset exists for tiled gid [${gid}]!`);
   }

   /**
    * Given a Tiled TileSet gid, return the equivalent Excalibur Sprite
    * @param gid 
    */
   public getSpriteForGid(gid: number): Sprite {
      const h = isFlippedHorizontally(gid);
      const v = isFlippedVertically(gid);
      const d = isFlippedDiagonally(gid);
      const normalizedGid = getCanonicalGid(gid);
      const tileset = this.getTilesetForTile(normalizedGid);
      const spriteIndex = normalizedGid - tileset.firstgid;
      const spriteSheet = this.sheetMap[tileset.firstgid.toString()];
      if (spriteSheet) {
         let sprite = spriteSheet.sprites[spriteIndex];
         if (d || h || v) {
            sprite = sprite.clone();
            sprite.anchor = Vector.Half;
         }
         // See https://github.com/mapeditor/tiled/issues/2119#issuecomment-491533214
         if (d) {
            sprite.rotation = -Math.PI / 2;
            sprite.scale = vec(-1, 1);
         }
         if (h) {
            sprite.scale = vec((d ? 1 : -1) * sprite.scale.x, (d ? -1 : 1) * sprite.scale.y);
         }
         if (v) {
            sprite.scale = vec((d ? -1 : 1) * sprite.scale.x, (d ? 1 : -1) * sprite.scale.y);
         }
         return sprite;
      }
      throw new Error(`Could not find sprite for gid: [${gid}] normalized gid: [${normalizedGid}]`);
   }

   /**
    * Creates the Excalibur tile map representation
    */
   private _createTileMap() {
      const map = new TileMap(0, 0, this.data.rawMap.tilewidth, this.data.rawMap.tileheight, this.data.height, this.data.width);

      // register sprite sheets for each tileset in map
      for (const tileset of this.data.rawMap.tilesets) {
         const cols = Math.floor(tileset.imagewidth / tileset.tilewidth);
         const rows = Math.floor(tileset.imageheight / tileset.tileheight);
         const ss = new SpriteSheet(this.imageMap[tileset.firstgid], cols, rows, tileset.tilewidth, tileset.tileheight);
         this.sheetMap[tileset.firstgid.toString()] = ss;
         map.registerSpriteSheet(tileset.firstgid.toString(), ss);
      }

      for (var layer of this.data.rawMap.layers) {
         if (layer.type === "tilelayer") {
            for (var i = 0; i < layer.data.length; i++) {
               let gid = <number>layer.data[i];

               if (gid !== 0) {
                  const sprite = this.getSpriteForGid(gid)
                  map.data[i].sprites.push(sprite);
               }
            }
         }
      }
      this.map = map;
   }

   public getTileMap(): TileMap {
      if (this.map) {
         return this.map;
      }
      throw new Error('Error loading tile map');
   }
}