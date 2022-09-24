import { XMLParser } from "fast-xml-parser";
import { RawTiledLayer } from "./raw-tiled-layer";

import { RawTiledMap } from "./raw-tiled-map";
import { RawTiledObject } from "./raw-tiled-object";
import { RawTiledTileset } from "./raw-tiled-tileset";
import { TiledPoint, TiledProperty } from "./tiled-types";

export class TmxParser {
   parse(tmxString: string): RawTiledMap {
      const parser = new XMLParser({
         attributeNamePrefix: "",
         textNodeName: "#text",
         ignoreAttributes: false,
         allowBooleanAttributes: true,
         parseAttributeValue: true,
         trimValues: true,
         numberParseOptions: {
            leadingZeros: true,
            hex: false
         },
         isArray: (name, jpath, isLeafNode, isAttribute) => {
            return [
               'map.properties.property',
               'map.tileset',
               'map.tileset.properties.property',
               'map.tileset.tile',
               'map.tileset.tile.properties.property',
               'map.tileset.tile.objectgroup.properties.property',
               'map.tileset.tile.objectgroup',
               'map.tileset.tile.animation',
               'map.layer',
               'map.imagelayer',
               'map.layer.properties.property',
               'map.objectgroup',
               'map.objectgroup.properties.property',
               'map.objectgroup.object',
               'map.objectgroup.object.properties.property'
            ].indexOf(jpath) !== -1 ||
               name === 'group' ||
               name === 'layer' ||
               name === 'objectgroup' ||
               name === 'imagelayer';

         },
         stopNodes: ["parse-me-as-string"],
      })
      const resultRawMap: RawTiledMap = {} as any;

      const parsedXml = parser.parse(tmxString);
      resultRawMap.version = parsedXml.map.version;
      resultRawMap.tiledversion = parsedXml.map.tiledversion;
      resultRawMap.type = parsedXml.map.type;
      resultRawMap.compressionlevel = parsedXml.map.compressionlevel ?? -1;
      resultRawMap.infinite = parsedXml.map.infinite ?? false;
      resultRawMap.width = parsedXml.map.width;
      resultRawMap.height = parsedXml.map.height;
      resultRawMap.tilewidth = parsedXml.map.tilewidth;
      resultRawMap.tileheight = parsedXml.map.tileheight;
      resultRawMap.orientation = parsedXml.map.orientation;
      resultRawMap.renderorder = parsedXml.map.renderorder;
      resultRawMap.nextlayerid = parsedXml.map.nextlayerid;
      resultRawMap.nextobjectid = parsedXml.map.nextobjectid;
      resultRawMap.properties = this.parseTmxProperties(parsedXml.map.properties);

      // find tilesets (might be external)
      const tilesets: RawTiledTileset[] = []
      if (parsedXml.map.tileset) {
         for (let tileset of parsedXml.map.tileset) {
            tilesets.push(this.parseTilesetObject(tileset));
         }
      }
      resultRawMap.tilesets = tilesets;

      // flatten tiled folder groups
      if (parsedXml.map.group) {
         this.flattenGroups(parsedXml.map.group, parsedXml.map);
      }

      // find layers
      const layers: RawTiledLayer[] = [];
      if (parsedXml.map.layer) {
         for (let layer of parsedXml.map.layer) {
            layers.push(this.parseTmxTileLayer(layer));
         }
      }

      // find objectgroups
      if (parsedXml.map.objectgroup) {
         for (let objectgroup of parsedXml.map.objectgroup) {
            layers.push(this.parseTmxObjectLayer(objectgroup));
         }
      }

      // find image layers
      if (parsedXml.map.imagelayer) {
         for (let imagelayer of parsedXml.map.imagelayer) {
            layers.push(this.parseTmxImageLayer(imagelayer));
         }
      }

      resultRawMap.layers = layers;

      // Sort layers the same as they appear in the original
      const orderParser = new DOMParser();
      const doc = orderParser.parseFromString(tmxString, "application/xml");
      const el = doc.querySelectorAll('layer,objectgroup,imagelayer');
      const originalIdOrder: number[] = []
      el.forEach(e => {
         originalIdOrder.push(+e.id);
      });
      resultRawMap.layers.sort((a, b) => {
         return originalIdOrder.indexOf(a.id) - originalIdOrder.indexOf(b.id);
      });
      let order = 0;
      resultRawMap.layers.forEach(layer => {
         layer.order = order++;
      });

      return resultRawMap;
   }

   flattenGroups(group: any, map: any): void {
      for (let item of group) {
         if (item.group) {
            this.flattenGroups(item.group, map);
         }
         if (item.objectgroup) {
            for (let objectgroup of item.objectgroup) {
               map.objectgroup.push(objectgroup);
            }
         }
         if (item.layer) {
            for (let layer of item.layer) {
               map.layer.push(layer);
            }
         }
      }
   }

