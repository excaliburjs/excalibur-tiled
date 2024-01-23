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
   Font,
   Collider,
   CompositeCollider,
   IsometricMap,
   IsometricEntityComponent,
   Animation,
   ParallaxComponent,
   Tile,
   Text,
   BoundingBox
} from 'excalibur';
import { ExcaliburData } from './tiled-types';
import { RawTiledTileset } from "./raw-tiled-tileset";
import { RawTiledLayer } from "./raw-tiled-layer";
import { RawTiledMap } from "./raw-tiled-map";
import { TiledMap } from './tiled-map-parser';
import { parseExternalJson, parseExternalTsx, TiledTileset, TiledTilesetTile } from './tiled-tileset';
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from './tiled-layer';
import { getProperty, TiledEntity } from './tiled-entity';
import { TiledObjectComponent } from './tiled-object-component';
import { TiledLayerComponent } from './tiled-layer-component';
import { RawTilesetTile } from './raw-tileset-tile';
import { TiledLayer } from './tiled-layer';
import { TiledObjectGroup } from './tiled-object';

/**
 * @deprecated
 */
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

/**
 * @deprecated
 */
export interface TiledMapOptions {
   /**
    * By default files ending in .tmx are treated as TMX format, otherwise treated as JSON format
    */
   mapFormatOverride?: TiledMapFormat;

   /**
    * Override the starting auto-incrementing z-index value (default: `-1`). Each layer will increment this number by 1 unless the layer specifies it's own custom `z-index` property.
    */
   startingLayerZIndex?: number;
}

/**
 * @deprecated
 */
export class TiledMapResource implements Loadable<TiledMap> {
   private _resource: Resource<string | RawTiledMap>;
   public data!: TiledMap;

   readonly mapFormat: TiledMapFormat;
   public ex: ExcaliburData;
   public imageMap: Record<string, ImageSource>;
   public tileImageMap: Record<string, [tile: RawTilesetTile, image: ImageSource][]>;
   public sheetMap: Record<string, SpriteSheet>;
   public layers?: TileMap[] = [];
   public isoLayers: IsometricMap[] = [];
   private _layerZIndexStart = -1;

   private _mapToRawLayer = new Map<TileMap|IsometricMap, RawTiledLayer>();

   /**
    * Given an origin file path, converts a file relative to that origin to a full path accessible from excalibur
    */
   public convertPath: (originPath: string, relativePath: string) => string;

