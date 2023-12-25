import { Entity, ImageSource, Loadable, Logger, Resource, Scene, SpriteSheet, TransformComponent, Vector, vec } from "excalibur";
import { TiledMap, TiledParser, TiledTemplate, TiledTile, TiledTileset, TiledTilesetEmbedded, TiledTilesetExternal, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetEmbedded, isTiledTilesetExternal, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Tile, Tileset } from "./tileset";
import { ImageLayer, Layer, ObjectLayer, TileInfo, TileLayer } from "./layer";
import { Template } from "./template";
import { compare } from "compare-versions";
import { getCanonicalGid } from "./gid-util";
import { PathMap, pathRelativeToBase } from "./path-util";
import { PluginObject, TemplateObject } from "./objects";
import { byClassCaseInsensitive, byNameCaseInsensitive, byPropertyCaseInsensitive } from "./filter-util";
import { ExcaliburTiledProperties } from "./excalibur-properties";
import { FetchLoader, FileLoader } from './file-loader';

export interface TiledAddToSceneOptions {
   pos: Vector;
}

export interface TiledResourceOptions {

   /**
    * Plugin will operate in headless mode and skip all graphics related
    * excalibur items.
    */
   headless?: boolean; // TODO implement

   /**
    * Default true. If false, only tilemap will be parsed and displayed, it's up to you to wire up any excalibur behavior.
    * Automatically wires excalibur to the following
    * * Wire up current scene camera
    * * Make Actors/Tiles with colliders on Tiled tiles & Tiled objects
    * * Support solid layers
    *
    * Read more at excaliburjs.com!
    */
   useExcaliburWiring?: boolean;


   /**
    * Keeps the camera viewport within the bounds of the TileMap
    */
   useTilemapCameraStrategy?: boolean // TODO implements

   /**
    * Plugin detects the map type based on extension, if you know better you can force an override.
    */
   mapFormatOverride?: 'TMX' | 'TMJ';

   /**
    * The pathMap helps work around odd things bundlers do with static files by providing a way to redirect the original
    * source paths in the Tiled files to new locations.
    *
    * When the Tiled resource comes across something that matches `path`, it will use the output string instead.
    * 
    * Example:
    * ```typescript
    * const newResource = new TiledResource('./example-city.tmx', {
    *     pathMap: [
    *        // If the "path" is included in the source path, the output will be used
    *        { path: 'cone.tx', output: '/static/assets/cone.tx' },
    *        // Regex matching with special [match] in output string that is replaced with the first match from the regex
    *        { path: /(.*\..*$)/, output: '/static/assets/[match]'}
    *     ]
    *  }
    * ```
    */
   pathMap?: PathMap;

   /**
    * Optionally provide a custom file loader implementation instead of using the built in Excalibur resource ajax loader
    * that takes a path and returns file data
    */
   fileLoader?: FileLoader; // TODO implement

   /**
    * Optionally provide a custom image loader implementation instead of using the built in Excalibur ImageSource 
    */
   imageLoader?: (path: string) => Promise<HTMLImageElement>; // TODO does this even make sense? Or would headless mode suffice

   /**
    * By default `true`, means Tiled files must pass the plugins Typed parse pass.
    *
    * If you have something that the Tiled plugin does not expect, you can set this to false and it will do it's best
    * to parse the Tiled source map file.
    */
   strictTiledParsing?: boolean; // TODO implement

   /**
    * Configure the text quality in the Tiled resource
    *
    * By default it's 4 for 4x scaled bitmap
    */
   textQuality?: number;

   /**
    * Configure custom Actor/Entity factory functions to construct Actors/Entities
    * given a Tiled class name.
    */
   entityClassNameFactories?: Record<string,  (props: FactoryProps) => Entity | undefined>;
}

export interface FactoryProps {
   /**
    * Excalibur world position
    */
   worldPos: Vector;
   /**
    * Tiled name in UI
    */
   name?: string;
   /**
    * Tiled class in UI (internally in Tiled is represented as the string 'type')
    */
   class: string;
   /**
    * Layer (either TileLayer or ObjectLayer) that this object is part of
    */
   layer: Layer;
   /**
    * If using an object layer or a tile object property, the object will be passed.
    */
   object?: PluginObject;
   /**
    * Tiled properties, these are all converted to lowercase keys, and lowercase if the value is a string
    */
   properties: Record<string, any>;
}

