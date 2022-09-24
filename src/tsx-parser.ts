import { XMLParser } from "fast-xml-parser";
import { RawTiledTileset } from "./raw-tiled-tileset";


export class TsxParser {
   parse(tsxString: string): RawTiledTileset {
      const parser = new XMLParser({
         attributeNamePrefix : "",
         textNodeName : "#text",
         ignoreAttributes : false,
         // ignoreNameSpace : false,
         // preserveOrder: true,
         allowBooleanAttributes : true,
         // parseNodeValue : true,
         parseAttributeValue : true,
         trimValues: true,
         numberParseOptions: {
            leadingZeros: true,
            hex: false
         },
         // parseTrueNumberOnly: false,
         // arrayMode: false,
         isArray: (name, jpath, isLeafNode, isAttribute) => {
            return [
               'map.tileset',
               'map.tileset.tile',
               'map.tileset.tile.objectgroup.properties',
               'map.tileset.tile.objectgroup',
               'map.tileset.tile.animation',
               'map.layer',
               'map.layer.properties',
               'map.objectgroup',
               'map.objectgroup.properties'
            ].indexOf(jpath) !== -1;
         },
         stopNodes: ["parse-me-as-string"],
      });
      return this.parseTilesetObject(parser.parse(tsxString));
   }

   parseTilesetObject(xmlObject: any): RawTiledTileset {
      const result: RawTiledTileset = {} as any;
      // embedded or loaded external tileset
      if (xmlObject.image) {
         result.name = xmlObject.name;
         result.image = xmlObject.image.source;
         result.imagewidth = xmlObject.imagewidth;
         result.imageheight = xmlObject.imageheight;
         result.tilewidth = xmlObject.tilewidth;
         result.tileheight = xmlObject.tileheight;
         result.tilecount = xmlObject.tilecount;
         result.columns = xmlObject.columns;
         
         // TODO load tiles
         result.tiles = xmlObject.tile;
      }

      // unloaded external tileset
      if (xmlObject.source) {
         result.source = xmlObject.source;
      }

      // common
      result.firstgid = xmlObject.firstgid;

      return result;
   }
}