import {
   Resource,
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
   TextAlign,
   BaseAlign,
   Flags,
   Shape,
   TransformComponent,
   ImageSource,
   Font
} from 'excalibur';
import { ExcaliburData, RawTiledLayer, RawTiledMap, RawTiledTileset } from './tiled-types';
import { TiledMap } from './tiled-map';
import { parseExternalTsx } from './tiled-tileset';
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from './tiled-layer';
import { getProperty } from './tiled-entity';
import { TiledObjectComponent } from './tiled-object-component';
import { TiledLayerComponent } from './tiled-layer-component';

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

export interface TiledMapOptions {
   /**
    * Optionally override the map format, by default files ending in .tmx are treated as TMX format, otherise treated as JSON format
    */
   mapFormatOverride?: TiledMapFormat;

   /**
    * Optionally Specify the first layer z-index value, each layer will increment up 1 unless overridden (default -1)
    */
   firstLayerZIndex?: number;
}

export class TiledMapResource implements Loadable<TiledMap> {
   private _resource: Resource<string | RawTiledMap>;
   public data!: TiledMap;

   readonly mapFormat: TiledMapFormat;
   public ex: ExcaliburData;
   public imageMap: Record<string, ImageSource>;
   public sheetMap: Record<string, SpriteSheet>;
   public layers?: TileMap[] = [];
   private _layerZIndexStart = -1;

   private _mapToRawLayer = new Map<TileMap, RawTiledLayer>();

   /**
    * Given an origin file path, converts a file relative to that origin to a full path accessible from excalibur
    */
   public convertPath: (originPath: string, relativePath: string) => string;