export class TiledResource implements Loadable<any> {
   private logger = Logger.getInstance();
   /**
    * Currently the latest tested and supported version of Tiled
    * with the Excalibur Tiled plugin
    */
   public static supportedTiledVersion = '1.10.1';
   data: any;

   /**
    * The original tiled map representation in Tiled JSON/TMJ format
    * 
    * If loaded from a Tiled TMX file, it has been converted to the same JSON/TMJ format
    */
   map!: TiledMap;
   /**
    * A list of Tilesets from Tiled in a friendly data structure (original TSX/TSJ is available on that type)
    */
   tilesets: Tileset[] = [];
   /**
    * A list of Templates from Tiled in a friendly data structure (original TX/TJ is available on that type)
    */
   templates: Template[] = [];
   /**
    * A list of Layers from Tiled in a friendly data structure (original layer format is available on that type)
    *
    * Layers can either be an ObjectLayer, TileLayer, or ImageLayer
    *
    * GroupLayers don't exist in the plugin, they are flattened and the proper order preserved.
    */
   layers: Layer[] = [];

   public readonly mapFormat: 'TMX' | 'TMJ' = 'TMX';

   public factories = new Map<string, (props: FactoryProps) => Entity | undefined>();

   private _resource: Resource<string>;
   public parser = new TiledParser();

   public firstGidToImage = new Map<number, ImageSource>();
   private tileToImage = new Map<TiledTile, ImageSource>();

   public fileLoader: FileLoader = FetchLoader;
   public pathMap: PathMap | undefined;
   public readonly textQuality: number = 4;
   public readonly useExcaliburWiring: boolean = true;

   constructor(public path: string, options?: TiledResourceOptions) {
      const { mapFormatOverride, textQuality, entityClassNameFactories, useExcaliburWiring, pathMap } = { ...options };
      this.useExcaliburWiring = useExcaliburWiring ?? this.useExcaliburWiring;
      this.textQuality = textQuality ?? this.textQuality;
      this.pathMap = pathMap;
      for (const key in entityClassNameFactories) {
         this.registerEntityFactory(key, entityClassNameFactories[key]);
      }
      const detectedType = mapFormatOverride ?? (path.includes('.tmx') ? 'TMX' : 'TMJ');
      switch (detectedType) {
         case 'TMX':
            this._resource = new Resource(path, 'text');
            this.mapFormat = 'TMX';
            break;
         case 'TMJ':
            this._resource = new Resource(path, 'json');
            this.mapFormat = 'TMJ';
            break;
         default:
            throw new Error(`The format ${detectedType} is not currently supported. Please export Tiled map as JSON.`);
      }
   }

   registerEntityFactory(className: string, factory: (props: FactoryProps) => Entity | undefined): void {
      if (this.factories.has(className)) {
         console.warn(`Another factory has already been registered for tiled class/type "${className}", this is probably a bug.`);
      }
      this.factories.set(className, factory);
   }

   unregisterEntityFactory(className: string) {
      if (!this.factories.has(className)) {
         console.warn(`No factory has been registered for tiled class/type "${className}", cannot unregister!`);
      }
      this.factories.delete(className);
   }

   /**
    * Given a gid, find the Tileset it belongs to in the map!
    * @param gid 
    * @returns 
    */
   getTilesetForTileGid(gid: number): Tileset {
      const normalizedGid = getCanonicalGid(gid)
      if (this.tilesets) {
         for (let tileset of this.tilesets) {
               if (normalizedGid >= tileset.firstGid && normalizedGid <= tileset.firstGid + tileset.tileCount - 1) {
                  return tileset;
               }
         }
      }
      throw Error(`No tileset exists for tiled gid [${gid}] normalized [${normalizedGid}]!`);
   }

   /**
    * Queries for tilesets in the map by name (case insensitive)
    * @param name 
    * @returns 
    */
   getTilesetByName(name: string): Tileset[] {
      return this.tilesets.filter(byNameCaseInsensitive(name));
   }
   /**
    * Queries for tilesets in the map by class name (case insensitive)
    * @param className 
    * @returns 
    */
   getTilesetByClassName(className: string): Tileset[] {
      return this.tilesets.filter(byClassCaseInsensitive(className));
   }

