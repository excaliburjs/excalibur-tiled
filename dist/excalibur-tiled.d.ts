/// <reference path="../bower_components/excalibur/dist/excalibur.d.ts" />
declare namespace Extensions.Tiled {
    /**
     * Tiled Map Interface
     *
     * Represents the interface for the Tiled exported data structure (JSON). Used
     * when loading resources via Resource loader.
     */
    interface ITiledMap {
        width: number;
        height: number;
        layers: ITiledMapLayer[];
        nextobjectid: number;
        /**
         * Map orientation (orthogonal)
         */
        orientation: string;
        properties: {
            [key: string]: string;
        };
        /**
         * Render order (right-down)
         */
        renderorder: string;
        tileheight: number;
        tilewidth: number;
        tilesets: ITiledTileSet[];
        version: number;
    }
    interface ITiledMapLayer {
        data: number[] | string;
        height: number;
        name: string;
        opacity: number;
        properties: {
            [key: string]: string;
        };
        encoding: string;
        /**
         * Type of layer (tilelayer, objectgroup)
         */
        type: string;
        visible: boolean;
        width: number;
        x: number;
        y: number;
        /**
         * Draw order (topdown (default), index)
         */
        draworder: string;
        objects: ITiledMapObject[];
    }
    interface ITiledMapObject {
        id: number;
        /**
         * Tile object id
         */
        gid: number;
        height: number;
        name: string;
        properties: {
            [key: string]: string;
        };
        rotation: number;
        type: string;
        visible: boolean;
        width: number;
        x: number;
        y: number;
        /**
         * Whether or not object is an ellipse
         */
        ellipse: boolean;
        /**
         * Polygon points
         */
        polygon: {
            x: number;
            y: number;
        }[];
        /**
         * Polyline points
         */
        polyline: {
            x: number;
            y: number;
        }[];
    }
    interface ITiledTileSet {
        firstgid: number;
        image: string;
        /**
         * Excalibur texture associated with this tileset
         */
        imageTexture: ex.Texture;
        imageheight: number;
        imagewidth: number;
        margin: number;
        name: string;
        properties: {
            [key: string]: string;
        };
        spacing: number;
        tilecount: number;
        tileheight: number;
        tilewidth: number;
        transparentcolor: string;
        terrains: ITiledMapTerrain[];
        tiles: {
            [key: string]: {
                terrain: number[];
            };
        };
    }
    interface ITiledMapTerrain {
        name: string;
        tile: number;
    }
}
declare namespace Extensions.Tiled {
    enum TiledMapFormat {
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
    class TiledResource extends ex.Resource<ITiledMap> {
        protected mapFormat: TiledMapFormat;
        imagePathAccessor: (string, ITiledTileSet) => string;
        constructor(path: string, mapFormat?: TiledMapFormat);
        load(): ex.Promise<ITiledMap>;
        processData(data: any): ITiledMap;
        getTilesetForTile(gid: number): ITiledTileSet;
        getTileMap(): ex.TileMap;
    }
}
/**
 * Tiled extension for Excalibur.js
 *
 * Adds Tiled map integration to Excalibur.js and allows easy
 * loading of maps and entities using simple mapping rules
 * and hooks into Excalibur TileMap generation.
 */
declare namespace Extensions.Tiled {
}
