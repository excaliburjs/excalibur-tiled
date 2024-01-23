import { z } from 'zod';

const TiledIntProperty = z.object({
   name: z.string(),
   type: z.literal('int'),
   value: z.number().int()
})

const TiledBoolProperty = z.object({
   name: z.string(),
   type: z.literal('bool'),
   value: z.boolean()
})

const TiledFloatProperty = z.object({
   name: z.string(),
   type: z.literal('float'),
   value: z.number()
})

const TiledStringProperty = z.object({
   name: z.string(),
   type: z.literal('string'),
   value: z.string()
})

const TiledFileProperty = z.object({
   name: z.string(),
   type: z.literal('file'),
   value: z.string()
})

const TiledColorProperty = z.object({
   name: z.string(),
   type: z.literal('color'),
   value: z.string()
})

const TiledObjectProperty = z.object({
   name: z.string(),
   type: z.literal('object'),
   value: z.number()
})

const TiledProperty = z.discriminatedUnion("type", [
   TiledIntProperty,
   TiledBoolProperty,
   TiledFloatProperty,
   TiledStringProperty,
   TiledFileProperty,
   TiledColorProperty,
   TiledObjectProperty
]);

const TiledTileLayerBase = z.object({
   name: z.string(),
   type: z.literal("tilelayer"),
   class: z.string().optional(),
   height: z.number(),
   width: z.number(),
   x: z.number(),
   y: z.number(),
   id: z.number(),
   opacity: z.number(),
   properties: z.array(TiledProperty).optional(),
   visible: z.boolean(),
   tintcolor: z.string().optional(),
   parallaxx: z.number().optional(),
   parallaxy: z.number().optional(),
   offsetx: z.number().optional(),
   offsety: z.number().optional(),
});

const TiledTileLayerCSV = TiledTileLayerBase.extend({
   data: z.array(z.number()),
   encoding: z.literal('csv')
})

const TiledTileLayerGZIP = TiledTileLayerBase.extend({
   data: z.array(z.number()),
   encoding: z.literal('base64'),
   compression: z.literal('gzip'),
})

const TiledTileLayerZLib = TiledTileLayerBase.extend({
   data: z.array(z.number()),
   encoding: z.literal('base64'),
   compression: z.literal('zlib'),
})

const TiledTileLayerZStandard = TiledTileLayerBase.extend({
   data: z.array(z.number()),
   encoding: z.literal('base64'),
   compression: z.literal('zstandard'),
})

const TiledTileLayerBase64 = TiledTileLayerBase.extend({
   data: z.string(),
   encoding: z.literal('base64'),
   compression: z.string(),
});

const TiledTileLayerChunk = z.object({
   x: z.number(),
   y: z.number(),
   width: z.number(),
   height: z.number(),
   data: z.array(z.number()) // infinite chunks are only csv!
});

export const TiledTileLayerInfinite = TiledTileLayerBase.extend({
   startx: z.number(),
   starty: z.number(),
   chunks: z.array(TiledTileLayerChunk)
});

export const TiledTileLayer = z.union([
   TiledTileLayerBase64,
   TiledTileLayerCSV,
   TiledTileLayerGZIP,
   TiledTileLayerZLib,
   TiledTileLayerZStandard,
   TiledTileLayerInfinite
]);

export function needsDecoding(x: TiledTileLayer): x is TiledTileLayer & { encoding: 'base64', data: string, compression: string } {
   return (x as any).encoding === 'base64';
}

export function isCSV(x: TiledTileLayer): x is TiledTileLayer & { encoding: 'csv', data: number[] } {
   return (x as any).encoding === 'csv' || Array.isArray((x as any).data);
}

const TiledPoint = z.object({
   x: z.number(),
   y: z.number()
});

const TiledPolygon = z.array(TiledPoint);

export const TiledText = z.object({
   text: z.string(),
   color: z.string().optional(),
   fontfamily: z.string().optional(),
   pixelsize: z.number().optional(),
   wrap: z.boolean().optional(),
   halign: z.union([z.literal('left'), z.literal('center'), z.literal('right'), z.literal('justify')]).optional(),
   valign: z.union([z.literal('top'), z.literal('center'), z.literal('bottom')]).optional()
})

