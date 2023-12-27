import { ImageSource, Loadable, SpriteSheet } from "excalibur";
import { Tileset } from "./tileset";
import { TiledParser, TiledTile, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { FetchLoader, FileLoader } from "./file-loader";
import { PathMap, pathRelativeToBase } from "./path-util";
import { LoaderCache } from "./loader-cache";

export interface TilesetResourceOptions {
   parser?: TiledParser,
   fileLoader?: FileLoader,
   imageLoader?: LoaderCache<ImageSource>,
   pathMap?: PathMap
}

export class TilesetResource implements Loadable<Tileset> {
   data!: Tileset;
   firstGid: number;
   private fileLoader: FileLoader = FetchLoader;
   private imageLoader: LoaderCache<ImageSource>;
   private pathMap?: PathMap;
   private parser: TiledParser;

   constructor(public path: string, firstGid: number, options?: TilesetResourceOptions) {
      const { fileLoader, parser, pathMap, imageLoader } = {...options};
      this.fileLoader = fileLoader ?? this.fileLoader;
      this.imageLoader = imageLoader ?? new LoaderCache(ImageSource);
      this.parser = parser ?? new TiledParser();
      this.firstGid = firstGid;
      this.pathMap = pathMap;
   }

   async load(): Promise<Tileset> {
      const tilesetType = this.path.includes('.tsx') ? 'xml' : 'json';
      const tilesetData = await this.fileLoader(this.path, tilesetType);
      let tileset: TiledTilesetFile;

      if (tilesetType === 'json') {
         // Verify TMJ is correct
         tileset = TiledTilesetFile.parse(tilesetData);
      } else { 
         // Parse & Verify TMX tileset
         tileset = this.parser.parseExternalTileset(tilesetData);
      }

      if (isTiledTilesetSingleImage(tileset)) {
         const image = this.imageLoader.getOrAdd(tileset.image);
         if (image) {
            this.data = new Tileset({
               name: tileset.name,
               tiledTileset: tileset,
               firstGid: this.firstGid,
               image
            });
         }
      }

      if (isTiledTilesetCollectionOfImages(tileset)) {
         const tileToImage = new Map<TiledTile, ImageSource>();
         const images: ImageSource[] = [];
         for (let tile of tileset.tiles) {
            if (tile.image) {
               const imagePath = pathRelativeToBase(this.path, tile.image, this.pathMap);
               const image = this.imageLoader.getOrAdd(imagePath);
               tileToImage.set(tile, image);
               images.push(image);
            }
         }

         tileset.firstgid = this.firstGid;
         this.data = new Tileset({
            name: tileset.name,
            tiledTileset: tileset,
            firstGid: this.firstGid,
            tileToImage: tileToImage
         });
      }

      await this.imageLoader.load();

      if (this.data) {
         return this.data
      }

      throw new Error(`No tileset loaded for path ${this.path}`);
   }

   isLoaded(): boolean {
      return !!this.data;
   }
}
