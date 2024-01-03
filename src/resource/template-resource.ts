import { ImageSource, Loadable } from "excalibur";
import { TiledParser, TiledTemplate } from "../parser/tiled-parser";
import { FetchLoader, FileLoader } from "./file-loader";
import { LoaderCache } from "./loader-cache";
import { parseObject } from "./objects";
import { PathMap, pathRelativeToBase } from "./path-util";
import { Tileset } from "./tileset";
import { Template } from "./template";
import { TilesetResource, TilesetResourceOptions } from "./tileset-resource";

export interface TemplateResourceOptions {
   headless?: boolean;
   strict?: boolean;
   parser?: TiledParser,
   fileLoader?: FileLoader,
   imageLoader?: LoaderCache<ImageSource>,
   pathMap?: PathMap
}

/**
 * Templates are basically a mini tiled resource, they have a self contained object and optionally a tileset
 * 
 * They can be used to instance objects in ObjectLayers, or as part of Tile Collider definitions
 */
export class TemplateResource implements Loadable<Template> {
   /**
    * [[Template]] is only accessible after .load()
    * 
    * Check .isLoaded() to know if it has been loaded
    */
   data!: Template;
   public readonly headless: boolean = false;
   public readonly strict: boolean = true;

   private parser: TiledParser;
   private fileLoader: FileLoader = FetchLoader;
   private imageLoader: LoaderCache<ImageSource>;
   private pathMap?: PathMap;

   constructor(public readonly templatePath: string, options?: TemplateResourceOptions) {
      const { fileLoader, parser, pathMap, imageLoader, strict, headless } = {...options};
      this.headless = headless ?? this.headless;
      this.strict = strict ?? this.strict;
      this.fileLoader = fileLoader ?? this.fileLoader;
      this.imageLoader = imageLoader ?? new LoaderCache(ImageSource);
      this.parser = parser ?? new TiledParser();
      this.pathMap = pathMap;
   }

   isLoaded(): boolean {
      return !!this.data;
   }

   async load() {
      const templateType = this.templatePath.includes('.tx') ? 'xml' : 'json';
      try {
         const content = await this.fileLoader(this.templatePath, templateType);
         let template: TiledTemplate;
         if (templateType === 'xml') {
            template = this.parser.parseExternalTemplate(content, this.strict);
         } else {
            if (this.strict) {
               template = TiledTemplate.parse(content);
            } else {
               template = content as TiledTemplate;
            }
         }
         const tiledTemplate = template;
         const object = parseObject(template.object);
         let tileset: Tileset | undefined = undefined;
         if (template.tileset) {
            // Template tilesets are not included in the TiledResource list because their gids can collide with map tilesets
            const tilesetPath = pathRelativeToBase(this.templatePath, template.tileset.source, this.pathMap);
            const tilesetResource = new TilesetResource(tilesetPath, template.tileset.firstgid, {
               headless: this.headless,
               strict: this.strict,
               fileLoader: this.fileLoader,
               imageLoader: this.imageLoader,
               parser: this.parser,
               pathMap: this.pathMap
            } satisfies TilesetResourceOptions);

            tileset = await tilesetResource.load();
         }

         return this.data = new Template({
            templatePath: this.templatePath,
            tiledTemplate,
            object,
            tileset
         });

      } catch (e) {
         throw new Error(`Could not load template at ${this.templatePath}, check to see if your pathMap is correct or if you're Tiled map is corrupted`);
      }
   }
}