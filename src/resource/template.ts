import { TiledTemplate } from "../parser/tiled-parser";
import { PluginObject } from "./objects";
import { Tileset } from "./tileset";

export interface TemplateOptions {
   templatePath: string;
   object: PluginObject,
   tiledTemplate: TiledTemplate,
   tileset?: Tileset
}

/**
 * Templates are basically a mini tiled resource, they have a self contained object and optionally a tileset
 *
 * They can be used to instance objects in ObjectLayers, or as part of Tile Collider definitions
 */
export class Template {
   templatePath: string;
   tiledTemplate: TiledTemplate;
   object: PluginObject;
   tileset?: Tileset;

   constructor(options: TemplateOptions) {
      const { templatePath, object, tiledTemplate, tileset } = options;
      this.templatePath = templatePath;
      this.object = object;
      this.tiledTemplate = tiledTemplate;
      this.tileset = tileset;
   }
}