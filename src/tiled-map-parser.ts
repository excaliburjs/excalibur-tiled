// tmx xml parsing
import * as parser from 'fast-xml-parser'
// gzip & zlib
import { inflate as pakoInflate } from 'pako';
// zstd
import { ZSTDDecoder } from 'zstddec';

import { RawTiledMap } from "./raw-tiled-map";
import { TiledLayer } from "./tiled-layer";
import { TiledObject, TiledObjectGroup } from "./tiled-object";
import { TiledTileset } from './tiled-tileset';

/**
 * Responsible for representing the Tiled TileMap in total and parsing from the source Tiled files (tmx)
 */
export class TiledMap {
   /**
    * Raw tilemap data
    */
   rawMap!: RawTiledMap;
   orientation!: "isometric" | "orthogonal" | "staggered" | "hexagonal";
   /**
    * Width of the Tiled Map in tiles
    */
   width!: number;
   /**
    * Height of the Tiled Map in tiles
    */
   height!: number;
   /**
    * Width of an individual tile in pixels
    */
   tileWidth!: number;
   /**
    * Height of an individual tile in pixels
    */
   tileHeight!: number;
   /**
    * Tile layers in paint order, first layer in the list is drawn first and so forth
    */
   layers: TiledLayer[] = [];
   /**
    * Tile set definition for this Tiled map
    */
   tileSets: TiledTileset[] = [];
   /**
    * Tiled Objects in this tiled map, used for storing 
    */
   objectGroups: TiledObjectGroup[] = [];

   public getExcaliburObjects(): TiledObjectGroup[] {
      return this.getObjectLayerByProperty('excalibur', true);
   }

   public getObjectLayerByName(name: string): TiledObjectGroup {
      return this.objectGroups.filter(l => l.name === name)[0];
   }

   public getObjectLayerByProperty(name: string, value: any): TiledObjectGroup[] {
      return this.objectGroups.filter(l => l.getProperty(name)?.value === value);
   }

   public getTileLayerByName(name: string): TiledLayer {
      return this.layers.filter(l => l.name === name)[0];
   }

   public getTileLayersByProperty(name: string, value: any): TiledLayer[] {
      return this.layers.filter(l => l.getProperty(name)?.value === value);
   }

