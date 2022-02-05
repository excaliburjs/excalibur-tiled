// tmx xml parsing
import { Matrix, vec } from 'excalibur';
import * as parser from 'fast-xml-parser'
import { TiledLayer, TiledObjectGroup } from '.';

import { TiledGrid, TiledMapTerrain, TiledProperty, RawTilesetTile, TiledTileOffset, TiledWangSet, RawTiledTileset } from "./tiled-types";

export class TiledTileset {
   /**
    * The JSON format version
    */
   version!: number;

   /**
    * GID corresponding to the first tile in the set
    */
   firstGid!: number;

   /**
    * Path to the image used for tiles in this set
    */
   image!: string;

   /**
    * Height of source image in pixels
    */
   imageHeight!: number;
   /**
    * Width of source image in pixels
    */
   imageWidth!: number;
   /**
    * (optional)
    */
   grid?: TiledGrid;
   /**
    * Buffer between image edge and first tile (pixels)
    */
   margin!: number;
   /**
    * Alignment to use for tile objects (unspecified (default), topleft, top, topright, left, center, right, bottomleft, bottom or bottomright) (since 1.4)
    */
   objectAlignment!: 'unspecified' | 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
   /**
    * Refers to external tileset file
    */
   source!: string;
   /**
    * Spacing between adjacent tiles in image (pixels)
    */
   spacing!: number;

   /**
    * Maximum columns of tiles in this set
    */
   columns!: number;
   /**
    * Height of a tile in pixels
    */
   tileHeight!: number;
   /**
    * Width of a tile in pixels 
    */
   tileWidth!: number;

   /**
    * Array of Tiles (optional)
    */
   tiles: TiledTilesetTile[] = [];

   name!: string;
   properties?: TiledProperty[];
   /**
    * The number of tiles in this tileset
    */
   tileCount!: number;
   /**
    * Optional
    */
   tileOffset?: TiledTileOffset;

   /**
    * The Tiled version used to save the file
    */
   tiledVersion!: string;
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB) (optional)
    */
   backgroundColor?: string;
   /**
    * Hex-formatted color (#RRGGBB) (optional)
    */
   transparentColor?: string;
   /**
    * Array of Terrains (optional)
    */
   terrains?: TiledMapTerrain[];

   /**
    * Array of Wang sets (since 1.1.5)
    */
   wangSets?: TiledWangSet[]

   horizontalFlipTransform!: Matrix;
   verticalFlipTransform!: Matrix;
   diagonalFlipTransform!: Matrix;

   public static parse(rawTileSet: RawTiledTileset) {
      const tileSet = new TiledTileset();

      tileSet.tiles = rawTileSet.tiles.map(t => TiledTilesetTile.parse(t));
      tileSet.firstGid = rawTileSet.firstgid;
      tileSet.tileWidth = rawTileSet.tilewidth;
      tileSet.tileHeight = rawTileSet.tileheight;
      tileSet.tileCount = rawTileSet.tilecount;
      tileSet.tileOffset = rawTileSet.tileoffset;
      tileSet.tiledVersion = rawTileSet.tiledversion;
      tileSet.backgroundColor = rawTileSet.backgroundcolor;
      tileSet.transparentColor = rawTileSet.transparentcolor;
      tileSet.wangSets = rawTileSet.wangsets;
      tileSet.imageWidth = rawTileSet.imagewidth;
      tileSet.imageHeight = rawTileSet.imageheight;
      tileSet.objectAlignment = rawTileSet.objectalignment ?? 'unspecified';
      tileSet.image = rawTileSet.image;

      tileSet.horizontalFlipTransform = Matrix.identity().translate(tileSet.tileWidth, 0).scale(-1, 1);
      tileSet.verticalFlipTransform = Matrix.identity().translate(0, tileSet.tileHeight).scale(1, -1);
      tileSet.diagonalFlipTransform = Matrix.identity().translate(0, 0).rotate(-Math.PI/2).scale(-1, 1);

      return tileSet;
   }
}

export class TiledTilesetTile {
   id!: number;
   objectgroup?: TiledObjectGroup
   

   public static parse(rawTilesetTile: RawTilesetTile) {
      const tile = new TiledTilesetTile();
      tile.id = +rawTilesetTile.id;
      if (rawTilesetTile.objectgroup) {
         tile.objectgroup = TiledObjectGroup.parse(rawTilesetTile.objectgroup);
      }
      return tile;
   }
}
// TODO merge this with the other parser
export const parseExternalTsx = (tsxData: string, firstGid: number, source: string): TiledTileset => {
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

   const rawTsx = parser.parse(tsxData, options).tileset;
   const rawTileset: RawTiledTileset = rawTsx;

   rawTileset.firstgid = firstGid;
   rawTileset.source = source;
   rawTileset.imagewidth = rawTsx.image.width;
   rawTileset.imageheight = rawTsx.image.height;
   rawTileset.objectalignment = rawTsx.objectalignment ?? 'unspecified';
   rawTileset.image = rawTsx.image.source;
   _convertToArray(rawTsx, "tile", true);
   rawTsx.tiles.forEach((t: any) => { 
      if (t.objectgroup){
         t.objectgroup.type = 'objectgroup';
         _convertToArray(t.objectgroup, 'object', true);
       }
   });
   rawTileset.tiles = rawTsx.tiles;

   const origin = vec(rawTileset.tilewidth/2, rawTileset.tileheight/2);
   const result: TiledTileset = {
      ...rawTileset,
      tiles: rawTileset.tiles.map(t => TiledTilesetTile.parse(t)),
      firstGid: rawTileset.firstgid,
      tileWidth: rawTileset.tilewidth,
      tileHeight: rawTileset.tileheight,
      tileCount: rawTileset.tilecount,
      tileOffset: rawTileset.tileoffset,
      tiledVersion: rawTileset.tiledversion,
      backgroundColor: rawTileset.backgroundcolor,
      transparentColor: rawTileset.transparentcolor,
      wangSets: rawTileset.wangsets,
      imageWidth: rawTileset.imagewidth,
      imageHeight: rawTileset.imageheight,
      objectAlignment: rawTileset.objectalignment ?? 'unspecified',
      image: rawTileset.image,
      horizontalFlipTransform: Matrix.identity().translate(rawTileset.tilewidth, 0).scale(-1, 1),
      verticalFlipTransform: Matrix.identity().translate(0, rawTileset.tileheight).scale(1, -1),
      diagonalFlipTransform: Matrix.identity().translate(rawTileset.tilewidth, rawTileset.tileheight).rotate(-Math.PI/2).scale(-1, 1)
   };

   return result;
}