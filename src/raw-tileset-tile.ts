import { RawTiledLayer } from './raw-tiled-layer';
import { TiledFrame, TiledProperty } from './tiled-types';


export interface RawTilesetTile {
   id: number;
   type: string;
   image: {source: string};
   imageheight: number;
   imagewidth: number;
   animation: TiledFrame[];
   properties?: TiledProperty[];
   terrain: number[];
   objectgroup: RawTiledLayer;
   probability: number;
}
