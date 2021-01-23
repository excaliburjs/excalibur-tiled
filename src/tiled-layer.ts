import { TiledCompression, TiledEncoding } from "./tiled-types";
import { TiledEntity } from "./tiled-entity";

export class TiledLayer extends TiledEntity {
   public data!: number[] | string;
   public encoding: TiledEncoding = 'csv';
   public compression?: TiledCompression;
}