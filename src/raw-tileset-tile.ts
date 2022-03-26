import { RawTiledLayer } from './raw-tiled-layer';
import { TiledFrame, TiledProperty } from './tiled-types';


export interface RawTilesetTile {
   id: number;
   type: string;
   image: string;
   imageheight: number;
   imagewidth: number;
   animation: TiledFrame[];
   properites: TiledProperty[];
   terrain: number[];
   objectgroup: RawTiledLayer;
   probability: number;
}
