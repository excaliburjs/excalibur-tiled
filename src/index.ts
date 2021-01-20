import {
   Resource,
   Promise,
   Texture,
   TileMap,
   TileSprite,
   SpriteSheet,
   Logger,
   CollisionType,
   vec,
   Actor,
   Color,
   Vector
} from 'excalibur';
import { Excalibur, ExcaliburCamera, TiledLayer, TiledMap, TiledObject, TiledProperty, TiledTileset } from './Tiled';
import * as pako from 'pako';
import * as parser from 'fast-xml-parser'

export enum TiledMapFormat {

   /**
    * TMX map layer format
    */
   TMX = 'TMX',

   /**
    * JSON map layer format
    */
   JSON = 'JSON'
}

export class TiledResource extends Resource<TiledMap> {

   protected mapFormat: TiledMapFormat;

   public imagePathAccessor: (path: string, ts: TiledTileset) => string;
   public externalTilesetPathAccessor: (path: string, ts: TiledTileset) => string;

   constructor(path: string, mapFormat = TiledMapFormat.TMX) {
      switch (mapFormat) {
         case TiledMapFormat.TMX:
            super(path, 'text');
            break;
         case TiledMapFormat.JSON:
            super(path, "json");
            break;
         default:
            throw `The format ${mapFormat} is not currently supported. Please export Tiled map as JSON.`;
      }

      this.mapFormat = mapFormat;
      this.imagePathAccessor = this.externalTilesetPathAccessor = (p, tileset) => {

         // Use absolute path if specified
         if (p.indexOf('/') === 0) {
            return p;
         }

         // Load relative to map path
         let pp = path.split('/');
         let relPath = pp.concat([]);

         if (pp.length > 0) {
            // remove file part of path
            relPath.splice(-1);
         }
         relPath.push(p);
         return relPath.join('/');
      };
   }

   public getExcaliburInfo(): Excalibur {
      return this.data.ex;
   }

   public getExcaliburObjectsLayer(): TiledLayer {
      return this.getLayerByName('Excalibur');
   }

   public getLayerByName(name: string): TiledLayer {
      return this.data.layers.filter(l => l.name === name)[0];
   }

   public getLayersByProperty(name: string, value: any): TiledLayer[] {
      return this.data.layers.filter(l => this.getProperty(l, name)?.value === value);
   }

   public getLayers(): TiledLayer[] {
      return this.data.layers;
   }

   public getObjectByType(layer: TiledLayer, type: 'camera' | 'boxcollider' | 'circlecollider'): TiledObject {
      return this.getObjectsByType(layer, type)[0];
   }

   public getObjectsByType(layer: TiledLayer, type: 'camera' | 'boxcollider' | 'circlecollider'): TiledObject[] {
      if (layer.type === 'objectgroup') {
         return layer.objects.filter(o => o.type?.toLocaleLowerCase() === type.toLocaleLowerCase());
      }
      return [];
   }

   public getObjectByName(layer: TiledLayer, name: string): TiledObject {
      return this.getObjectsByName(layer, name)[0];
   }

   public getObjectsByName(layer: TiledLayer, name: string): TiledObject[] {
      if (layer.type === 'objectgroup') {
         return layer.objects.filter(o => o.name?.toLocaleLowerCase() === name.toLocaleLowerCase());
      }
      return [];
   }

   public getProperty<T = unknown>(object: TiledObject | TiledLayer, prop: 'zindex' | 'zoom' | 'collisiontype' | 'color' | string): TiledProperty<T> {
      return object.properties.filter(p => p.name?.toLocaleLowerCase() === prop.toLocaleLowerCase())[0] as TiledProperty<T>;
   }

   public getCamera(ex: TiledLayer): ExcaliburCamera {
      const camera = this.getObjectByType(ex, 'camera');
      if (camera) {
         const zoom = this.getProperty(camera, 'zoom');
         return ({
            x: camera.x,
            y: camera.y,
            zoom: zoom ? +zoom.value : 1
         })
      }
      return null;
   }

   public addTiledMapToScene(scene: ex.Scene) {
      var tm = this.getTileMap();
      scene.add(tm);

      const excaliburInfo = this.getExcaliburInfo();
      

      const camera = excaliburInfo.camera;
      if (camera) {
         scene.camera.x = camera.x;
         scene.camera.y = camera.y;
         scene.camera.z = camera.zoom;
      }

      const solidLayers = this.getLayersByProperty('solid', true);
      for (let solid of solidLayers) {
         for(let i = 0; i < solid.data.length; i++) {
            tm.data[i].solid = !!solid.data[i];
         }
      }

      const colliders = excaliburInfo.colliders;
      if (colliders) {
         for (let collider of colliders) {
            const actor = new Actor({
               pos: vec(collider.x, collider.y),
               collisionType: collider.collisionType ?? CollisionType.Fixed
            });
   
            if (collider.color) {
               actor.color = Color.fromHex(collider.color.value);
            }
            
            if (collider.type === 'box') { 
               actor.body.useBoxCollider(collider.width, collider.height, Vector.Zero);
            }
            if (collider.type === 'circle') {
               actor.body.useCircleCollider(collider.radius);
            }
   
            scene.add(actor);
            
            if (collider.zIndex) {
               actor.z = collider.zIndex;
            }
         }

      }

   }

