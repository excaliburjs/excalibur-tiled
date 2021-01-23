// tmx xml parsing
import * as parser from 'fast-xml-parser'

import { TiledGrid, TiledMapTerrain, TiledProperty, TiledTile, TiledTileOffset, TiledWangSet } from "./tiled-types";

export interface TiledTileset {
   /**
    * The JSON format version
    */
   version: number;

   /**
    * GID corresponding to the first tile in the set
    */
   firstGid: number;

   /**
    * Path to the image used for tiles in this set
    */
   image: string;

   /**
    * Height of source image in pixels
    */
   imageHeight: number;
   /**
    * Width of source image in pixels
    */
   imageWidth: number;
   /**
    * (optional)
    */
   grid: TiledGrid;
   /**
    * Buffer between image edge and first tile (pixels)
    */
   margin: number;
   /**
    * Alignment to use for tile objects (unspecified (default), topleft, top, topright, left, center, right, bottomleft, bottom or bottomright) (since 1.4)
    */
   objectAlignment: 'unspecified' | 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
   /**
    * Refers to external tileset file (should be JSON)
    */
   source: string;
   /**
    * Spacing between adjacent tiles in image (pixels)
    */
   spacing: number;

   /**
    * Maximum columns of tiles in this set
    */
   columns: number;
   /**
    * Height of a tile in pixels
    */
   tileHeight: number;
   /**
    * Width of a tile in pixels 
    */
   tileWidth: number;

   /**
    * Array of Tiles (optional)
    */
   tiles: TiledTile[];

   name: string;
   properties: TiledProperty[];
   /**
    * The number of tiles in this tileset
    */
   tileCount: number;
   /**
    * Optional
    */
   tileOffset: TiledTileOffset;

   /**
    * The Tiled version used to save the file
    */
   tiledVersion: string;
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB) (optional)
    */
   backgroundColor: string;
   /**
    * Hex-formatted color (#RRGGBB) (optional)
    */
   transparentColor: string;
   /**
    * Array of Terrains (optional)
    */
   terrains: TiledMapTerrain[];

   /**
    * Array of Wang sets (since 1.1.5)
    */
   wangSets: TiledWangSet[]
}

export const parseExternalTsx = (tsxData: string, tiledRef: any): TiledTileset => {

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
   const rawTileset = rawTsx;

   rawTileset.firstgid = tiledRef.firstgid;
   rawTileset.source = tiledRef.source;
   rawTileset.imagewidth = rawTsx.image.width;
   rawTileset.imageheight = rawTsx.image.height;
   rawTileset.objectalignment = rawTsx.objectalignment ?? 'unspecified';
   rawTileset.image = rawTsx.image.source;
   
   const result: TiledTileset = {
      ...rawTileset,
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
   };

   return result;
}