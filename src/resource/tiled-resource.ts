import { Entity, ImageSource, Loadable, Resource, Scene, SpriteSheet, Vector } from "excalibur";
import { TiledMap, TiledParser, TiledTile, TiledTileset, TiledTilesetEmbedded, TiledTilesetExternal, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetEmbedded, isTiledTilesetExternal, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Tileset } from "./tileset";
import { Layer, TileLayer } from "./layer";
import { Template } from "./template";
import { compare } from "compare-versions";
import { getCanonicalGid } from "./gid-util";
import { pathRelativeToBase } from "./path-util";

export interface TiledResourceOptions {
   /**
    * Default true.
    * Automatically wires excalibur to the following
    * * camera
    */
   useExcaliburWiring?: boolean,
   mapFormatOverride?: 'TMX' | 'TMJ',
   /**
    * The pathMap helps work around odd things bundlers do with static files.
    *
    * When the Tiled resource comes across something that matches `path`, it will use the output string instead.
    */
   pathMap?: { path: string | RegExp, output: string }[];

   /**
    * By default `true`, means Tiled files must pass the plugins Typed parse pass.
    * 
    * If you have something that the Tiled plugin does not expect, you can set this to false and it will do it's best
    * to parse the Tiled source map file.
    */
   strictParsing?: boolean;
}

export interface FactoryProps {
   worldPos: Vector;
   name: string;
   type: string;
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
   private _factories = new Map<string, (props: FactoryProps) => Entity>();
   private _resource: Resource<string>;
   private _parser = new TiledParser();

   public firstGidToImage = new Map<number, ImageSource>();
   private tileToImage = new Map<TiledTile, ImageSource>();

   constructor(public path: string, options?: TiledResourceOptions) {
      const { mapFormatOverride } = { ...options };
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

   registerEntityFactory(type: string, factory: (props: FactoryProps) => Entity): void {
      if (this._factories.has(type)) {
         console.warn(`Another factory has already been registered for type "${type}", this is probably a bug.`);
      }
      this._factories.set(type, factory);
   }

   unregisterEntityFactory(type: string) {
      if (!this._factories.has(type)) {
         console.warn(`No factory has been registered for type "${type}", cannot unregister!`);
      }
      this._factories.delete(type);
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


   async load(): Promise<any> {
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

         // TODO external tileset collection of images
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

         }
         if (layer.type === 'imagelayer') {

         }
      }
      await Promise.all(friendlyLayers.map(layer => layer instanceof TileLayer ? layer.decodeAndBuild() : Promise.resolve()));
      console.log('friendlyLayers', friendlyLayers);
      this.layers = friendlyLayers;

      console.log(this);
   }

   addToScene(scene: Scene) {
      // TODO pick a position?
      for (const layer of this.layers) {
         if (layer instanceof TileLayer) {
            scene.add(layer.tilemap);
         }
      }
   }

   isLoaded(): boolean {
      throw new Error("Method not implemented.");
   }
   
}