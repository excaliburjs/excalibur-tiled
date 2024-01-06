import {
   CollisionType
} from 'excalibur';
import { TiledObject } from './tiled-object';

/**
 * @deprecated
 */
export interface ExcaliburData {
   camera?: ExcaliburCamera;
   colliders?: ExcaliburCollider[];
}

/**
 * @deprecated
 */
export interface ExcaliburCamera {
   x: number;
   y: number;
   zoom: number;
}

/**
 * @deprecated
 */
export interface ExcaliburCollider {
   type: 'box' | 'circle';
   collisionType: CollisionType;
   color: TiledProperty<string> | undefined;
   zIndex: number;
   x: number;
   y: number;
   width: number;
   height: number;
   radius: number;
   name?: string;
   tiled: TiledObject;
}
/**
 * @deprecated
 */
export interface TiledProperty<T = unknown> {
   /**
    * Name of the property
    */
   name: string;
   /**
    * Type of the property (string (default), int, float, bool, color or file (since 0.16, with color and file added in 0.17))
    */
   type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file';
   /**
    * Value of the property
    */
   value: T;
}

/**
 * @deprecated
 */
export type TiledEncoding = 'csv' | 'base64';
/**
 * @deprecated
 */
export type TiledCompression = 'zlib' | 'gzip' | 'zstd';

/**
 * @deprecated
 */
export interface TiledChunk {
   /**
    * Array of unsigned int (GIDs) or base64-encoded data
    */
   data: number[] | string;
   /**
    * Height in tiles
    */
   height: number;
   /**
    * Width in tiles
    */
   width: number;
   /**
    * X coordinate in tiles
    */
   x: number;
   /**
    * Y coordinate in tiles
    */
   y: number;
}

/**
 * @deprecated
 */
export interface TiledTileOffset {
   /**
    * Horizontal offset in pixels
    */
   x: number;
   /**
    * Vertical offset in pixels (positive is down)
    */
   y: number;
}

/**
 * @deprecated
 */
export interface TiledWangSet {
   /**
    * Array of Wang colors
    */
   cornercolors: TiledWangColor[];
   /**
    * Array of Wang colors
    */
   edgecolors: TiledWangColor[];
   name: string;
   properties: TiledProperty[];
   /**
    * Local ID of tile representing the Wang set
    */
   tile: number;
   wangtiles: TiledWangTile[];
}

/**
 * @deprecated
 */
export interface TiledWangTile {
   /**
    * Array of Wang color indexes (uchar[8]
    */
   wangid: number[];
   /**
    * Tile is flipped diagonally (default: false)
    */
   dflip: boolean;
   /**
    * Tile is flipped horizontally (default: false)
    */
   hflip: boolean;
   /**
    * Local ID of tile
    */
   tileid: number;
   /**
    * Tile is flipped vertically (default: false)
    */
   vflip: boolean;
}

/**
 * @deprecated
 */
export interface TiledWangColor {
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB)
    */
   color: string;
   /**
    * Name of the Wang color
    */
   name: string;
   /**
    * Probability used when randomizing
    */
   probability: number;
   /**
    * Local ID of tile representing the Wang color
    */
   tile: number;
}

/**
 * @deprecated
 */
export interface TiledGrid {
   /**
    *	orthogonal (default) or isometric
    */
   orientation: 'orthogonal' | 'isometric';
   /**
    * Cell width of tile grid
    */
   width: number;
   /**
    * Cell height of tile grid
    */
   height: number;
}

/**
 * @deprecated
 */
export interface TiledFrame {
   /**
    * Frame duration in milliseconds
    */
   duration: number;
   /**
    * 	Local tile ID representing this frame
    */
   tileid: number;
}

/**
 * @deprecated
 */
export interface TiledMapTerrain {
   name: string;
   /**
    * Local ID of tile representing terrain
    */
   tile: number;
   properties: TiledProperty[];
}

/**
 * @deprecated
 */
export interface TiledPoint {
   x: number;
   y: number;
}
