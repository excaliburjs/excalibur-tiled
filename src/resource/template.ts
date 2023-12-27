import { ImageSource, SpriteSheet } from "excalibur";
import { TiledTemplate, TiledTilesetFile, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { PluginObject, parseObject } from "./objects";
import { pathRelativeToBase } from "./path-util";
import { TiledResource } from "./tiled-resource";
import { Tileset, loadExternalFriendlyTileset } from "./tileset";

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

   constructor(public options: TemplateOptions) {
      const { templatePath, object, tiledTemplate, tileset } = options;
      this.templatePath = templatePath;
      this.object = object;
      this.tiledTemplate = tiledTemplate;
      this.tileset = tileset;
   }
}