import { TiledCompression, TiledEncoding } from "./Tiled";
import { TiledEntity } from "./tiled-entity";

export class TiledLayer extends TiledEntity {
   public id: number;
   public data: number[] | string;
   public encoding: TiledEncoding;
   public compression: TiledCompression;
}