   public static async fromTmx(tmxData: string): Promise<TiledMap> {
      const _convertToArray = (obj: any, prop: string, plurlalize = false) => {
         if (!obj[prop]) {
            obj[prop + (plurlalize ? 's' : '')] = [];
            return;
         }
   
         obj[prop + (plurlalize ? 's' : '')] = Array.isArray(obj[prop]) ? obj[prop] : [obj[prop]];
         if (plurlalize) {
            delete obj[prop];
         }
      }

      const options: parser.X2jOptionsOptional = {
         attributeNamePrefix : "",
         textNodeName : "#text",
         ignoreAttributes : false,
         ignoreNameSpace : false,
         allowBooleanAttributes : true,
         parseNodeValue : true,
         parseAttributeValue : true,
         trimValues: true,
         parseTrueNumberOnly: false,
         arrayMode: false,
         stopNodes: ["parse-me-as-string"]
     };

     const rawMap = parser.parse(tmxData, options).map;

     _convertToArray(rawMap, 'layer', true);
     for (let layer of rawMap.layers) {
        layer.type = layer.type ?? 'tilelayer';
        layer.encoding = layer.data.encoding;
        layer.compression = layer.data.compression;
        if (layer.encoding === 'csv') {
           layer.data = layer.data['#text'].split(',').map((id: any) => +id);
        } else {
           layer.data = layer.data['#text'];
        }
        layer.properties = layer.properties?.property ?? [];
        _convertToArray(layer, 'properties');
     }

     rawMap.objectgroup = rawMap.objectgroup ?? [];
     let objectlayers = Array.isArray(rawMap.objectgroup) ? rawMap.objectgroup : [rawMap.objectgroup];
     for (let objectlayer of objectlayers) {
         objectlayer.type = objectlayer.type ?? 'objectgroup';
         objectlayer.objects = Array.isArray(objectlayer.object) ? objectlayer.object : [objectlayer.object];
         objectlayer.objects.forEach((o: any) => o.properties = o.properties?.property ?? []);
         objectlayer.objects.forEach((o: any) => _convertToArray(o, 'properties'));
         objectlayer.properties = objectlayer.properties?.property ?? [];
         
         _convertToArray(objectlayer, 'properties');
         delete objectlayer.object;

         for (let object of objectlayer.objects) {
            if (object.text) {
               object.text.text = object.text['#text'];
               object.text.halign = object.text.halign ?? 'left';
               object.text.valign = object.text.valign ?? 'top';
               object.text.fontfamily = object.text.fontfamily ?? 'sans-serif'
               object.text.pixelsize = +(object.text.pixelsize ?? 16);
               object.text.kerning = !!object.text.kerning;
               object.text.italic = !!object.text.italic;
               object.text.bold = !!object.text.bold;
               object.text.underline = !!object.text.underline;
               object.text.strikeout = !!object.text.strikeout;
               object.text.color = object.text.color ?? '#000000';
            }
            if (object.point === '') {
               object.point = true;
            }
            if (object.ellipse === '') {
               object.ellipse = true;
            }
            if (object.polyline) {
               object.polyline = object.polyline.points.split(' ').map((p: string) => {
                  const point = p.split(',')
                  return {x: +point[0], y: +point[1]}
               });
            }
            if (object.polygon) {
               object.polygon = object.polygon.points.split(' ').map((p: string) => {
                  const point = p.split(',')
                  return {x: +point[0], y: +point[1]}
               });
            }
         }
         rawMap.layers.push(objectlayer);
     }
     delete rawMap.objectgroup;

     _convertToArray(rawMap, 'imagelayer', true);
     for (let imagelayer of rawMap.imagelayers) {
       imagelayer.type = imagelayer.type ?? 'imagelayer';
       imagelayer.image = imagelayer.image.source;
       imagelayer.properties = imagelayer.properties?.property ?? [];
       _convertToArray(imagelayer, 'properties');
       rawMap.layers.push(imagelayer);
     }
     delete rawMap.imagelayer

     _convertToArray(rawMap, 'tileset', true);
     for(let tileset of rawMap.tilesets) {
        // Map non-embedded tilesets
        if (!tileset.source) {
           tileset.imagewidth = tileset.image.width;
           tileset.imageheight = tileset.image.height;
           tileset.objectalignment = tileset.objectalignment ?? 'unspecified';
           tileset.image = tileset.image.source;
           _convertToArray(tileset, 'tile', true);
           tileset.tiles.forEach((t: any) => { 
              if (t.objectgroup){
                 t.objectgroup.type = 'objectgroup';
                 _convertToArray(t.objectgroup, 'object', true);
               }
           });
         }
     }

     return await TiledMap._fromRawTiledMap(rawMap);
   }

   public static async fromJson(rawJson: RawTiledMap): Promise<TiledMap> {
      return await TiledMap._fromRawTiledMap(rawJson);
   }

   private static async _fromRawTiledMap(rawMap: RawTiledMap): Promise<TiledMap> {
      await TiledMap._decompresslayers(rawMap);
      const resultMap = new TiledMap();
      resultMap.orientation = rawMap.orientation;
      resultMap.rawMap = rawMap;
      resultMap.width = +rawMap.width;
      resultMap.height = +rawMap.height;
      resultMap.tileWidth = +rawMap.tilewidth;
      resultMap.tileHeight = +rawMap.tileheight;

      tagLayerWithOriginalOrder(rawMap);

      for (let layer of rawMap.layers) {
         if (layer.type == 'tilelayer') {
            resultMap.layers.push(TiledLayer.parse(layer));
         }

         if (layer.type == 'objectgroup') {
            resultMap.objectGroups.push(TiledObjectGroup.parse(layer));
         };
      }

      for(let tileset of rawMap.tilesets) {
         // Map non-embedded tilesets
         if (!tileset.source) {
            resultMap.tileSets.push(TiledTileset.parse(tileset));
         }
      }

      return resultMap;
   }

