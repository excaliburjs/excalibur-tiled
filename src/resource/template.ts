import { TiledTemplate, TiledTilesetFile } from "../parser/tiled-parser";
import { PluginObject, parseObject } from "./objects";
import { pathRelativeToBase } from "./path-util";
import { TiledResource } from "./tiled-resource";
import { Tileset } from "./tileset";

export class Template {
   
   tiledTemplate!: TiledTemplate;
   object?: PluginObject;
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
      this.object = parseObject(template.object);

      if (template.tileset) {
         // TODO Template tilesets are not included in the TiledResource list, is this right?
         const tilesetType = template.tileset.source.includes('.tsx') ? 'xml' : 'json';
         const tilesetPath = pathRelativeToBase(templateFilePath, template.tileset.source);

         const tilesetData = await this._resource.fileLoader(tilesetPath, tilesetType);
         let tileset: TiledTilesetFile;
         // TMJ tileset
         if (tilesetType === 'json') {
            tileset = TiledTilesetFile.parse(tilesetData);
         } else { // TMX tileset
            tileset = this._resource.parser.parseExternalTileset(tilesetData);
         }
         tileset.firstgid = template.tileset.firstgid;
         this.tileset = new Tileset({
            name: tileset.name,
            tiledTileset: tileset
         });
         this.tileset.firstGid = template.tileset.firstgid;
      }
   }
}