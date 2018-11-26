import { Resource, Promise, TileMap } from 'excalibur';
import { ITiledMap, ITiledTileSet } from './ITiledMap';
export declare enum TiledMapFormat {
    /**
     * TMX map layer format
     * @unsupported
     */
    TMX = 0,
    /**
     * JSON map layer format
     */
    JSON = 1,
}
export declare class TiledResource extends Resource<ITiledMap> {
    protected mapFormat: TiledMapFormat;
    imagePathAccessor: (path: string, ts: ITiledTileSet) => string;
    externalTilesetPathAccessor: (path: string, ts: ITiledTileSet) => string;
    constructor(path: string, mapFormat?: TiledMapFormat);
    load(): Promise<ITiledMap>;
    processData(data: ITiledMap): ITiledMap;
    getTilesetForTile(gid: number): ITiledTileSet;
    getTileMap(): TileMap;
}
