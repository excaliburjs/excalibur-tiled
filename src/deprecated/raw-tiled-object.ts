import { RawTiledText } from './raw-tiled-text';
import { TiledProperty, TiledPoint } from './tiled-types';

/**
 * @deprecated
 */
export interface RawTiledObject {
   id: number;

   /**
    * Tile object id
    */
   gid: number;
   /**
    * Used to mark an object as a point
    */
   point: boolean;
   height: number;
   name: string;
   properties: TiledProperty[];
   /**
    * Angle in degrees clockwise
    */
   rotation: number;
   type: string;
   class: string;
   visible: boolean;
   width: number;
   /**
    * X coordinate in pixels
    */
   x: number;
   /**
    * Y coordinate in pixels
    */
   y: number;

   /**
    * Reference to a template file, in case object is a template instance
    */
   template: string;

   /**
    *	Only used for text objects
    */
   text: RawTiledText;

   /**
    * Whether or not object is an ellipse
    */
   ellipse: boolean;

   /**
    * Polygon points
    */
   polygon: TiledPoint[];

   /**
    * Polyline points
    */
   polyline: TiledPoint[];
}