   /**
    * Queries for tilesets in the map by property and an optional value (case insensitive)
    * @param propertyName 
    * @param value 
    * @returns 
    */
   getTilesetByProperty(propertyName: string, value?: any): Tileset[] {
      return this.tilesets.filter(byPropertyCaseInsensitive(propertyName, value));
   }

   /**
    * Queries ALL tilesets in the map for a specific class name (case insensitive)
    * @param className 
    * @returns 
    */
   getTilesByClassName(className: string): Tile[] {
      let results: Tile[] = [];
      for (let tileset of this.tilesets) {
         results = results.concat(tileset.tiles.filter(byClassCaseInsensitive(className)));
      }
      return results;
   }

   /**
    * Queries ALL tilesets in the map for a specific property and an optional value (case insensitive)
    * @param name 
    * @param value 
    * @returns 
    */
   getTilesByProperty(name: string, value?: any): Tile[] {
      let results: Tile[] = [];
      for (let tileset of this.tilesets) {
            results = results.concat(tileset.tiles.filter(byPropertyCaseInsensitive(name, value)));
      }
      return results;
   }

   /**
    * Returns a tile by the world position from a layer. (Uses the first layer name that matches case insensitive).
    * @param layerName 
    * @param worldPos 
    * @returns 
    */
   getTileByPoint(layerName: string, worldPos: Vector): TileInfo | null {
      const layer = this.getTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
         return layer.getTileByPoint(worldPos);
      }

