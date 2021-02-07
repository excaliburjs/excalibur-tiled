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
   Loadable,
   Graphics,
   TextAlign,
   BaseAlign,
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

   /**
    * Given an origin file path, converts a file relative to that origin to a full path accessible from excalibur
    */
   public convertPath: (originPath: string, relativePath: string) => string;

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
      this.convertPath = (originPath: string, relativePath: string) => {
         // Use absolute path if specified
         if (relativePath.indexOf('/') === 0) {
            return relativePath;
         }

         const originSplit = originPath.split('/');
         const relativeSplit = relativePath.split('/');
         // if origin path is a file, remove it so it's a directory
         if (originSplit[originSplit.length - 1].includes('.')) {
            originSplit.pop();
         }
         return originSplit.concat(relativeSplit).join('/');
      }
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
      if (excalibur.length > 0) {
         const textobjects = excalibur.flatMap(o => o.getText());
         for (const text of textobjects) {
            const label = new Label({
               x: text.x,
               y: text.y + ((text.height ?? 0) - (text.text?.pixelSize ?? 0)),
               text: text.text?.text ?? '', 
               fontFamily: text.text?.fontFamily,
               fontSize: text.text?.pixelSize,
               fontUnit: FontUnit.Px,
            });
            label.font.textAlign = TextAlign.Left;
            label.font.baseAlign = BaseAlign.Top;
            label.rotation = text.rotation,
            label.color = Color.fromHex(text.text?.color ?? '#000000'),
            label.width = text.width ?? 0;
            label.height = text.height ?? 0;
            scene.add(label);
         }
      }
   }

   private _addTiledInsertedTiles(scene: Scene) {
      const excalibur = this.data?.getExcaliburObjects();
      if (excalibur.length > 0) {
         const inserted = excalibur.flatMap(o => o.getInsertedTiles());
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
               actor.graphics.anchor = vec(0, 1);
               actor.graphics.use(Graphics.Sprite.fromLegacySprite(sprite));
               scene.add(actor);
               const z = tile.getProperty<number>('zindex');
               if (z) {
                  actor.z = +z.value;
               }
            }
         }
      }
   }

   /**
    * Use any layers with the custom property "solid"= true, to mark the TileMap
    * cells solid.
    */
   public useSolidLayers() {
      const tm = this.getTileMap();
      const solidLayers = this.data?.getLayersByProperty('solid', true) ?? [];
      for (const solid of solidLayers) {
         for(let i = 0; i < solid.data.length; i++) {
            tm.data[i].solid ||= !!solid.data[i];
         }
      }
   }

   /**
    * Adds the TileMap and any parsed objects from Tiled into the Scene
    * @param scene 
    */
   public addTiledMapToScene(scene: Scene) {
      const tm = this.getTileMap();
      tm.components.transform.z = -1;
      scene.add(tm);
      
      this._parseExcaliburInfo();
      this._addTiledCamera(scene);
      this._addTiledColliders(scene);
      this._addTiledText(scene);
      this._addTiledInsertedTiles(scene);

      this.useSolidLayers();
   }

   private _parseExcaliburInfo() {
      // Tiled+Excalibur smarts
      const excalibur = this.data?.getExcaliburObjects();

      const ex: ExcaliburData = {};
      if (excalibur.length > 0) {
         // Parse cameras
         ex.camera = excalibur[0].getCamera();
         // Parse colliders
         ex.colliders = [];
         const boxColliders = excalibur.flatMap(o => o.getObjectsByType('boxcollider'));
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

         const circleColliders = excalibur.flatMap(o => o.getObjectsByType('circlecollider'));
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
            var tileset = new Resource<RawTiledTileset>(this.convertPath(this.path, ts.source), type);

            externalTilesets.push(tileset.load().then((external: any) => {
               if (type === 'text') {
                  external = parseExternalTsx(external, ts.firstgid, ts.source);
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
            let tileSetImage = ts.image;
            if (ts.source) {
               // if external tileset "source" is specified and images are relative to external tileset
               tileSetImage = this.convertPath(ts.source, ts.image)
            } else {
               // otherwise for embedded tilesets, images are relative to the tmx (this.path)
               tileSetImage = this.convertPath(this.path, ts.image)
            }
            const tx = new Texture(tileSetImage);
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

   /**
    * Given a Tiled gid (global identifier) return the Tiled tileset data
    * @param gid 
    */
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
      }

      // Create Excalibur sprites for each cell
      for (var layer of this.data.rawMap.layers) {
         if (layer.type === "tilelayer") {
            for (var i = 0; i < layer.data.length; i++) {
               let gid = <number>layer.data[i];

               if (gid !== 0) {
                  const sprite = this.getSpriteForGid(gid)
                  map.data[i].addSprite(sprite);
               }
            }
         }
      }
      this.map = map;
   }

   /**
    * Return the TileMap for the parsed Tiled map
    */
   public getTileMap(): TileMap {
      if (this.map) {
         return this.map;
      }
      throw new Error('Error loading tile map');
   }
}