import { ImageSource, SpriteSheet } from "excalibur";
import { TiledTemplate, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { PluginObject, parseObject } from "./objects";
import { pathRelativeToBase } from "./path-util";
import { TiledResource } from "./tiled-resource";
import { Tileset, loadExternalFriendlyTileset } from "./tileset";

/**
 * Templates are basically a mini tiled resource, they have a self contained object and optionally a tileset
 * 
 * They can be used to instance objects in ObjectLayers, or as part of Tile Collider definitions
 */
export class Template { // TODO is this actually just a resource/loadable?
   tiledTemplate!: TiledTemplate;
   object!: PluginObject;
   tileset?: Tileset;

   constructor(public templatePath: string, private _resource: TiledResource) {}

   async load() {
      // TODO there is an efficiency to gain here by hitting a cache of already loaded resources for images and tilesets
      // maybe a loade dresource dictionary where we index by path key?
      // ResourceCache? makes external tileset resource better too

      const templateType = this.templatePath.includes('.tx') ? 'xml' : 'json';
      const templateFilePath = pathRelativeToBase(this._resource.path, this.templatePath, this._resource.pathMap);
      try {
         const content = await this._resource.fileLoader(templateFilePath, templateType);
         let template: TiledTemplate;
         if (templateType === 'xml') {
            template = this._resource.parser.parseExternalTemplate(content);
         } else {
            template = TiledTemplate.parse(content);
         }
         this.tiledTemplate = template;
         this.object = parseObject(template.object, []);

         if (template.tileset) {
            //Template tilesets are not included in the TiledResource list because their gids can collide with map tilesets
            const tilesetPath = pathRelativeToBase(templateFilePath, template.tileset.source, this._resource.pathMap);
            this.tileset = await loadExternalFriendlyTileset(tilesetPath, template.tileset.firstgid, this._resource);
         }
      } catch (e) {
         throw new Error(`Could not load template at ${templateFilePath}, check to see if your pathMap is correct or if you're Tiled map is corrupted`);
      }
   }
}