const TiledObject = z.object({
   id: z.number().optional(), // Template files might not have an id for some reason
   name: z.string().optional(),
   type: z.string().optional(),
   x: z.number().optional(), // template files dont have x/y sometimes
   y: z.number().optional(), // template files dont have x/y sometimes
   rotation: z.number().optional(),
   height: z.number().optional(),
   width: z.number().optional(),
   visible: z.boolean().optional(),
   gid: z.number().optional(),
   text: TiledText.optional(),
   point: z.boolean().optional(),
   ellipse: z.boolean().optional(),
   polyline: z.array(TiledPoint).optional(),
   polygon: TiledPolygon.optional(),
   template: z.string().optional(),
   properties: z.array(TiledProperty).optional(),
});

const TiledAnimation = z.object({
   duration: z.number(),
   tileid: z.number()
});

const TiledObjectLayer = z.object({
   name: z.string(),
   draworder: z.string(),
   type: z.literal("objectgroup"),
   class: z.string().optional(),
   x: z.number(),
   y: z.number(),
   id: z.number(),
   color: z.string().optional(),
   tintcolor: z.string().optional(),
   parallaxx: z.number().optional(),
   parallaxy: z.number().optional(),
   offsetx: z.number().optional(),
   offsety: z.number().optional(),
   opacity: z.number(),
   properties: z.array(TiledProperty).optional(),
   visible: z.boolean(),
   objects: z.array(TiledObject)
});

const TiledImageLayer = z.object({
   name: z.string(),
   x: z.number(),
   y: z.number(),
   id: z.number(),
   type: z.literal('imagelayer'),
   class: z.string().optional(),
   image: z.string().optional(),
   opacity: z.number(),
   properties: z.array(TiledProperty).optional(),
   visible: z.boolean(),
   tintcolor: z.string().optional(),
   repeatx: z.boolean().optional(),
   repeaty: z.boolean().optional(),
   parallaxx: z.number().optional(),
   parallaxy: z.number().optional(),
   offsetx: z.number().optional(),
   offsety: z.number().optional(),
   transparentcolor: z.string().optional()
});


// FIXME recursive Group Layer definition
const TiledLayer = z.union([
   TiledImageLayer,
   TiledTileLayer,
   TiledObjectLayer
]);


const TiledObjectGroup = z.object({
   draworder: z.string(),
   id: z.number().optional(), // sometimes tiled doesn't put an id here :( inconsistent
   name: z.string(),
   x: z.number(),
   y: z.number(),
   opacity: z.number(),
   tintcolor: z.string().optional(),
   type: z.literal("objectgroup"),
   visible: z.boolean(),
   objects: z.array(TiledObject),
   properties: z.array(TiledProperty).optional()
})

export const TiledTile = z.object({
   id: z.number(),
   type: z.string().optional(),
   animation: z.array(TiledAnimation).optional(),
   objectgroup: TiledObjectGroup.optional(),
   probability: z.number().optional(),
   properties: z.array(TiledProperty).optional(),
   // Tiles can be collections of images
   image: z.string().optional(),
   imageheight: z.number().optional(),
   imagewidth: z.number().optional()
})

const TiledTilesetEmbedded = z.object({
   name: z.string(),
   firstgid: z.number().optional(),
   class: z.string().optional(),
   objectalignment: z.union([
      z.literal('topleft'),
      z.literal('top'),
      z.literal('topright'),
      z.literal('left'),
      z.literal('center'),
      z.literal('right'),
      z.literal('bottomleft'),
      z.literal('bottom'),
      z.literal('bottomright'),
   ]).optional(),
   // optional image/width/height if collection of images
   image: z.string().optional(),
   imagewidth: z.number().optional(),
   imageheight: z.number().optional(),
   columns: z.number(),
   tileheight: z.number(),
   tilewidth: z.number(),
   tilecount: z.number(),

   grid: z.object({
      height: z.number(),
      width: z.number(),
      orientation: z.union([z.literal('isometric'), z.literal('orthogonal')])
   }).optional(),
   // Can specify a drawing offset
   tileoffset: TiledPoint.optional(),
   spacing: z.number(),
   margin: z.number(),
   tiles: z.array(TiledTile).optional(),
   properties: z.array(TiledProperty).optional()
});

