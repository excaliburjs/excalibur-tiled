import { ImageSource, Loadable } from "excalibur";
import { Tileset } from "./tileset";
import { TiledParser, TiledTile, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { FetchLoader, FileLoader } from "./file-loader";
import { PathMap, pathRelativeToBase } from "./path-util";
import { LoaderCache } from "./loader-cache";

export interface TilesetResourceOptions {
   orientation?: 'isometric' | 'orthogonal';
   headless?: boolean;
   strict?: boolean;
   parser?: TiledParser;
   fileLoader?: FileLoader;
   imageLoader?: LoaderCache<ImageSource>;
   pathMap?: PathMap;
}

export class TilesetResource implements Loadable<Tileset> {
   data!: Tileset;
   public readonly firstGid: number;
   public readonly strict: boolean = true;
   public readonly headless: boolean = false;
   public readonly orientation: 'isometric' | 'orthogonal' = 'orthogonal';

   private fileLoader: FileLoader = FetchLoader;
   private imageLoader: LoaderCache<ImageSource>;
   private pathMap?: PathMap;
   private parser: TiledParser;

   constructor(public path: string, firstGid: number, options?: TilesetResourceOptions) {
      const { fileLoader, parser, pathMap, imageLoader, strict, headless, orientation } = { ...options };
      this.headless = headless ?? this.headless;
      this.orientation = orientation ?? this.orientation;
      this.strict = strict ?? this.strict;
      this.fileLoader = fileLoader ?? this.fileLoader;
      this.imageLoader = imageLoader ?? new LoaderCache(ImageSource);
      this.parser = parser ?? new TiledParser();
      this.firstGid = firstGid;
      this.pathMap = pathMap;
   }

   async load(): Promise<Tileset> {
      const tilesetType = this.path.includes('.tsx') ? 'xml' : 'json';
      try {
         const tilesetData = await this.fileLoader(this.path, tilesetType);
         let tileset: TiledTilesetFile;

         if (tilesetType === 'json') {
            // Verify TMJ is correct
            if (this.strict) {
               tileset = TiledTilesetFile.parse(tilesetData);
            } else {
               tileset = tilesetData as TiledTilesetFile;
            }
         } else {
            // Parse & Verify TMX tileset
            tileset = this.parser.parseExternalTileset(tilesetData, this.strict);
         }

         if (isTiledTilesetSingleImage(tileset)) {
            const imagePath = pathRelativeToBase(this.path, tileset.image, this.pathMap);
            const image = this.headless ? undefined : this.imageLoader.getOrAdd(imagePath);
            this.data = new Tileset({
               name: tileset.name,
               tiledTileset: tileset,
               firstGid: this.firstGid,
               ...({ image }),
            });
         }

         if (isTiledTilesetCollectionOfImages(tileset)) {
            const tileToImage = this.headless ? undefined : new Map<TiledTile, ImageSource>();
            if (tileToImage) {
               const images: ImageSource[] = [];
               if (tileset.tiles) {
                  for (let tile of tileset.tiles) {
                     if (tile.image) {
                        const imagePath = pathRelativeToBase(this.path, tile.image, this.pathMap);
                        const image = this.imageLoader.getOrAdd(imagePath);
                        tileToImage.set(tile, image);
                        images.push(image);
                     }
                  }
               }
            }

            tileset.firstgid = this.firstGid;
            this.data = new Tileset({
               name: tileset.name,
               tiledTileset: tileset,
               firstGid: this.firstGid,
               ...({ tileToImage }),
            });
         }

         if (!this.headless) {
            await this.imageLoader.load();
         }

         if (this.data) {
            return this.data
         }

      } catch (e) {
         console.error(`Could not load tileset at path ${this.path}`);
         throw e;
      }
      throw new Error(`No tileset at path ${this.path}`);
   }

   isLoaded(): boolean {
      return !!this.data;
   }
}
