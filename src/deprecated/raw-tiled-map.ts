import { ExcaliburData, TiledProperty } from './tiled-types';
import { RawTiledTileset } from "./raw-tiled-tileset";
import { RawTiledLayer } from "./raw-tiled-layer";

/**
 * Tiled Map Interface
 *
 * Represents the interface for the Tiled exported data structure (JSON). Used
 * when loading resources via Resource loader.
 */

export interface RawTiledMap {
   type: 'map';
   ex: ExcaliburData;
   version: number;

   width: number;
   /**
    * Number of tile rows
    */
   height: number;
   /**
    * Length of the side of a hex tile in pixels (hexagonal maps only)
    */
   hexsidelength: number;
   /**
    * Map grid height
    */
   tileheight: number;
   /**
    * Map grid width
    */
   tilewidth: number;

   /**
    *	Hex-formatted color (#RRGGBB or #AARRGGBB) (optional)
    */
   backgroundcolor?: string;
   /**
    * The compression level to use for tile layer data (defaults to -1, which means to use the algorithm default)
    */
   compressionlevel: number;
   /**
    * Whether the map has infinite dimensions
    */
   infinite: boolean;
   /**
    *	Auto-increments for each layer
    */
   nextlayerid: number;
   /**
    * Auto-increments for each placed object
    */
   nextobjectid: number;

   /**
    * Map orientation (orthogonal, isometric, staggered or hexagonal)
    */
   orientation: 'orthogonal' | 'isometric' | 'staggered' | 'hexagonal';

   layers: RawTiledLayer[];
   properties: TiledProperty[];
   tilesets: RawTiledTileset[];

   /**
    * Render order: right-down (the default), right-up, left-down or left-up (currently only supported for orthogonal maps)
    */
   renderorder: 'right-down' | 'right-up' | 'left-down' | 'left-up';

   /**
    * x or y (staggered / hexagonal maps only)
    */
   staggeraxis: 'x' | 'y';
   /**
    * odd or even (staggered / hexagonal maps only)
    */
   staggerindex: 'odd' | 'even';

   /**
    * The Tiled version used to save the file
    */
   tiledversion: string;

}