export function isTiledTilesetSingleImage(x: TiledTileset): x is TiledTilesetEmbedded & { image: string, imagewidth: number, imageheight: number } {
   return !!(x as TiledTilesetEmbedded).image;
}

export function isTiledTilesetCollectionOfImages(x: TiledTileset): x is Omit<TiledTilesetEmbedded, 'image' | 'imagewidth' | 'imageheight'> {
   return !!!(x as TiledTilesetEmbedded).image;
}

export const TiledTilesetFile = TiledTilesetEmbedded.extend({
   tiledversion: z.string().optional(),
   type: z.literal('tileset'),
   version: z.string().optional()
});

const TiledTilesetExternal = z.object({
   firstgid: z.number(),
   source: z.string()
});

export const TiledTileset = z.union([TiledTilesetEmbedded, TiledTilesetExternal]);

export const TiledTemplate = z.object({
   object: TiledObject.extend({ id: z.number().optional() }),
   tileset: TiledTilesetExternal.optional(),
   type: z.literal('template')
});

export const TiledMap = z.object({
   type: z.string(),
   class: z.string().optional(),
   tiledversion: z.string(),
   version: z.string(),
   width: z.number(),
   height: z.number(),
   tilewidth: z.number(),
   tileheight: z.number(),
   compressionlevel: z.number().optional(),
   infinite: z.boolean(),
   nextlayerid: z.number(),
   nextobjectid: z.number(),
   parallaxoriginx: z.number().optional(),
   parallaxoriginy: z.number().optional(),
   hexsidelength: z.number().optional(),
   staggeraxis: z.literal('y').or(z.literal('x')).optional(),
   staggerindex: z.literal('odd').or(z.literal('even')).optional(),
   orientation: z.union([z.literal("isometric"), z.literal("orthogonal"), z.literal("staggered"), z.literal("hexagonal")]),
   renderorder: z.union([z.literal("right-down"), z.literal("right-up"), z.literal("left-down"), z.literal("left-up")]),
   backgroundcolor: z.string().optional(),
   layers: z.array(TiledLayer),
   tilesets: z.array(TiledTileset),
   properties: z.array(TiledProperty).optional()
})

export type TiledObjectGroup = z.infer<typeof TiledObjectGroup>;
export type TiledObject = z.infer<typeof TiledObject>;
export type TiledTile = z.infer<typeof TiledTile>;
export type TiledText = z.infer<typeof TiledText>;

export type TiledTileset = z.infer<typeof TiledTileset>;
export type TiledTilesetEmbedded = z.infer<typeof TiledTilesetEmbedded>;
export type TiledTilesetExternal = z.infer<typeof TiledTilesetExternal>;
export type TiledTilesetFile = z.infer<typeof TiledTilesetFile>;

export type TiledTemplate = z.infer<typeof TiledTemplate>;

export type TiledMap = z.infer<typeof TiledMap>;
export type TiledTileLayer = z.infer<typeof TiledTileLayer>;
export type TiledTileLayerInfinite = z.infer<typeof TiledTileLayerInfinite>;
export type TiledObjectLayer = z.infer<typeof TiledObjectLayer>;
export type TiledImageLayer = z.infer<typeof TiledImageLayer>;
export type TiledLayer = z.infer<typeof TiledLayer>;
export type TiledProperty = z.infer<typeof TiledProperty>;
export type TiledPropertyTypes = Pick<TiledProperty, 'type'>['type'];

export function isInfiniteLayer(tileLayer: TiledTileLayer): tileLayer is TiledTileLayerInfinite {
   return !!(tileLayer as TiledTileLayerInfinite).chunks;
}

export function isTiledTilesetEmbedded(ts: TiledTileset): ts is TiledTilesetEmbedded {
   return !!!(ts as TiledTilesetExternal).source;
}

export function isTiledTilesetExternal(ts: TiledTileset): ts is TiledTilesetExternal {
   return !!(ts as TiledTilesetExternal).source;
}


class BoundingBox {
   constructor(public x: number, public y: number, public width: number, public height: number) { }