   private static async _decompresslayers(rawJson: RawTiledMap): Promise<RawTiledMap> {
      // Decompress layers
      if (rawJson.layers) {
         for (var layer of rawJson.layers) {

            if (typeof layer.data === "string") {

               if (layer.encoding === "base64") {
                  layer.data = await decompressors.decompressBase64(
                     layer.data as string,
                     layer.encoding,
                     layer.compression ?? ''
                  );
               }

            } else {
               layer.data = decompressors.decompressCsv(layer.data as number[]);
            }

         }
      }

      return rawJson;
   }
}

const tagLayerWithOriginalOrder = (rawMap: RawTiledMap) => {
   let order = 0; 
   for (let layer of rawMap.layers) {
      layer.order = order++;
   }
}

/**
 * Decompression implementations
 */
const decompressors = {

   /**
    * Simplest (passes data through since it's uncompressed)
    */
   decompressCsv: (data: number[]) => {
      return data;
   },

   /**
    * Uses base64.js implementation to decode string into byte array
    * and then converts (with/without compression) to array of numbers
    */
   decompressBase64: (b64: string, encoding: string, compression: string): Promise<number[]> => {
      var i: number,
         j: number,
         l: number,
         tmp: number,
         placeHolders: number,
         arr: Uint8Array;

      if (b64.length % 4 > 0) {
         throw new Error('Invalid string. Length must be a multiple of 4')
      }

      var PLUS = '+'.charCodeAt(0);
      var SLASH = '/'.charCodeAt(0);
      var NUMBER = '0'.charCodeAt(0);
      var LOWER = 'a'.charCodeAt(0);
      var UPPER = 'A'.charCodeAt(0);
      var PLUS_URL_SAFE = '-'.charCodeAt(0);
      var SLASH_URL_SAFE = '_'.charCodeAt(0);

      function decode(elt: string): number {
         var code = elt.charCodeAt(0)
         if (code === PLUS || code === PLUS_URL_SAFE) return 62 // '+'
         if (code === SLASH || code === SLASH_URL_SAFE) return 63 // '/'
         if (code < NUMBER) return -1 // no match
         if (code < NUMBER + 10) return code - NUMBER + 26 + 26
         if (code < UPPER + 26) return code - UPPER
         if (code < LOWER + 26) return code - LOWER + 26
         throw Error('Could not decode elt');
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      var len = b64.length
      placeHolders = b64.charAt(len - 2) === '=' ? 2 : b64.charAt(len - 1) === '=' ? 1 : 0

      // base64 is 4/3 + up to two characters of the original data
      arr = new Uint8Array(b64.length * 3 / 4 - placeHolders)

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? b64.length - 4 : b64.length

      var L = 0

      function push(v: number) {
         arr[L++] = v
      }

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
         tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
         push((tmp & 0xFF0000) >> 16)
         push((tmp & 0xFF00) >> 8)
         push(tmp & 0xFF)
      }

      if (placeHolders === 2) {
         tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
         push(tmp & 0xFF)
      } else if (placeHolders === 1) {
         tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
         push((tmp >> 8) & 0xFF)
         push(tmp & 0xFF)
      }

      return new Promise(resolve => {
         const toNumber = function (byteArray: number[] | Uint8Array) {
            var value = 0;

            for (var i = byteArray.length - 1; i >= 0; i--) {
               value = (value * 256) + byteArray[i] * 1;
            }

            return value;
         };

         // Byte array
         // handle compression
         if ("zlib" === compression || "gzip" === compression) {
            arr = pakoInflate( arr );

            var resultLen = arr.length / 4;
            var result = new Array<number>(resultLen);

            for (i = 0; i < resultLen; i++) {
               result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
            }
            resolve(result);
         }

         if ("zstd" === compression) {
            const decoder = new ZSTDDecoder();
            decoder.init().then(() => {
               arr = decoder.decode(arr);
               var resultLen = arr.length / 4;
               var result = new Array<number>(resultLen);

               for (i = 0; i < resultLen; i++) {
                  result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
               }
               resolve(result);
            });
         }

         if (!compression) {
            var resultLen = arr.length / 4;
            var result = new Array<number>(resultLen);
            for (i = 0; i < resultLen; i++) {
               result[i] = toNumber(arr.slice(i * 4, i * 4 + 4));
            }
            resolve(result);
         }
      });
   }
}