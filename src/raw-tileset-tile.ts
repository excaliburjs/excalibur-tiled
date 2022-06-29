import { RawTiledLayer } from './raw-tiled-layer';
import { TiledFrame, TiledProperty } from './tiled-types';


export interface RawTilesetTile {
   id: number;
   /**
    * @deprecated Removed in Tiled 1.9 https://doc.mapeditor.org/en/stable/reference/tmx-changelog/#tiled-1-9
    */
   type: string;
   class: string;
   image: string;
   imageheight: number;
   imagewidth: number;
   animation: TiledFrame[];
   properties?: TiledProperty[];
   terrain: number[];
   objectgroup: RawTiledLayer;
   probability: number;
}