   combine(other: BoundingBox) {

      const right = this.x + this.width;
      const bottom = this.y + this.height;

      const otherRight = other.x + other.width;
      const otherBottom = other.y + other.height;

      const endRight = Math.max(right, otherRight);
      const endBottom = Math.max(bottom, otherBottom);


      const compositeBB = new BoundingBox(
         Math.min(this.x, other.x),
         Math.min(this.y, other.y),
         endRight - Math.min(this.x, other.x),
         endBottom - Math.min(this.y, other.y)
      );
      return compositeBB;
   }

}

export class TiledParser {

   _coerceNumber(value: any) {
      return +value;
   }
   _coerceBoolean(value: any) {
      switch(value) {
         case "0": return false;
         case "false": return false;
         case "true": return true;
         default: return !!(Boolean(value));
      }
   }

   _coerceType(type: TiledPropertyTypes, value: string) {
      if (type === 'bool') {
         return this._coerceBoolean(value);
      }

      if (type === 'int' || type === 'float') {
         return this._coerceNumber(value);
      }

      if (type === 'object') {
         return this._coerceNumber(value);
      }
      return value;
   }

   _parsePropertiesNode(propertiesNode: Element, target: any) {
      const properties = [];
      if (propertiesNode) {
         for (let prop of propertiesNode.children) {
            const type = prop.getAttribute('type') as TiledPropertyTypes ?? 'string'; // if no type is set it's string!
            let value: any = prop.getAttribute('value');
            if (!value) {
               value = prop.innerHTML;
            }
            properties.push({
               name: prop.getAttribute('name'),
               type: type,
               value: this._coerceType(type, value as string)
            })
         }
      }
      target.properties = properties;
   }

   _parseAttributes(node: Element, target: any) {
      // attribute names to coerce into numbers
      const numberProps = [
         'width',
         'height',
         'columns',
         'firstgid',
         'spacing',
         'margin',
         'tilecount',
         'tilewidth',
         'tileheight',
         'opacity',
         'compressionlevel',
         'nextlayerid',
         'nextobjectid',
         'parallaxoriginx',
         'parallaxoriginy',
         'parallaxx',
         'parallaxy',
         'hexsidelength',
         'offsetx',
         'offsety',
         'id',
         'gid',
         'x',
         'y',
         'rotation',
         'probability'
      ];

      // attribute names to coerce into booleans
      const booleanProps = [
         "infinite",
         'visible',
         'repeatx',
         'repeaty',
      ]

      for (let attribute of node.attributes) {
         if (numberProps.indexOf(attribute.name as any) > -1) {
            target[attribute.name] = this._coerceNumber(attribute.value);
         } else if (booleanProps.indexOf(attribute.name as any) > -1) {
            target[attribute.name] = this._coerceBoolean(attribute.value);
         } else {
            target[attribute.name] = attribute.value;
         }
      }
   }

   /**
    * Takes an xml string and uses an available parser (DOMParser in browser or JSDOM in Node.js)
    * to produce a DOM object compatible with at least DOM Level 3.
    * @param xml
    * @returns
    */
   _parseToDocument(xml: string): Document {
      if (typeof DOMParser !== 'undefined') {
         const domParser = new DOMParser();
         return domParser.parseFromString(xml, 'application/xml');
      }

      try {
         const { JSDOM } = require('jsdom');
         const dom = new JSDOM(xml, {
            contentType: 'application/xml',
            encoding: 'utf-8',
         });
         return dom.window.document as Document;
      } catch (e) { /* ignored */ }

      const error = new Error('Could not find DOM parser');
      console.error(error.message, error);
      throw error;
   }