   /**
    * 
    * @param path Specify a path to your Tiled map source files (usually path/to/my_map.tmx)
    * @param options Optionally configure other aspecits 
    */
   constructor(public path: string, options?: TiledMapOptions) {
      const { mapFormatOverride, firstLayerZIndex } = { ...options};
      this._layerZIndexStart = firstLayerZIndex ?? this._layerZIndexStart;
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
         scene.camera.zoom = camera.zoom;
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
               actor.collider.useBoxCollider(collider.width, collider.height, Vector.Zero);
            }
            if (collider.type === 'circle') {
               actor.collider.useCircleCollider(collider.radius);
            }
            actor.addComponent(new TiledObjectComponent(collider.tiled));
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
               font: new Font({
                  family: text.text?.fontFamily,
                  size: text.text?.pixelSize,
                  unit: FontUnit.Px
               })
            });
            label.font.textAlign = TextAlign.Left;
            label.font.baseAlign = BaseAlign.Top;
            label.rotation = text.rotation,
               label.color = Color.fromHex(text.text?.color ?? '#000000'),
               label.collider.set(Shape.Box(text.width ?? 0, text.height ?? 0));
            label.addComponent(new TiledObjectComponent(text));
            scene.add(label);
         }
      }
   }

   private _addTiledInsertedTiles(scene: Scene) {
      const excaliburObjectLayers = this.data?.getExcaliburObjects();
      if (excaliburObjectLayers.length > 0) {
         for (const objectLayer of excaliburObjectLayers) {
            const inserted = objectLayer.getInsertedTiles();
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
                  actor.addComponent(new TiledObjectComponent(tile));
                  if (Flags.isEnabled('use-legacy-drawing')) {
                     actor.addDrawing(Sprite.toLegacySprite(sprite));
                  } else {
                     actor.graphics.anchor = vec(0, 1);
                     actor.graphics.use(sprite);
                  }
                  scene.add(actor);
                  const z = tile.getProperty<number>('zindex')?.value ?? (objectLayer.rawObjectGroup.order + this._layerZIndexStart);
                  if (z) {
                     actor.z = +z;
                  }
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
      const tms = this.getTileMapLayers();
      for (const tm of tms) {
         const rawLayer = this._mapToRawLayer.get(tm);
         if (rawLayer) {
            const solidLayer = getProperty<number>(rawLayer.properties, 'solid')?.value ?? false;
            if (solidLayer) {
               for (let i = 0; i < rawLayer.data.length; i++) {
                  tm.data[i].solid ||= !!rawLayer.data[i];
               }
            }
         }
      }
   }

   /**
    * Adds the TileMap and any parsed objects from Tiled into the Scene
    * @param scene 
    */
   public addTiledMapToScene(scene: Scene) {
      const tms = this.getTileMapLayers();
      for (const tm of tms) {
         scene.add(tm);
      }

      this._addTiledCamera(scene);
      this._addTiledColliders(scene);
      this._addTiledText(scene);
      this._addTiledInsertedTiles(scene);

      this.useSolidLayers();
   }

   private _parseExcaliburInfo() {
      // Tiled+Excalibur smarts
      const excaliburObjectLayers = this.data?.getExcaliburObjects();

      const ex: ExcaliburData = {};
      if (excaliburObjectLayers.length > 0) {
         // Parse cameras find the first
         ex.camera = excaliburObjectLayers.find(objectlayer => objectlayer.getObjectByType('camera'))?.getCamera();
         // Parse colliders
         ex.colliders = [];
         for (let objectLayer of excaliburObjectLayers) {

            const boxColliders = objectLayer.getObjectsByType('boxcollider');

            for (let box of boxColliders) {
               const collisionType = box.getProperty<CollisionType>('collisiontype');
               const color = box.getProperty<string>('color');
               const zIndex = box.getProperty<number>('zindex')?.value ?? (objectLayer.rawObjectGroup.order + this._layerZIndexStart);
               ex.colliders.push({
                  ...box,
                  width: +(box.width ?? 0),
                  height: +(box.height ?? 0),
                  collisionType: collisionType?.value ?? CollisionType.Fixed,
                  color,
                  zIndex: zIndex,
                  radius: 0,
                  type: 'box',
                  tiled: box
               });
            }

            const circleColliders = objectLayer.getObjectsByType('circlecollider');
            for (let circle of circleColliders) {
               var collisionType = circle.getProperty<CollisionType>('collisiontype');
               var color = circle.getProperty<string>('color');
               var zIndex = circle.getProperty<number>('zindex')?.value ?? (objectLayer.rawObjectGroup.order + this._layerZIndexStart);
               ex.colliders.push({
                  x: circle.x,
                  y: circle.y,
                  radius: Math.max(circle.width ?? 0, circle.height ?? 0),
                  collisionType: collisionType?.value ?? CollisionType.Fixed,
                  color,
                  zIndex: zIndex,
                  width: circle.width ?? 0,
                  height: circle.height ?? 0,
                  type: 'circle',
                  tiled: circle
               })
            }
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
            const tx = new ImageSource(tileSetImage);
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

      this._parseExcaliburInfo();
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
      let layerZIndexBase = this._layerZIndexStart;

      // register sprite sheets for each tileset in map
      for (const tileset of this.data.rawMap.tilesets) {
         const cols = Math.floor(tileset.imagewidth / tileset.tilewidth);
         const rows = Math.floor(tileset.imageheight / tileset.tileheight);
         const ss = SpriteSheet.fromImageSource({
            image: this.imageMap[tileset.firstgid],
            grid: {
               columns: cols,
               rows: rows,
               spriteWidth: tileset.tilewidth,
               spriteHeight: tileset.tileheight
            }
         });
         this.sheetMap[tileset.firstgid.toString()] = ss;
      }

      // Create Excalibur sprites for each cell
      for (var layer of this.data.layers) {
         if (layer.rawLayer.type === "tilelayer") {
            const rawLayer = layer.rawLayer;
            const tileMapLayer = new TileMap(0, 0, this.data.rawMap.tilewidth, this.data.rawMap.tileheight, this.data.height, this.data.width);
            tileMapLayer.addComponent(new TiledLayerComponent(layer));

            const zindex = getProperty<number>(rawLayer.properties, 'zindex')?.value ?? (layer.rawLayer.order + layerZIndexBase);
            tileMapLayer.z = zindex;
            for (var i = 0; i < rawLayer.data.length; i++) {
               let gid = <number>rawLayer.data[i];
               if (gid !== 0) {
                  const sprite = this.getSpriteForGid(gid)
                  tileMapLayer.data[i].addGraphic(sprite);
               }
            }
            this._mapToRawLayer.set(tileMapLayer, rawLayer);
            this.layers?.push(tileMapLayer);
         }
      }
   }

   /**
    * Return the TileMap layers for the parsed Tiled map
    */
   public getTileMapLayers(): TileMap[] {
      if (this.layers?.length) {
         return this.layers;
      }
      throw new Error('Error loading tile map layers');
   }
}