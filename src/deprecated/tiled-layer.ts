import { TiledCompression, TiledEncoding } from "./tiled-types";
import { TiledEntity } from "./tiled-entity";
import { RawTiledLayer } from "./raw-tiled-layer";
import { vec, Vector } from "excalibur";

// Most significant byte of 32 bit id contains flags for flipping
// See https://doc.mapeditor.org/en/stable/reference/tmx-map-format/#tile-flipping
export const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
export const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
export const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;

/**
 * Inspects gid for horizontal flag
 * @param gid 
 * @deprecated
 */
export const isFlippedHorizontally = (gid: number): boolean => {
   return !!(gid & FLIPPED_HORIZONTALLY_FLAG);
}

/**
 * Inspects gid for vertical flag
 * @param gid 
 * @deprecated
 */
export const isFlippedVertically = (gid: number): boolean => {
   return !!(gid & FLIPPED_VERTICALLY_FLAG);
}

/**
 * Inspects gid for diagonal flag (anti-diagonal flip enables tile rotation)
 * @param gid 
 * @deprecated
 */
export const isFlippedDiagonally = (gid: number): boolean => {
   return !!(gid & FLIPPED_DIAGONALLY_FLAG);
}


/**
 * Removes bit flags from gid
 * @param gid 
 * @deprecated
 */
export const getCanonicalGid = (gid: number): number => {
   return gid & ~(FLIPPED_HORIZONTALLY_FLAG |
                       FLIPPED_VERTICALLY_FLAG |
                       FLIPPED_DIAGONALLY_FLAG);

}

/**
 * @deprecated
 */
export class TiledLayer extends TiledEntity {
   /**
    * Array of gid's (global Tiled identifiers) that point to a unique tile
    * 
    * Note: the most significant byte may have flipped data encoded making the gid appear like a negative
    * integer.
    * 
    * * Use `getCanonicalGid(gid)` to strip the bit flags from the high order byte
    * * Check flipped flags with:
    *   * `isFlippedDiagonally(gid)`
    *   * `isFlippedVertically(gid)`
    *   * `isFlippedHorizontally(gid)`
    */
   public data!: number[];

   /**
    * Offset of the tile map
    */
   public offset: Vector = Vector.Zero;

   /**
    * Parallax Factor
    */
   public parallaxFactor: Vector | null = null;

   /**
    * Width of layer in tiles
    */
   public width!: number;

   /**
    * Height of layer in tiles
    */
   public height!: number;
   /**
    * Original encoding of the Tiled layer
    */
   public encoding: TiledEncoding = 'csv';
   /**
    * Original compression of the Tiled layer if any
    */
   public compression?: TiledCompression;

   /**
    * Original order of the Tiled layer
    */
   public order!: number;

   /**
    * Reference to the raw tiled layer data
    */
   public rawLayer!: RawTiledLayer;

   public static parse(layer: RawTiledLayer): TiledLayer {
      if (layer.type !== 'tilelayer') throw Error('Cannot parse a non tilelayer type layer');
      const resultLayer = new TiledLayer();
      resultLayer.id = +layer.id;
      resultLayer.name = layer.name;
      resultLayer.data = (layer.data as number[]);
      resultLayer.offset = vec(layer.offsetx ?? 0, layer.offsety ?? 0);
      resultLayer.parallaxFactor = (layer.parallaxx || layer.parallaxy) ? vec(layer.parallaxx ?? 1, layer.parallaxy ?? 1) : null;
      resultLayer.width = layer.width;
      resultLayer.height = layer.height;
      resultLayer.encoding = layer.encoding ?? 'csv';
      resultLayer.compression = layer.compression;
      resultLayer.order = layer.order;
      resultLayer.properties = layer.properties ?? [];
      resultLayer.rawLayer = layer;
      return resultLayer
   }
}