import { Entity, ImageSource, Loadable, Resource, Scene, SpriteSheet, Vector } from "excalibur";
import { TiledMap, TiledParser, TiledTile, TiledTileset, TiledTilesetEmbedded, TiledTilesetExternal, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetEmbedded, isTiledTilesetExternal, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Tile, Tileset } from "./tileset";
import { Layer, ObjectLayer, TileLayer } from "./layer";
import { Template } from "./template";
import { compare } from "compare-versions";
import { getCanonicalGid } from "./gid-util";
import { pathRelativeToBase } from "./path-util";
import { PluginObject } from "./objects";

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
    */
   useExcaliburWiring?: boolean; // TODO implement


   useTilemapCameraStrategy?: boolean // TODO implements

   /**
    * Plugin detects the map type based on extension, if you know better you can force an override.
    */
   mapFormatOverride?: 'TMX' | 'TMJ';

   /**
    * The pathMap helps work around odd things bundlers do with static files.
    *
    * When the Tiled resource comes across something that matches `path`, it will use the output string instead.
    */
   pathMap?: { path: string | RegExp, output: string }[]; // TODO implement

   /**
    * Optionally provide a custom file loader implementation instead of using the built in Excalibur resource ajax loader
    * that takes a path and returns file data
    */
   fileLoader?: (path: string) => Promise<any>; // TODO implement

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
   entityClassNameFactories?: Record<string,  (props: FactoryProps) => Entity>; // TODO implement
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
    * Tiled properties
    */
   properties: Record<string, any>;
}

export class TiledResource implements Loadable<any> {
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
   tilesets: Tileset[] = [];
   templates: Template[] = [];
   layers: Layer[] = [];

   public readonly mapFormat: 'TMX' | 'TMJ' = 'TMX';
   // ? should this be publish?
   public factories = new Map<string, (props: FactoryProps) => Entity>();
   private _resource: Resource<string>;
   private _parser = new TiledParser();

   public firstGidToImage = new Map<number, ImageSource>();
   private tileToImage = new Map<TiledTile, ImageSource>();
   public readonly textQuality: number = 4;

   constructor(public path: string, options?: TiledResourceOptions) {
      const { mapFormatOverride, textQuality, entityClassNameFactories } = { ...options };
      this.textQuality = textQuality ?? this.textQuality;
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

   registerEntityFactory(className: string, factory: (props: FactoryProps) => Entity): void {
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

   getTilesetForTile(gid: number): Tileset {
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

   getTilesByClassName(className: string): Tile[] {
      let results: Tile[] = [];
      for (let tileset of this.tilesets) {
         results = results.concat(tileset.tiles.filter(t => t.class === className));
      }

      return results;
   }

   getTilesByProperty(name: string, value?: any): Tile[] {
      let results: Tile[] = [];
      for (let tileset of this.tilesets) {
         if (value !== undefined) {
            results = results.concat(tileset.tiles.filter(t => t.properties.get(name) === value));
         } else {
            results = results.concat(tileset.tiles.filter(t => t.properties.has(name)));
         }
      }

      return results;
   }

   getImageLayers(): Layer[] {
      // TODO implement
      return [];
   }

   getTileLayers(): TileLayer[] {
      // TODO implement
      return [];
   }

   getObjectLayers(): ObjectLayer[] {
      // TODO implement
      return [];
   }

   getLayersByName(name: string): Layer[] {
      // TODO implement
      return [];
   }
   
   getLayersByClassName(className: string): Layer[] {
      // TODO implement
      return [];
   }

   getLayersByProperty(name: string, value?: any): Layer[] {
      // TODO implement
      return [];
   }


   async load(): Promise<any> {
      // TODO refactor this method is too BIG
      const data = await this._resource.load();

      // Parse initial Tiled map structure
      let map: TiledMap;
      try {

         if (this.mapFormat === 'TMX') {
            const xmlMap = data;
            map = this._parser.parse(xmlMap)
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
            const tilesetPath = pathRelativeToBase(this.path, tileset.source);
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
            const ts = this._parser.parseExternalTileset(externalTileset.data);
            ts.firstgid = firstgid;
            loadedTilesets.push(ts);
         }
      }
      console.log(loadedTilesets);

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
                  const imagePath = pathRelativeToBase(this.path, tile.image);
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
      console.log(images);

      // TODO Load templates

      // friendly plugin data structures

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

      console.log('friendlyTilesets', this.tilesets);

      // Templates
      // TODO Friendly templates

      // Layers
      let friendlyLayers: Layer[] = [];
      for (const layer of this.map.layers) {
         if (layer.type === 'tilelayer') {
            // TODO get tileset/tile props out of excalibur Types
            const tilelayer = new TileLayer(layer, this);
            friendlyLayers.push(tilelayer);
         }
         if (layer.type === 'objectgroup') {
            const objectlayer = new ObjectLayer(layer, this);
            friendlyLayers.push(objectlayer);
         }
         if (layer.type === 'imagelayer') {

         }
      }
      await Promise.all(friendlyLayers.map(layer => layer.load()));
      console.log('friendlyLayers', friendlyLayers);
      this.layers = friendlyLayers;

      console.log(this);
   }

   addToScene(scene: Scene, options?: TiledAddToSceneOptions) { // TODO implement
      // TODO pick a position to insert into the scene?
      for (const layer of this.layers) {
         if (layer instanceof TileLayer) {
            scene.add(layer.tilemap);
         }
         if (layer instanceof ObjectLayer) {
            for (const actor of layer.entities) {
               scene.add(actor);
            }
         }
         // TODO image layers
      }
   }

   isLoaded(): boolean {
      throw new Error("Method not implemented.");
   }
   
}