   /**
    * 
    * @param path Specify a path to your Tiled map source files (usually path/to/my_map.tmx)
    * @param options Optionally configure other aspects of the tilemap like start layer z-index and map format 
    */
   constructor(public path: string, options?: TiledMapOptions) {
      const { mapFormatOverride, startingLayerZIndex } = { ...options };
      this._layerZIndexStart = startingLayerZIndex ?? this._layerZIndexStart;
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
      this.tileImageMap = {};
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
         let cameraPos = vec(camera.x, camera.y);
         if (this.isIsometric()) {
            cameraPos = this._isoTileToScreenCoords(camera.x, camera.y);
         }
         scene.camera.x = cameraPos.x;
         scene.camera.y = cameraPos.y;
         scene.camera.zoom = camera.zoom;
      }
   }

   private _addTiledColliders(scene: Scene) {
      const colliders = this.ex.colliders;
      if (colliders) {
         for (let collider of colliders) {
            const actor = new Actor({
               pos: vec(collider.x, collider.y),
               name: collider.name,
               collisionType: collider.collisionType ?? CollisionType.Fixed
            });

            if (collider.color) {
               actor.color = Color.fromHex(collider.color.value);
            }

            if (collider.type === 'box') {
               if (this.isIsometric()) {
                  actor.pos = this._isoTileToScreenCoords(collider.x, collider.y);
                  const bb = new BoundingBox({
                     left: 0,
                     top: 0,
                     right: collider.width,
                     bottom: collider.height
                  });
                  const points = bb.getPoints().map(p => this._isoTileToScreenCoords(p.x, p.y));
                  actor.collider.usePolygonCollider(points, Vector.Zero);
               } else {
                  actor.collider.useBoxCollider(collider.width, collider.height, Vector.Zero);
               }
            }
            if (collider.type === 'circle') {
               // FIXME no ellipse support yet for colliders in isometric
               actor.collider.useCircleCollider(collider.radius);
            }
            // @ts-ignore
            actor.addComponent(new TiledObjectComponent(collider.tiled));
            scene.add(actor);
            if (collider.zIndex) {
               actor.z = collider.zIndex;
            }
         }
      }
   }

   private _isoTileToScreenCoords(x: number, y: number) {
      // Transformation sourced from:
      // https://discourse.mapeditor.org/t/how-to-get-cartesian-coords-of-objects-from-tileds-isometric-map/4623/3
      if (this.isIsometric()) {
         const map = this.isoLayers[0];
         const tileWidth = map.tileWidth;
         const tileHeight = map.tileHeight;
         const originX = 0;
         const tileY = y / tileHeight;
         const tileX = x / tileHeight;
         return vec(
            (tileX - tileY) * tileWidth / 2 + originX,
            (tileX + tileY) * tileHeight / 2);
      }
      return vec(x, y);
   }

   private _addTiledText(scene: Scene) {
      const excaliburObjectLayers = this.data?.getObjects();
      if (excaliburObjectLayers && excaliburObjectLayers.length > 0) {
         for (const objectLayer of excaliburObjectLayers) {
            const textObjects = objectLayer.getText();
            for (const text of textObjects) {
               let worldPos = vec(text.x, text.y + ((text.height ?? 0) - (text.text?.pixelSize ?? 0)));
               if (this.isIsometric()) {
                  worldPos = this._isoTileToScreenCoords(text.x, text.y);
               }
               const label = new Label({
                  anchor: Vector.Zero,
                  x: worldPos.x,
                  y: worldPos.y,
                  text: text.text?.text ?? '',
                  name: this._getEntityName(text),
                  font: new Font({
                     family: text.text?.fontFamily,
                     size: text.text?.pixelSize,
                     unit: FontUnit.Px
                  })
               });
               label.font.textAlign = TextAlign.Left;
               label.font.baseAlign = BaseAlign.Top;
               label.rotation = text.rotation;
               label.color = Color.fromHex(text.text?.color ?? '#000000');
               label.collider.set(Shape.Box(text.width ?? 0, text.height ?? 0));
               label.body.collisionType = CollisionType.PreventCollision;
               // @ts-ignore
               label.addComponent(new TiledObjectComponent(text));

               label.z = this._calculateZIndex(text, objectLayer);
               if (this.isIsometric()) {
                  // The component just needs the tile width/height and row/cols
                  // all the layers are the same so we can just use the first
                  const iso = new IsometricEntityComponent(this.isoLayers[0]);
                  label.addComponent(iso);
                  iso.elevation = objectLayer.order;
               }
               scene.add(label);
            }
         }
      }
   }

   private _addTiledInsertedTiles(scene: Scene) {
      const excaliburObjectLayers = this.data?.getObjects();
      if (excaliburObjectLayers && excaliburObjectLayers.length > 0) {
         for (const objectLayer of excaliburObjectLayers) {
            const inserted = objectLayer.getInsertedTiles();
            for (const tile of inserted) {
               const collisionTypeProp = tile.getProperty<CollisionType>('collisionType');
               let collisionType = CollisionType.PreventCollision;
               if (collisionTypeProp) {
                  collisionType = collisionTypeProp.value;
               }
               let worldPos = vec(tile.x, tile.y);
               if (this.isIsometric()) {
                  worldPos = this._isoTileToScreenCoords(tile.x, tile.y);
               }

               if (tile.gid) {
                  const sprite = this.getSpriteForGid(tile.gid);
                  const colliders = this.getCollidersForGid(tile.gid);
                  const actor = new Actor({
                     x: worldPos.x,
                     y: worldPos.y,
                     width: tile.width,
                     height: tile.height,
                     anchor: this.isIsometric() ? vec(.5, 1) : vec(0, 1),
                     rotation: tile.rotation,
                     collisionType,
                     name: this._getEntityName(tile)
                  });
                  if (this.isIsometric()) {
                     const map = this.isoLayers[0];
                     for (let c of colliders) {
                        c.offset = vec(-map.tileWidth / 2, -map.tileHeight * 2)
                     }
                  }
                  if (colliders.length) {
                     actor.collider.clear();
                     actor.collider.set(new CompositeCollider(colliders));
                  }
                  // @ts-ignore
                  actor.addComponent(new TiledObjectComponent(tile));
                  actor.graphics.anchor = this.isIsometric() ? vec(.5, 1) : vec(0, 1);
                  // respect tile size on sprite
                  sprite.destSize.width = tile.width ?? sprite.destSize.width;
                  sprite.destSize.height = tile.height ?? sprite.destSize.height;
                  actor.graphics.use(sprite);
                  if (this.isIsometric()) {
                     // The component just needs the tile width/height and row/cols
                     // all the layers are the same so we can just use the first
                     const iso = new IsometricEntityComponent(this.isoLayers[0]);
                     actor.addComponent(iso);
                     iso.elevation = objectLayer.order;
                  }
                  scene.add(actor);
                  actor.z = this._calculateZIndex(tile, objectLayer);
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
      let tms: (TileMap | IsometricMap)[] = this.getTileMapLayers();
      tms = tms.concat(this.isoLayers);
      for (const tm of tms) {
         const rawLayer = this._mapToRawLayer.get(tm);
         if (rawLayer) {
            const solidLayer = getProperty<number>(rawLayer.properties, 'solid')?.value ?? false;
            if (solidLayer) {
               for (let i = 0; i < rawLayer.data.length; i++) {
                  tm.tiles[i].solid ||= !!rawLayer.data[i];
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

      for (const iso of this.isoLayers) {
         scene.add(iso);
      }

      // TODO tiled uses different coordinates for iso and iso staggered
      this._addTiledCamera(scene);
      this._addTiledColliders(scene);
      this._addTiledText(scene);
      this._addTiledInsertedTiles(scene);

      this.useSolidLayers();
   }

   private _parseExcaliburInfo() {
      // Tiled+Excalibur smarts
      const excaliburObjectLayers = this.data?.getObjects();

      const ex: ExcaliburData = {};
      if (excaliburObjectLayers.length > 0) {
         // Parse cameras find the first
         ex.camera = excaliburObjectLayers.find(objectlayer => objectlayer.getObjectByClass('camera'))?.getCamera();
         // Parse colliders
         ex.colliders = [];
         for (let objectLayer of excaliburObjectLayers) {

            const boxColliders = objectLayer.getObjectsByClass('boxcollider');

            for (let box of boxColliders) {
               const collisionType = box.getProperty<CollisionType>('collisiontype');
               const color = box.getProperty<string>('color');
               const zIndex = this._calculateZIndex(box, objectLayer);
               ex.colliders.push({
                  ...box,
                  width: +(box.width ?? 0),
                  height: +(box.height ?? 0),
                  collisionType: collisionType?.value ?? CollisionType.Fixed,
                  color,
                  zIndex: zIndex,
                  radius: 0,
                  type: 'box',
                  tiled: box,
                  name: this._getEntityName(box)
               });
            }

            const circleColliders = objectLayer.getObjectsByClass('circlecollider');
            for (let circle of circleColliders) {
               const collisionType = circle.getProperty<CollisionType>('collisiontype');
               const color = circle.getProperty<string>('color');
               const zIndex = this._calculateZIndex(circle, objectLayer);
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
                  tiled: circle,
                  name: this._getEntityName(circle)
               })
            }
         }
      }
      this.ex = ex;
   }

   public isLoaded() {
      return !!this.data;
   }

   public isIsometric() {
      return !!this.isoLayers.length;
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
               } else {
                  external = parseExternalJson(external, ts.firstgid, ts.source);
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
            let tileSetImages: string[] = [];
            // if image is specified it's a single image tileset
            if (ts.image) {
               if (ts.source) {
                  // if external tileset "source" is specified and images are relative to external tileset
                  tileSetImages = [this.convertPath(ts.source, ts.image)];
               } else {
                  // otherwise for embedded tilesets, images are relative to the tmx (this.path)
                  tileSetImages = [this.convertPath(this.path, ts.image)];
               }
               for (let image of tileSetImages) {
                  const tx = new ImageSource(image);
                  this.imageMap[ts.firstgid] = tx;
                  externalImages.push(tx.load());
                  Logger.getInstance().debug("[Tiled] Loading associated tileset image: " + ts.image);
               }
            } else {
               // otherwise it's a collection of images tileset
               for (let tile of ts.tiles) {
                  let tileImage: string;
                  if (ts.source) {
                     tileImage = this.convertPath(ts.source, tile.image);
                  } else {
                     tileImage = this.convertPath(this.path, tile.image);
                  }
                  const tx = new ImageSource(tileImage);
                  externalImages.push(tx.load());
                  if (!this.tileImageMap[ts.firstgid]) {
                     this.tileImageMap[ts.firstgid] = [];
                  }
                  this.tileImageMap[ts.firstgid].push([tile, tx]);
                  Logger.getInstance().debug("[Tiled] Loading associated tileset image: " + tileImage);
               }
            }
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
   public getTilesetForTile(gid: number): TiledTileset {
      if (this.data) {
         for (var i = this.data.tileSets.length - 1; i >= 0; i--) {
            var ts = this.data.tileSets[i];

            if (gid >= ts.firstGid && gid <= ts.firstGid + ts.tileCount - 1) {
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
      const spriteIndex = normalizedGid - tileset.firstGid;
      const spriteSheet = this.sheetMap[tileset.firstGid.toString()];
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

   private _transformPoints(points: Vector[], tileset: TiledTileset, gid: number) {
      const h = isFlippedHorizontally(gid);
      const v = isFlippedVertically(gid);
      const d = isFlippedDiagonally(gid);
      if (d) {
         points = points.map(p => tileset.diagonalFlipTransform.multiply(p));
      }
      if (h) {
         points = points.map(p => tileset.horizontalFlipTransform.multiply(p));
      }
      if (v) {
         points = points.map(p => tileset.verticalFlipTransform.multiply(p));
      }
      return points;
   }

   public getCollidersForGid(gid: number): Collider[] {
      const normalizedGid = getCanonicalGid(gid);
      const tileset = this.getTilesetForTile(normalizedGid);
      const tileIndex = normalizedGid - tileset.firstGid;
      const tileWithObjects = tileset.tiles.find(t => t.id === tileIndex);
      if (tileWithObjects && tileWithObjects.objectgroup) {
         const result = [];
         for (const polygon of tileWithObjects.objectgroup.getPolygons()) {
            const offset = vec(polygon.x, polygon.y);
            const points = polygon.polygon.points;
            const parsed = points.split(" ")
               .map((tp: string) => {
                  const point = tp.split(",");
                  return vec(Number.parseFloat(point[0]), Number.parseFloat(point[1])).add(offset)
               });
            const poly = Shape.Polygon(parsed);
            poly.points = this._transformPoints(poly.points, tileset, gid);
            result.push(poly);
         }

         for (const box of tileWithObjects.objectgroup.getBoxes()) {
            const boxCollider = Shape.Box(box.width, box.height, Vector.Zero);
            boxCollider.points = boxCollider.points.map(p => p.add(vec(box.x, box.y)));
            boxCollider.points = this._transformPoints(boxCollider.points, tileset, gid);
            result.push(boxCollider);
         }

         for (const circle of tileWithObjects.objectgroup.getEllipses()) {
            const circleCollider = Shape.Circle(
               Math.min(circle.width / 2, circle.height / 2),
               vec(circle.width / 2, circle.height / 2).add(vec(circle.x, circle.y)));
            result.push(circleCollider);
         }

         return result;
      }
      return [];
   }

   public getAnimationForGid(gid: number): Animation | null {
      const normalizedGid = getCanonicalGid(gid);
      const tileset = this.getTilesetForTile(normalizedGid);
      const tileIndex = normalizedGid - tileset.firstGid;
      const tileWithAnimation = tileset.tiles.find(t => t.id === tileIndex);
      if (tileWithAnimation && tileWithAnimation.hasAnimation()) {
         return tileWithAnimation.getAnimation(this);
      }
      return null;
   }

   private _calculateZIndex(entity: TiledEntity, tileLayerOrObjectGroup: TiledLayer | TiledObjectGroup): number {
      let finalZ = entity.getProperty<number>('z')?.value ?? entity.getProperty<number>('zindex')?.value;

      finalZ ??= (tileLayerOrObjectGroup.order + this._layerZIndexStart);

      // coerce to integer
      return +finalZ
   }

   private _getEntityName(entity: TiledEntity): string | undefined {
      return entity.name;
   }
   /**
    * Creates the Excalibur tile map representation
    */
   private _createTileMap() {
      // register sprite sheets for each tileset in map
      for (const tileset of this.data.rawMap.tilesets) {
         const spacing = tileset.spacing ?? 0;
         const cols = Math.floor((tileset.imagewidth + spacing) / (tileset.tilewidth + spacing));
         const rows = Math.floor((tileset.imageheight + spacing) / (tileset.tileheight + spacing));
         // Single image tilesets
         if (this.imageMap[tileset.firstgid]) {
            // Tiled and Excalibur use the same words for different things :facepalm:
            // Tiled margin is the same as Excalibur originOffset
            // Tiled spacing is the same as Excalibur margin
            const ss = SpriteSheet.fromImageSource({
               image: this.imageMap[tileset.firstgid],
               grid: {
                  columns: cols,
                  rows: rows,
                  spriteWidth: tileset.tilewidth,
                  spriteHeight: tileset.tileheight
               },
               spacing: {
                  originOffset: {
                     x: tileset.margin ?? 0,
                     y: tileset.margin ?? 0
                  },
                  margin: {
                     x: tileset.spacing ?? 0,
                     y: tileset.spacing ?? 0,
                  }
               }
            });
            this.sheetMap[tileset.firstgid.toString()] = ss;
         // Image collection tilesets
         } else {
            const tiles = this.tileImageMap[tileset.firstgid];
            const sprites = tiles.map(([tile, imageSource]) => {
               const sprite = imageSource.toSprite();
               return sprite;
            })
            const ss = new SpriteSheet({sprites});
            this.sheetMap[tileset.firstgid.toString()] = ss;
         }
      }

      // Create Excalibur sprites for each cell
      for (var layer of this.data.layers) {
         if (layer.rawLayer.type === "tilelayer") {
            if (this.data.orientation === "orthogonal") {

               const rawLayer = layer.rawLayer;
               const tileMapLayer = new TileMap({
                  name: layer.rawLayer.name,
                  pos: vec(layer.offset.x, layer.offset.y),
                  tileWidth: this.data.rawMap.tilewidth,
                  tileHeight: this.data.rawMap.tileheight,
                  columns: this.data.width,
                  rows: this.data.height
               });
               // @ts-ignore
               tileMapLayer.addComponent(new TiledLayerComponent(layer));
               if (layer.rawLayer.parallaxx || layer.rawLayer.parallaxy) {
                  const factor = vec(layer.rawLayer.parallaxx ?? 1.0, layer.rawLayer.parallaxy ?? 1.0);
                  tileMapLayer.addComponent(new ParallaxComponent(factor));
               }

               // I know this looks goofy, but the entity and the layer "it belongs" to are the same here
               tileMapLayer.z = this._calculateZIndex(layer, layer); 
               for (let i = 0; i < rawLayer.data.length; i++) {
                  let gid = <number>rawLayer.data[i];
                  if (gid !== 0) {
                     const sprite = this.getSpriteForGid(gid);
                     tileMapLayer.tiles[i].addGraphic(sprite);
                     const colliders = this.getCollidersForGid(gid);
                     for (let collider of colliders) {
                        tileMapLayer.tiles[i].addCollider(collider);
                     }
                     const animation = this.getAnimationForGid(gid);
                     if (animation) {
                        tileMapLayer.tiles[i].clearGraphics();
                        tileMapLayer.tiles[i].addGraphic(animation);
                     }
                  }
               }
               this._mapToRawLayer.set(tileMapLayer, rawLayer);
               this.layers?.push(tileMapLayer);
            }
            if (this.data.orientation === "isometric") {
               const rawLayer = layer.rawLayer;
               const iso = new IsometricMap({
                  name: layer.rawLayer.name,
                  pos: vec(layer.offset.x, layer.offset.y),
                  columns: this.data.width,
                  rows: this.data.height,
                  tileWidth: this.data.tileWidth,
                  tileHeight: this.data.tileHeight
               });
               const tx = iso.get(TransformComponent);
               if (tx) {
                  tx.z = this._calculateZIndex(layer, layer);
               }
               for (let i = 0; i < rawLayer.data.length; i++) {
                  let gid = <number>rawLayer.data[i];
                  if (gid !== 0) {
                     const sprite = this.getSpriteForGid(gid);
                     iso.tiles[i].addGraphic(sprite);
                     const colliders = this.getCollidersForGid(gid);
                     for (let collider of colliders) {
                        iso.tiles[i].addCollider(collider);
                     }
                     const isoComponent = iso.tiles[i].get(IsometricEntityComponent);
                     if (isoComponent) {
                        isoComponent.elevation = layer.order;
                     }
                  }
               }
               iso.updateColliders();
               this._mapToRawLayer.set(iso, rawLayer);
               this.isoLayers?.push(iso);
            }
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
      return [];
   }

   /**
    * Return the IsometricMap layers for the parsed Tiled map
    */
   public getIsometricMapLayers(): IsometricMap[] {
      if (this.isoLayers?.length) {
         return this.isoLayers;
      }
      return [];
   }

   private _lookupTile(tilemap: TileMap, tile: Tile, layerName: string) {
      const tileIndex = tilemap.tiles.indexOf(tile); // both ex and tiled share the same index

      // Tiled data
      // gid can be found by looking up the original data, locate layer by name
      const tiledLayer = this.data.getTileLayerByName(layerName);
      const tileGid = getCanonicalGid(tiledLayer.data[tileIndex]);

      // No tile case
      if (tileGid === 0) {
         return null;
      }

      // Tiled tileset properties
      const tiledTileset = this.getTilesetForTile(tileGid);
      // odd quirk of Tiled's data the gid's here are off by 1 from the data array :/
      const tiledTile = tiledTileset.tiles.find(t => t.id === (tileGid - 1));
      if (!tiledTile) {
         return {
            id: tileGid - 1,
            tileset: tiledTileset,
            properties: {}
         } as TiledTilesetTile
      }
      return tiledTile;
   }

   public getTileByPoint(layerName: string, worldPos: Vector): TiledTilesetTile | null {
      // ex TileMap data structure by name
      const tilemap = this.getTileMapLayers().find(tm => tm.name === layerName);
      if (tilemap) {

         const tile = tilemap.getTileByPoint(worldPos);
         if (!tile) return null;
         return this._lookupTile(tilemap, tile, layerName);
      }
      return null;
   }

   public getTileByCoordinate(layerName: string, x: number, y: number): TiledTilesetTile | null {
      // ex TileMap data structure by name
      const tilemap = this.getTileMapLayers().find(tm => tm.name === layerName);
      if (tilemap) {

         const tile = tilemap.getTile(x, y);
         return this._lookupTile(tilemap, tile, layerName);
      }
      return null;
   }
}