   parseObject(objectNode: Element, strict = true): TiledObject {
      const object: any = {};
      object.type = '';
      object.x = 0;
      object.y = 0;

      if (!objectNode.getAttribute('template')) {
         object.visible = true;
         object.name = '';
         object.rotation = 0;
         object.height = 0;
         object.width = 0;
      }

      this._parseAttributes(objectNode, object);


      const propertiesNode = objectNode.querySelector('properties') as Element;
      if (propertiesNode) {
         this._parsePropertiesNode(propertiesNode, object);
      }

      const text = objectNode.querySelector('text') as Element;
      if (text) {
         object.text = {
            text: text.textContent
         }

         const fontfamily = text.getAttribute('fontfamily');
         if (fontfamily) {
            object.text.fontfamily = fontfamily;
         }

         const color = text.getAttribute('color');
         if (color) {
            object.text.color = color;
         }

         const pixelsize = text.getAttribute('pixelsize');
         if (pixelsize) {
            object.text.pixelsize = this._coerceNumber(pixelsize);
         }

         const wrap = text.getAttribute('wrap');
         if (wrap) {
            object.text.wrap = this._coerceBoolean(wrap);
         }

         const valign = text.getAttribute('valign');
         if (valign) {
            object.text.valign = valign;
         }
         const halign = text.getAttribute('halign');
         if (halign) {
            object.text.halign = halign;
         }
      }

      const point = objectNode.querySelector('point');
      if (point) {
         object.point = true;
      }

      const ellipse = objectNode.querySelector('ellipse');
      if (ellipse) {
         object.ellipse = true;
      }


      const polygon = objectNode.querySelector('polygon');
      if (polygon) {
         const points = polygon.getAttribute('points')?.split(' ');
         object.polygon = [];
         if (points) {
            points.forEach(p => {
               const point = p.split(',');
               object.polygon.push({
                  x: +point[0],
                  y: +point[1]
               })
            })
         }
      }

      const polyline = objectNode.querySelector('polyline');
      if (polyline) {
         const points = polyline.getAttribute('points')?.split(' ');
         object.polyline = [];
         if (points) {
            points.forEach(p => {
               const point = p.split(',');
               object.polyline.push({
                  x: +point[0],
                  y: +point[1]
               })
            })
         }
      }

      if (strict) {
         try {
            return TiledObject.parse(object);
         } catch (e) {
            console.error('Could not parse object', object, e);
            throw e;
         }
      }
      return object as TiledObject;
   }

   parseTileset(tilesetNode: Element, strict = true): TiledTileset {
      const tileset: any = {};
      tileset.spacing = 0;
      tileset.margin = 0;
      this._parseAttributes(tilesetNode, tileset);

      if (tileset.source) {
         try {
            return TiledTileset.parse(tileset);
         } catch (e) {
            console.error('Could not parse external tileset', tileset, e);
         }
      }

      for (let tilesetChild of tilesetNode.children) {
         switch (tilesetChild.tagName) {
            case 'properties': {
               this._parsePropertiesNode(tilesetChild, tileset);
               break;
            }
            case 'tileoffset': {
               const tileoffset: any = {};
               this._parseAttributes(tilesetChild, tileoffset);
               tileset.tileoffset = tileoffset;
               break;
            }
            case 'grid': {
               const grid: any = {};
               this._parseAttributes(tilesetChild, grid);
               tileset.grid = grid;
               break;
            }
            case 'image': {
               tileset.image = tilesetChild.getAttribute('source');
               tileset.imagewidth = this._coerceNumber(tilesetChild.getAttribute('width'));
               tileset.imageheight = this._coerceNumber(tilesetChild.getAttribute('height'));
               break;
            }
            case 'tile': {
               if (!tileset.tiles) {
                  tileset.tiles = [];
               }
               const tile: any = {};
               this._parseAttributes(tilesetChild, tile);
               for (let tileChild of tilesetChild.children) {
                  switch (tileChild.tagName) {
                     case 'image': {
                        tile.image = tileChild.getAttribute('source');
                        tile.imagewidth = this._coerceNumber(tileChild.getAttribute('width'));
                        tile.imageheight = this._coerceNumber(tileChild.getAttribute('height'));
                        break;
                     }
                     case 'objectgroup': {
                        const objectgroup: any = {};
                        objectgroup.type = 'objectgroup';
                        objectgroup.name = "";
                        objectgroup.visible = true;
                        objectgroup.x = 0;
                        objectgroup.y = 0;
                        objectgroup.opacity = 1;
                        objectgroup.objects = [];
                        this._parseAttributes(tileChild, objectgroup);
                        tile.objectgroup = objectgroup;

                        for (let objectChild of tileChild.children) {
                           const object = this.parseObject(objectChild, strict);
                           objectgroup.objects.push(object);
                        }
                        break;
                     }
                     case 'animation': {
                        const animation: any = [];
                        for (let frameChild of tileChild.children) {
                           animation.push({
                              duration: this._coerceNumber(frameChild.getAttribute('duration')),
                              tileid: this._coerceNumber(frameChild.getAttribute('tileid'))
                           })
                        }

                        tile.animation = animation;
                        break;
                     }
                     case 'properties': {
                        this._parsePropertiesNode(tileChild, tile);
                        break;
                     }
                  }
               }

               if (strict) {
                  try {
                     tileset.tiles.push(TiledTile.parse(tile));
                  } catch (e) {
                     console.error('Could not parse Tile', tile, e);
                     throw e;
                  }
               } else {
                  tileset.tiles.push(tile as TiledTile);
               }
               break;
            }
         }
      }
      if (strict) {
         try {
            return TiledTileset.parse(tileset);
         } catch (e) {
            console.error('Could not parse Tileset', tileset, e);
            throw e;
         }
      }
      return tileset as TiledTileset;
   }