   parseTmxImageLayer(layer: any): RawTiledLayer {
      const resultLayer = this.parseTmxTileLayer(layer);
      resultLayer.type = 'imagelayer';
      resultLayer.image = layer.image.source;
      resultLayer.repeatx = layer.repeatx ?? false;
      resultLayer.repeaty = layer.repeaty ?? false;

      return resultLayer;
   }


   /**
    * Parses tmx tile layers
    * @param layer 
    */
   parseTmxTileLayer(layer: any): RawTiledLayer {
      const resultLayer: RawTiledLayer = {} as any;
      resultLayer.id = layer.id;
      resultLayer.type = 'tilelayer';
      resultLayer.name = layer.name;
      resultLayer.width = layer.width;
      resultLayer.height = layer.height;
      resultLayer.tintcolor = layer.tintcolor;
      resultLayer.opacity = layer.opacity ?? 1;
      resultLayer.visible = layer.visible ?? true;
      resultLayer.x = 0;
      resultLayer.y = 0;
      resultLayer.offsetx = layer.offsetx ?? 0;
      resultLayer.offsety = layer.offsety ?? 0;
      resultLayer.parallaxx = layer.parallaxx ?? 1;
      resultLayer.parallaxy = layer.parallaxy ?? 1;
      // Only present in tile layers
      if (layer.data) {
         resultLayer.data = layer.data['#text'];
         resultLayer.encoding = layer.data.encoding;
         resultLayer.compression = layer.data.compression;
      }
      // TODO there is more in layer
      resultLayer.properties = this.parseTmxProperties(layer.properties);
      return resultLayer;
   }

   parseTmxObjectLayer(layer: any): RawTiledLayer {
      const resultLayer = this.parseTmxTileLayer(layer);
      resultLayer.type = "objectgroup";
      resultLayer.color = layer.color;
      resultLayer.draworder = layer.draworder ?? 'topdown';
      resultLayer.objects = this.parseTmxObjects(layer);
      return resultLayer;
   }

   parseTmxObjects(objectgroup: any): RawTiledObject[] {
      const objects: RawTiledObject[] = [];
      if (objectgroup.object) {
         for (let object of objectgroup.object) {
            const resultObject: RawTiledObject = {} as any;
            resultObject.id = object.id;
            resultObject.gid = object.gid;
            resultObject.name = object.name;
            resultObject.class = object.class;
            resultObject.x = object.x ?? 0;
            resultObject.y = object.y ?? 0;
            resultObject.width = object.width ?? 0;
            resultObject.height = object.height ?? 0;
            resultObject.rotation = object.rotation ?? 0
            resultObject.ellipse = object.ellipse === '';
            resultObject.polygon = this.parseTmxPoints(object.polygon);
            resultObject.polyline = this.parseTmxPoints(object.polyline);
            resultObject.properties = this.parseTmxProperties(object.properties);
            objects.push(resultObject);
         }
      }
      return objects;
   }

   parseTilesetObject(xmlObject: any): RawTiledTileset {
      const result: RawTiledTileset = {} as any;
      // embedded or loaded external tileset
      if (xmlObject.image) {
         result.type = 'tileset';
         result.tiledversion = xmlObject.tiledversion;
         result.version = xmlObject.version;
         result.name = xmlObject.name;
         result.image = xmlObject.image.source;
         result.imagewidth = xmlObject.image?.width;
         result.imageheight = xmlObject.image?.height;
         result.spacing = xmlObject.spacing ?? 0;
         result.tilewidth = xmlObject.tilewidth;
         result.tileheight = xmlObject.tileheight;
         result.tilecount = xmlObject.tilecount;
         result.columns = xmlObject.columns;
         result.backgroundcolor = xmlObject.backgroundcolor;
         result.transparentcolor = xmlObject.transparentcolor;

         // TODO terrains and wangsets

         result.properties = this.parseTmxProperties(xmlObject.properties);

         for (let tile of xmlObject.tile) {
            tile.objectgroup = this.parseTmxObjectLayer(tile.objectgroup[0]);
         }
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

   parseTmxProperties(propsObj: any): TiledProperty[] {
      if (!propsObj?.property) {
         return [];
      }
      const props: TiledProperty[] = [];
      for (let prop of propsObj.property) {
         props.push(prop);
      }
      return props;
   }

   parseTmxPoints(pointObj: any): TiledPoint[] {
      if (!pointObj) {
         return [];
      }
      const pointsString: string = pointObj.points;
      const points = pointsString.split(' ').map(pointString => {
         const xy = pointString.split(',');
         return {
            x: +xy[0],
            y: +xy[1]
         }
      })
      return points;
   }
}