      return null;
   }

   /**
    * Queries all layers for objects that match a name (case insensitive)
    * @param name 
    * @returns 
    */
   getObjectsByName(name: string): PluginObject[] {
      let results: PluginObject[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getObjectsByName(name));
      }
      return results;
   }

   getEntitiesByName(name: string): Entity[] {
      let results: Entity[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getEntitiesByName(name));
      }
      return results;
   }

   getEntityByObject(object: PluginObject): Entity | undefined {
      for (let objectlayer of this.getObjectLayers()) {
         const entity = objectlayer.getEntityByObject(object);
         if (entity) {
            return entity;
         }
      }
      return;
   }

   getObjectByEntity(actor: Entity): PluginObject | undefined {
      for (let objectlayer of this.getObjectLayers()) {
         const object = objectlayer.getObjectByEntity(actor);
         if (object) {
            return object;
         }
      }
      return;
   }

   /**
    * Search for a tiled object that has a property name, and optionally specify a value
    * @param propertyName 
    * @param value 
    * @returns 
    */
   getObjectsByProperty(propertyName: string, value?: any): PluginObject[] {
      let results: PluginObject[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getObjectsByProperty(propertyName, value));
      }
      return results;
   }
   /**
    * Search for actors that were created from tiled objects
    * @returns 
    */
   getEntitiesByProperty(propertyName: string, value?: any): Entity[] {
      let results: Entity[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getEntitiesByProperty(propertyName, value));
      }
      return results;
   }

   /**
    * Search for an Tiled object by it's Tiled class name
    * @returns 
    */
   getObjectsByClassName(className: string): PluginObject[] {
      let results: PluginObject[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getObjectsByClassName(className));
      }
      return results;
   }

   /**
    * Search for an Actor created by the plugin by it's Tiled object
    * @param className 
    * @returns 
    */
   getEntitiesByClassName(className: string): Entity[] {
      let results: Entity[] = [];
      for (let objectlayer of this.getObjectLayers()) {
         results = results.concat(objectlayer.getEntitiesByClassName(className));
      }
      return results;
   }

   /**
    * Returns a tile by x, y integer coordinate from a layer. (Uses the first layer name that matches case insensitive).
    * @param layerName 
    * @param x 
    * @param y 
    * @returns 
    */
   getTileByCoordinate(layerName: string, x: number, y: number): TileInfo | null {
      const layer = this.getTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
         return layer.getTileByCoordinate(x, y);
      }

      return null;
   }

   getImageLayers(): ImageLayer[] {
      return this.layers.filter(l => l instanceof ImageLayer) as ImageLayer[];
   }

   getTileLayers(): TileLayer[] {
      return this.layers.filter(l => l instanceof TileLayer) as TileLayer[];
   }

   getObjectLayers(): ObjectLayer[] {
      return this.layers.filter(l => l instanceof ObjectLayer) as ObjectLayer[];
   }

   getLayersByName(name: string): Layer[] {
      return this.layers.filter(byNameCaseInsensitive(name));
   }
   
   getLayersByClassName(className: string): Layer[] {
      return this.layers.filter(byClassCaseInsensitive(className));
   }

   getLayersByProperty(propertyName: string, value?: any): Layer[] {
      return this.layers.filter(byPropertyCaseInsensitive(propertyName, value));
   }


   async load(): Promise<any> {
      // TODO refactor this method is too BIG
      const data = await this._resource.load();

      // Parse initial Tiled map structure
      let map: TiledMap;
      try {

         if (this.mapFormat === 'TMX') {
            const xmlMap = data;
            map = this.parser.parse(xmlMap)
         } else {
            map = TiledMap.parse(data);
         }
      } catch (e) {
         console.error(`Could not parse tiled map from location ${this.path}, attempted to interpret as ${this.mapFormat}.\nExcalibur only supports the latest version of Tiled formats as of the plugin's release.`);
         console.error(`Is your map file corrupted or being interpreted as the wrong type?`)
         throw e;
      }

      if (compare(TiledResource.supportedTiledVersion, map.tiledversion, ">")) {
         console.warn(`The excalibur tiled plugin officially supports ${TiledResource.supportedTiledVersion}+, the current map has tiled version ${map.tiledversion}`)
      }
      this.map = map;

      // Resolve initial tilesets either embedded or external
      let embeddedTilesets: TiledTilesetEmbedded[] = [];
      let externalTilesets: Resource<string>[] = [];
      let externalToFirstGid = new Map<Resource<string>, number>();
      for (const tileset of this.map.tilesets) {
         if (isTiledTilesetEmbedded(tileset)) {
            embeddedTilesets.push(tileset);
         }
         if (isTiledTilesetExternal(tileset)) {
            const type = tileset.source.includes('.tsx') ? 'text' : 'json';
            // TODO make this into a tileset resource!
            // GH issue about this https://github.com/excaliburjs/excalibur-tiled/issues/455
            const tilesetPath = pathRelativeToBase(this.path, tileset.source, this.pathMap);
            const externalTileset = new Resource<string>(tilesetPath, type);
            externalToFirstGid.set(externalTileset, tileset.firstgid);
            externalTilesets.push(externalTileset);
         }
      }
      // Load external TMX/TMJ tilesets
      let loadedTilesets: TiledTileset[] = [...embeddedTilesets];
      const externalTilesetsLoading = externalTilesets.map(ts => ts.load());
      await Promise.all(externalTilesetsLoading);
      for (const externalTileset of externalTilesets) {
         const firstgid = externalToFirstGid.get(externalTileset);
         if (firstgid === undefined || firstgid === -1) {
            throw Error(`Could not load external tileset correctly ${externalTileset.path} not firstGid, is your tilemap corrupted`);
         }
         // TMJ tileset
         if (externalTileset.responseType === 'json') {
            const ts = TiledTilesetFile.parse(externalTileset.data);
            ts.firstgid = firstgid;
            loadedTilesets.push(ts);
         }
         // TMX tileset
         if (externalTileset.responseType === 'text') {
            const ts = this.parser.parseExternalTileset(externalTileset.data);
            ts.firstgid = firstgid;
            loadedTilesets.push(ts);
         }
      }

      // load all images
      // 1/2 Internal+External tilesets
      // 3 Collection of images tilesets
      let images: ImageSource[] = [];
      for (const tileset of loadedTilesets) {
         if (isTiledTilesetSingleImage(tileset) && tileset.firstgid) {
            const image = new ImageSource(tileset.image);
            this.firstGidToImage.set(tileset.firstgid, image);
            images.push(image);
         }
         if (isTiledTilesetCollectionOfImages(tileset)) {
            for (let tile of tileset.tiles) {
               if (tile.image) {
                  const imagePath = pathRelativeToBase(this.path, tile.image, this.pathMap);
                  const image = new ImageSource(imagePath);
                  this.tileToImage.set(tile, image);
                  images.push(image);
               }
            }
         }
      }

      await Promise.all(images.map(i => i.load().catch(() => {
         console.error(`Unable to load Tiled Tileset image ${i.path}, if you are using a bundler check the files are where they should be. Use "pathMap" to adjust file mappings to work around bundlers`);
      })));

      // Friendly plugin data structures

      // Tilesets
      for (const tileset of loadedTilesets) {
         if (isTiledTilesetSingleImage(tileset) && tileset.firstgid) {
            const spacing = tileset.spacing;
            const columns = Math.floor((tileset.imagewidth + spacing) / (tileset.tilewidth + spacing));
            const rows = Math.floor((tileset.imageheight + spacing) / (tileset.tileheight + spacing));
            const image = this.firstGidToImage.get(tileset.firstgid);
            if (image) {
               const spritesheet = SpriteSheet.fromImageSource({
                  image,
                  grid: {
                     rows,
                     columns,
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
                        y: tileset.spacing ?? 0
                     }
                  }
               });
               const friendlyTileset = new Tileset({
                  name: tileset.name,
                  tiledTileset: tileset,
                  spritesheet
               });
               this.tilesets.push(friendlyTileset);
            }
         }

         if (isTiledTilesetCollectionOfImages(tileset)) { 
            const friendlyTileset = new Tileset({
               name: tileset.name,
               tiledTileset: tileset,
               tileToImage: this.tileToImage
            });
            this.tilesets.push(friendlyTileset);
         }
      }

      // Templates
      // Scan for template refrences in object files
      let templates: string[] = [];
      for (const layer of this.map.layers) {
         if (layer.type === 'objectgroup') {
            let templateObjects = layer.objects.filter(o => o.template).map(o => o.template) as string[];
            templates = templates.concat(templateObjects);
         }
      }
      // unique template paths
      const uniqueTemplatePaths = templates.filter((value, index, array) => {
         return array.findIndex(path => path === value) === index;
      });

      // Load Friendly templates
      this.templates = uniqueTemplatePaths.map(path => new Template(path, this));
      await Promise.all(this.templates.map(t => t.load()));

      // Layers
      let friendlyLayers: Layer[] = [];
      for (const layer of this.map.layers) {
         if (layer.type === 'tilelayer') {
            const tilelayer = new TileLayer(layer, this);
            friendlyLayers.push(tilelayer);
         }
         if (layer.type === 'objectgroup') {
            const objectlayer = new ObjectLayer(layer, this);
            friendlyLayers.push(objectlayer);
         }
         if (layer.type === 'imagelayer') {
            const imagelayer = new ImageLayer(layer, this);
            friendlyLayers.push(imagelayer);
         }
      }
      await Promise.all(friendlyLayers.map(layer => layer.load()));
      this.layers = friendlyLayers;

   }

   addToScene(scene: Scene, options?: TiledAddToSceneOptions) {
      if (!this.isLoaded()) {
         this.logger.warn(`TiledResource ${this.path} is not loaded! Nothing will be wired into excalibur!`);
         return;
      }
      const defaultOptions: TiledAddToSceneOptions = {
         pos: vec(0, 0)
      };
      const { pos } = { ...defaultOptions, ...options };
      for (const layer of this.layers) {
         if (layer instanceof TileLayer) {
            layer.tilemap.pos = layer.tilemap.pos.add(pos);
            scene.add(layer.tilemap);
         }
         if (layer instanceof ObjectLayer) {
            for (const entity of layer.entities) {
               const tx = entity.get(TransformComponent);
               if (tx) {
                  tx.pos = tx.pos.add(pos);
               }
               scene.add(entity);
            }
         }
         if (layer instanceof ImageLayer) {
            if (layer.imageActor) {
               layer.imageActor.pos = layer.imageActor.pos.add(pos);
               scene.add(layer.imageActor);
            }
         }
      }

      if (this.useExcaliburWiring) {
         const objects = this.getObjectsByProperty(ExcaliburTiledProperties.Camera.Camera, true);
         if (objects && objects.length) {
            const cameraObject = objects[0];
            let zoom = 1;
            const zoomProp = cameraObject.properties.get(ExcaliburTiledProperties.Camera.Zoom);
            if (zoomProp && typeof zoomProp === 'number') {
               zoom = zoomProp;
            }
            scene.camera.pos = vec(cameraObject.x, cameraObject.y);
            scene.camera.zoom = zoom;
         }
      }
   }

   isLoaded(): boolean {
      return !!this.map;
   }
}