import { Resource, Promise, TileMap } from 'excalibur';
import { TiledMap, TiledTileset } from './Tiled';
export declare enum TiledMapFormat {
    /**
     * TMX map layer format
     * @unsupported
     */
    TMX = 0,
    /**
     * JSON map layer format
     */
    JSON = 1
}
export declare class TiledResource extends Resource<TiledMap> {
    protected mapFormat: TiledMapFormat;
    imagePathAccessor: (path: string, ts: TiledTileset) => string;
    externalTilesetPathAccessor: (path: string, ts: TiledTileset) => string;
    constructor(path: string, mapFormat?: TiledMapFormat);
    load(): Promise<TiledMap>;
    processData(data: TiledMap): TiledMap;
    getTilesetForTile(gid: number): TiledTileset;
    getTileMap(): TileMap;
    private _parseTmx;
}