   public load(): Promise<TiledMap> {
      var p = new Promise<TiledMap>();

      return super.load().then((map: TiledMap) => {

         var promises: Promise<any>[] = [];

         // Tiled+Excalibur smarts
         // TODO case insensitive
         this.data.ex = {}
         var excalibur = this.getExcaliburObjectsLayer();
         if (excalibur) {
            // Parse cameras
            this.data.ex.camera = this.getCamera(excalibur);
            // Parse colliders
            this.data.ex.colliders = [];
            var boxColliders = this.getObjectsByType(excalibur,'boxcollider');
            for (let box of boxColliders) {
               var collisionType = this.getProperty<CollisionType>(box, 'collisiontype');
               var color = this.getProperty<string>(box, 'color');
               var zIndex = this.getProperty<number>(box, 'zindex');
               this.data.ex.colliders.push({
                  ...box,
                  collisionType: collisionType?.value ?? CollisionType.Fixed,
                  color,
                  zIndex: +zIndex?.value ?? 0,
                  radius: 0,
                  type: 'box'
               });
            }

            var circleColliders = this.getObjectsByType(excalibur, 'circlecollider');
            for (let circle of circleColliders) {
               var collisionType = this.getProperty<CollisionType>(circle, 'collisiontype');
               var color = this.getProperty<string>(circle, 'color');
               var zIndex = this.getProperty<number>(circle, 'zindex');
               this.data.ex.colliders.push({
                  x: circle.x,
                  y: circle.y,
                  radius: Math.max(circle.width, circle.height),
                  collisionType: collisionType?.value ?? CollisionType.Fixed,
                  color,
                  zIndex: +zIndex?.value ?? 0,
                  width: circle.width,
                  height: circle.height,
                  type: 'circle'
               })
            }
         }

         // Loop through loaded tileset data
         // If we find an image property, then
         // load the image and sprite

         // If we find a source property, then
         // load the tileset data, merge it with
         // existing data, and load the image and sprite

         this.data.tilesets.forEach(ts => {
            if (ts.source) {
               var tileset = new Resource<TiledTileset>(
                  this.externalTilesetPathAccessor(ts.source, ts), "json");

               promises.push(tileset.load().then(external => {
                  (Object as any).assign(ts, external);
               }));
            }
         });

         // wait or immediately resolve pending promises
         // for external tilesets
         Promise.join.apply(this, promises).then(() => {

            // clear pending promises
            promises = [];

            // retrieve images from tilesets and create textures
            this.data.tilesets.forEach(ts => {
               var tx = new Texture(this.imagePathAccessor(ts.image, ts));
               ts.imageTexture = tx;
               promises.push(tx.load());

               Logger.getInstance().debug("[Tiled] Loading associated tileset: " + ts.image);
            });

            Promise.join.apply(this, promises).then(() => {
               p.resolve(map);
            }, (value?: any) => {
               p.reject(value);
            });
         }, (value?: any) => {
            p.reject(value);
         });


      });

      return p;
   }

   public processData(data: TiledMap): TiledMap {
      if (data === void 0) {
         throw `Tiled map resource ${this.path} is empty`;
      }

      switch (this.mapFormat) {
         case TiledMapFormat.TMX:
            // fall through
            this.data = data = this._parseTmx(data as any);
         case TiledMapFormat.JSON:
            return parseJsonMap(data);
      }
   }

   public getTilesetForTile(gid: number): TiledTileset {
      for (var i = this.data.tilesets.length - 1; i >= 0; i--) {
         var ts = this.data.tilesets[i];

         if (ts.firstgid <= gid) {
            return ts;
         }
      }

      return null;
   }

   public getTileMap(): TileMap {
      var map = new TileMap(0, 0, this.data.tilewidth, this.data.tileheight, this.data.height, this.data.width);

      // register sprite sheets for each tileset in map
      for (var ts of this.data.tilesets) {
         var cols = Math.floor(ts.imagewidth / ts.tilewidth);
         var rows = Math.floor(ts.imageheight / ts.tileheight);
         var ss = new SpriteSheet(ts.imageTexture, cols, rows, ts.tilewidth, ts.tileheight);

         map.registerSpriteSheet(ts.firstgid.toString(), ss);
      }

      for (var layer of this.data.layers) {

         if (layer.type === "tilelayer") {
            for (var i = 0; i < layer.data.length; i++) {
               let gid = <number>layer.data[i];

               if (gid !== 0) {
                  var ts = this.getTilesetForTile(gid);

                  map.data[i].sprites.push(new TileSprite(ts.firstgid.toString(), gid - ts.firstgid))
               }
            }
         }
      }

      return map;
   }

