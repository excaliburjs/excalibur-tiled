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
export class Template {
   tiledTemplate!: TiledTemplate;
   object!: PluginObject;
   tileset?: Tileset;

   constructor(public templatePath: string, private _resource: TiledResource) {}

   async load() {
      const templateType = this.templatePath.includes('.tx') ? 'xml' : 'json';
      const templateFilePath = pathRelativeToBase(this._resource.path, this.templatePath);
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
         const tilesetPath = pathRelativeToBase(templateFilePath, template.tileset.source);
         this.tileset = await loadExternalFriendlyTileset(tilesetPath, template.tileset.firstgid, this._resource);
      }
   }
}