   _largestBounds = new BoundingBox(0, 0, 0, 0);
   parseTileLayer(layerNode: Element, infinite: boolean, strict = true): TiledLayer {
      const layer: any = {};
      layer.type = 'tilelayer';
      layer.compression = ''; // default uncompressed
      layer.x = 0;
      layer.y = 0;
      layer.opacity = 1;
      layer.visible = true;
      this._parseAttributes(layerNode, layer);

      for (let layerChild of layerNode.children) {
         switch (layerChild.tagName) {
            case 'properties': {
               this._parsePropertiesNode(layerChild, layer);
               break;
            }
            case 'data': {
               if (infinite) {
                  layer.width = 0;
                  layer.height = 0;
                  layer.chunks = [];
                  // Tiled appears to have an undocumented minimum bounds
                  let bounds: BoundingBox = new BoundingBox(0, 0, 0, 0);
                  for (let chunkTag of layerChild.children) {
                     if (chunkTag.tagName === 'chunk') {
                        const chunk: any = {};
                        this._parseAttributes(chunkTag, chunk);

                        // If infinite there is no encoding other than CSV!
                        chunk.data = chunkTag.textContent?.split(',').map(id => +id);

                        // combining bounding boxes actually probably is easiest here
                        const chunkBounds = new BoundingBox(chunk.x, chunk.y, chunk.width, chunk.height);

                        bounds = bounds.combine(chunkBounds);

                        layer.chunks.push(chunk);
                     }
                  }

                  layer.width = bounds.width;
                  layer.height = bounds.height;
                  layer.startx = bounds.x;
                  layer.starty = bounds.y;

                  this._largestBounds = this._largestBounds.combine(new BoundingBox(layer.startx, layer.starty, layer.width, layer.height));

               } else {
                  const encoding = layerChild.getAttribute('encoding');
                  // technically breaking compat, but this is useful
                  layer.encoding = encoding;

                  const compression = layerChild.getAttribute('compression');
                  if (compression) {
                     layer.compression = compression;
                  }

                  switch (layer.encoding) {
                     case 'base64': {
                        layer.data = layerChild.textContent?.trim();
                        break;
                     }
                     case 'csv': {// csv case
                        layer.data = layerChild.textContent?.split(',').map(id => +id);
                        break;
                     }
                  }
               }
            }
         }
      }
      if (strict) {
         try {
            return TiledLayer.parse(layer);
         } catch (e) {
            console.error('Could not parse tiled tile layer', layer, e);
            throw e;
         }
      }
      return layer as TiledLayer;
   }

   parseObjectGroup(groupNode: Element, strict = true): TiledLayer {
      const group: any = {};
      group.type = 'objectgroup';
      group.draworder = 'topdown';
      group.visible = true;
      group.x = 0;
      group.y = 0;
      group.opacity = 1;
      group.objects = [];
      this._parseAttributes(groupNode, group);
      for (let groupChild of groupNode.children) {
         switch (groupChild.tagName) {
            case 'properties': {
               this._parsePropertiesNode(groupChild, group);
               break;
            }
            case 'object': {
               const object = this.parseObject(groupChild, strict);
               group.objects.push(object);
               break;
            }
         }
      }

      if (strict) {
         try {
            return TiledLayer.parse(group);
         } catch (e) {
            console.error('Could not parse object group', group, e);
            throw e;
         }
      }
      return group as TiledLayer;
   }