   private _convertToArray(obj, prop, plurlalize = false) {
      if (!obj[prop]) {
         obj[prop + (plurlalize ? 's' : '')] = [];
         return;
      }

      obj[prop + (plurlalize ? 's' : '')] = Array.isArray(obj[prop]) ? obj[prop] : [obj[prop]];
      if (plurlalize) {
         delete obj[prop];
      }
   }
   private _parseTmx(tmxData: string): TiledMap {
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
         arrayMode: false, //"strict"
         stopNodes: ["parse-me-as-string"]
     };

     const map = parser.parse(tmxData, options).map;
     this._convertToArray(map, 'layer', true);

     for (let layer of map.layers) {
        layer.type = layer.type ?? 'tilelayer';
        layer.encoding = layer.data.encoding;
        layer.data = layer.data['#text'].split(',').map(id => +id)
        layer.properties = layer.properties?.property ?? [];
        this._convertToArray(layer, 'properties');
     }

     let objectlayers = Array.isArray(map.objectgroup) ? map.objectgroup : [map.objectgroup];
     for (let objectlayer of objectlayers) {
         objectlayer.type = objectlayer.type ?? 'objectgroup';
         objectlayer.objects = Array.isArray(objectlayer.object) ? objectlayer.object : [objectlayer.object];
         objectlayer.objects.forEach(o => o.properties = o.properties?.property ?? []);
         objectlayer.objects.forEach(o => this._convertToArray(o, 'properties'));
         objectlayer.properties = objectlayer.properties?.property ?? [];
         this._convertToArray(objectlayer, 'properties');
         delete objectlayer.object;
         map.layers.push(objectlayer)
     }
     delete map.objectgroup;

     this._convertToArray(map, 'tileset', true);

     for(let tileset of map.tilesets) {
        tileset.imagewidth = tileset.image.width;
        tileset.imageheight = tileset.image.height;
        tileset.image = tileset.image.source;
     }

     return map;
   }
}

/**
 * Handles parsing of JSON tiled data
 */
var parseJsonMap = (data: TiledMap): TiledMap => {

   // Decompress layers
   if (data.layers) {
      for (var layer of data.layers) {

         if (typeof layer.data === "string") {

            if (layer.encoding === "base64") {
               layer.data = decompressors.decompressBase64(
                  <string>layer.data,
                  layer.encoding,
                  layer.compression || ""
               );
            }

         } else {
            layer.data = decompressors.decompressCsv(<number[]>layer.data);
         }

      }
   }

   return data;
}

/**
 * Decompression implementations
 */
var decompressors = {

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
   decompressBase64: (b64: string, encoding: string, compression: string) => {
      var i: number,
         j: number,
         l: number,
         tmp: number,
         placeHolders: number,
         arr: number[] | Uint8Array;

      if (b64.length % 4 > 0) {
         throw new Error('Invalid string. Length must be a multiple of 4')
      }

      var Arr = (typeof Uint8Array !== 'undefined')
         ? Uint8Array
         : Array;

      var PLUS = '+'.charCodeAt(0);
      var SLASH = '/'.charCodeAt(0);
      var NUMBER = '0'.charCodeAt(0);
      var LOWER = 'a'.charCodeAt(0);
      var UPPER = 'A'.charCodeAt(0);
      var PLUS_URL_SAFE = '-'.charCodeAt(0);
      var SLASH_URL_SAFE = '_'.charCodeAt(0);

      function decode(elt) {
         var code = elt.charCodeAt(0)
         if (code === PLUS || code === PLUS_URL_SAFE) return 62 // '+'
         if (code === SLASH || code === SLASH_URL_SAFE) return 63 // '/'
         if (code < NUMBER) return -1 // no match
         if (code < NUMBER + 10) return code - NUMBER + 26 + 26
         if (code < UPPER + 26) return code - UPPER
         if (code < LOWER + 26) return code - LOWER + 26
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      var len = b64.length
      placeHolders = b64.charAt(len - 2) === '=' ? 2 : b64.charAt(len - 1) === '=' ? 1 : 0

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(b64.length * 3 / 4 - placeHolders)

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? b64.length - 4 : b64.length

      var L = 0

      function push(v) {
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

      // Byte array
      // handle compression
      if ("zlib" === compression || "gzip" === compression) {
         arr = pako.inflate( arr );
      }

      var toNumber = function (byteArray: number[] | Uint8Array) {
         var value = 0;

         for (var i = byteArray.length - 1; i >= 0; i--) {
            value = (value * 256) + byteArray[i] * 1;
         }

         return value;
      };

      var resultLen = arr.length / 4;
      var result = new Array<number>(resultLen);

      for (i = 0; i < resultLen; i++) {
         result[i] = toNumber(arr.slice(i * 4, i * 4 + 3));
      }

      return result;
   }
}