   parseImageLayer(imageNode: Element, strict = true): TiledLayer {
      const imageLayer: any = {};
      imageLayer.type = 'imagelayer';
      imageLayer.visible = true;
      imageLayer.x = 0;
      imageLayer.y = 0;
      imageLayer.opacity = 1;

      const image = imageNode.querySelector('image');
      imageLayer.image = image?.getAttribute('source');

      const properties = imageNode.querySelector('properties');
      if (properties) {
         this._parsePropertiesNode(properties, imageLayer);
      }

      const transparentcolor = image?.getAttribute('trans');
      if (transparentcolor) {
         imageLayer.transparentcolor = '#' + transparentcolor;
      }

      this._parseAttributes(imageNode, imageLayer);

      if (strict) {
         try {
            return TiledLayer.parse(imageLayer);
         } catch (e) {
            console.error('Could not parse layer', imageLayer, e);
            throw e;
         }
      }
      return imageLayer as TiledLayer;
   }

   parseExternalTemplate(txXml: string, strict = true): TiledTemplate {
      const doc = this._parseToDocument(txXml);
      const templateElement = doc.querySelector('template') as Element;
      const template: any = {};
      template.type = 'template';
      const objectElement = templateElement.querySelector('object');
      if (objectElement) {
         template.object = this.parseObject(objectElement, strict);
      }

      const tileSetElement = templateElement.querySelector('tileset');
      if (tileSetElement) {
         template.tileset = this.parseTileset(tileSetElement, strict);
      }

      if (strict) {
         try {
            return TiledTemplate.parse(template);
         } catch (e) {
            console.error('Could not parse template', template, e);
            throw e;
         }
      }
      return template as TiledTemplate;
   }

   /**
    * Takes Tiled tmx xml and produces the equivalent Tiled txj (json) content
    * @param tsxXml 
    */
   parseExternalTileset(tsxXml: string, strict = true): TiledTilesetFile {
      const doc = this._parseToDocument(tsxXml);
      const tilesetElement = doc.querySelector('tileset') as Element;

      const tileset = this.parseTileset(tilesetElement, strict);

      (tileset as any).type = 'tileset';
      this._parseAttributes(tilesetElement, tileset);


      if (strict) {
         try {
            return TiledTilesetFile.parse(tileset);
         } catch (e) {
            console.error('Could not parse tileset file', tileset, e);
            throw e;
         }
      }
      return tileset as TiledTilesetFile;
   }


   /**
    * Takes Tiled tmx xml and produces the equivalent Tiled tmj (json) content
    * @param tmxXml 
    * @returns 
    */
   parse(tmxXml: string, strict = true): TiledMap {
      const doc = this._parseToDocument(tmxXml);
      const mapElement = doc.querySelector('map') as Element;

      const tiledMap: any = {};
      tiledMap.type = 'map';
      tiledMap.compressionlevel = -1;
      tiledMap.layers = [];
      tiledMap.tilesets = [];

      this._parseAttributes(mapElement, tiledMap);

      const parseHelper = (node: Element, strict = true) => {
         switch (node.tagName) {
            case 'group': {
               // recurse through groups!
               // currently we support groups by flattening them, no group types
               for (let child of node.children) {
                  parseHelper(child, strict);
               }
               break;
            }
            case 'layer': {
               const layer = this.parseTileLayer(node, tiledMap.infinite, strict);
               tiledMap.layers.push(layer);
               
               break;
            }
            case 'properties': {
               this._parsePropertiesNode(node, tiledMap);
               break;
            }
            case 'tileset': {
               const tileset = this.parseTileset(node, strict);
               tiledMap.tilesets.push(tileset);
               break;
            }
            case 'objectgroup': {
               const objectgroup = this.parseObjectGroup(node, strict);
               tiledMap.layers.push(objectgroup);
               break;
            }
            case 'imagelayer': {
               const imageLayer = this.parseImageLayer(node, strict);
               tiledMap.layers.push(imageLayer);
               break;
            }
         }
      }

      // Parse all layers
      for (let mapChild of mapElement.children) {
         parseHelper(mapChild, strict);
      }

      if (strict) {
         try {
            return TiledMap.parse(tiledMap);
         } catch (e) {
            console.error('Could not parse Tiled map', e);
            throw e;
         }
      }

      return tiledMap as TiledMap;
   }
}