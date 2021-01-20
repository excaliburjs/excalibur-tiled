/**
 * Tiled Map Interface
 *
 * Represents the interface for the Tiled exported data structure (JSON). Used
 * when loading resources via Resource loader.
 */
export interface TiledMap {
   type: 'map';
   ex: Excalibur;
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
   orientation: 'orthoganal' | 'isometric' | 'staggered' | 'hexagonal';

   layers: TiledLayer[];
   properties: TiledProperty[];
   tilesets: TiledTileset[];

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

export interface Excalibur {
   camera?: ExcaliburCamera;
   colliders?: ExcaliburCollider[];
}

export interface ExcaliburCamera {
   x: number;
   y: number;
   zoom: number;
}

export interface ExcaliburCollider {
   type: 'box' | 'circle';
   collisionType: ex.CollisionType;
   color: TiledProperty<string>;
   zIndex: number;
   x: number;
   y: number;
   width: number;
   height: number;
   radius: number;
}
export interface TiledProperty<T = unknown> {
   /**
    * Name of the property
    */
   name: string;
   /**
    * Type of the property (string (default), int, float, bool, color or file (since 0.16, with color and file added in 0.17))
    */
   type: 'string' | 'int' | 'float' | 'bool' | 'color' | 'file';
   /**
    * Value of the property
    */
   value: T;
}

export interface TiledLayer {
   /**
    * Incremental ID - unique across all layers
    */
   id: number;
   /**
    * Image used by this layer. imagelayer only.
    */
   image: string;
   /**
    * Array of unsigned int (GIDs) or base64-encoded data. tilelayer only.
    */
   data: number[] | string;
   /**
    * 	Array of chunks (optional). tilelayer only.
    */
   chunks: TiledChunk[];
   /**
    * Column count. Same as map width for fixed-size maps.
    */
   width: number;
   /**
    * Row count. Same as map height for fixed-size maps.
    */
   height: number;
   /**
    * Name assigned to this layer
    */
   name: string;
   /**
    * From [0, 1]
    */
   opacity: number;
   properties: TiledProperty[];
   /**
    * csv (default) or base64. tilelayer only.
    */
   encoding: 'csv' | 'base64' | 'tilelayer';
   /**
    * zlib, gzip, zstd (since Tiled 1.3) or empty (default). tilelayer only.
    */
   compression?: 'zlib' | 'gzip' | 'zstd';

   /**
    * Type of layer (tilelayer, objectgroup)
    */
   type: 'tilelayer' | 'objectgroup' | 'imagelayer' | 'group';
   /**
    * Whether layer is shown or hidden in editor
    */
   visible: boolean;

   /**
    * Horizontal layer offset in tiles. Always 0.
    */
   x: number;
   /**
    * Vertical layer offset in tiles. Always 0.
    */
   y: number;
   /**
    * Horizontal layer offset in pixels (default: 0)
    */
   offsetx: number;
   /**
    * Vertical layer offset in pixels (default: 0)
    */
   offsety: number;
   /**
    * X coordinate where layer content starts (for infinite maps)
    */
   startx: number;
   /**
    * Y coordinate where layer content starts (for infinite maps)
    */
   starty: number;

   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB) that is multiplied with any graphics drawn by this layer or any child layers (optional).
    */
   tintcolor: string;
   /**
    * Hex-formatted color (#RRGGBB) (optional). imagelayer only.
    */
   transparentcolor: string;

   /**
    * topdown (default) or index. objectgroup only.
    */
   draworder: 'topdown' | 'index' | 'objectgroup';
   /**
    * Array of objects. objectgroup only.
    */
   objects: TiledObject[];
}

export interface TiledChunk {
   /**
    * Array of unsigned int (GIDs) or base64-encoded data
    */
   data: number[] | string;
   /**
    * Height in tiles
    */
   height: number;
   /**
    * Width in tiles
    */
   width: number;
   /**
    * X coordinate in tiles
    */
   x: number;
   /**
    * Y coordinate in tiles
    */
   y: number;
}

export interface TiledObject {
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
   text: TiledText;

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

export interface TiledText {
   text: string;
   /**
    * Whether to use a bold font (default: false)
    */
   bold: boolean;
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB) (default: #000000)
    */
   color: string;
   /**
    * Font family (default: sans-serif)
    */
   fontfamily: string;
   /**
    * Horizontal alignment (center, right, justify or left (default))
    */
   halign: 'center' | 'right' | 'justify' | 'left';
   /**
    * Whether to use an italic font (default: false)
    */
   italic: boolean;
   /**
    * Whether to use kerning when placing characters (default: true)
    */
   kerning: boolean;
   /**
    * Pixel size of font (default: 16)
    */
   pixelsize: number;
   /**
    * Whether to strike out the text (default: false)
    */
   strikeout: boolean;
   /**
    * Whether to underline the text (default: false)
    */
   underline: boolean;
   /**
    * Vertical alignment (center, bottom or top (default))
    */
   valign: 'center' | 'bottom' | 'top';
   /**
    * Whether the text is wrapped within the object bounds (default: false)
    */
   wrap: boolean;
}

export interface TiledTileset {
   type: 'tileset';
   /**
    * The JSON format version
    */
   version: number;

   /**
    * GID corresponding to the first tile in the set
    */
   firstgid: number;
   /**
    * Image used for tiles in this set
    */
   image: string;
   /**
    * Excalibur texture associated with this tileset
    */
   imageTexture: ex.Texture;
   /**
    * Height of source image in pixels
    */
   imageheight: number;
   /**
    * Width of source image in pixels
    */
   imagewidth: number;
   /**
    * (optional)
    */
   grid: TiledGrid;
   /**
    * Buffer between image edge and first tile (pixels)
    */
   margin: number;
   /**
    * Alignment to use for tile objects (unspecified (default), topleft, top, topright, left, center, right, bottomleft, bottom or bottomright) (since 1.4)
    */
   objectalignment: 'unspecified' | 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
   /**
    * Refers to external tileset file (should be JSON)
    */
   source: string;
   /**
    * Spacing between adjacent tiles in image (pixels)
    */
   spacing: number;

   columns: number;
   rows: number;
   /**
    * Maximum height of tiles in this set
    */
   tileheight: number;
   tilewidth: number;

   /**
    * Array of Tiles (optional)
    */
   tiles: TiledTile[];

   name: string;
   properties: TiledProperty[];
   /**
    * The number of tiles in this tileset
    */
   tilecount: number;
   /**
    * Optional
    */
   tileoffset: TiledTileOffset;

   /**
    * The Tiled version used to save the file
    */
   tiledversion: string;
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB) (optional)
    */
   backgroundcolor: string;
   /**
    * Hex-formatted color (#RRGGBB) (optional)
    */
   transparentcolor: string;
   /**
    * Array of Terrains (optional)
    */
   terrains: TiledMapTerrain[];

   /**
    * Array of Wang sets (since 1.1.5)
    */
   wangsets: TiledWangSet[]
}

export interface TiledTileOffset {
   /**
    * Horizontal offset in pixels
    */
   x: number;
   /**
    * Vertical offset in pixels (positive is down)
    */
   y: number;
}

export interface TiledWangSet {
   /**
    * Array of Wang colors
    */
   cornercolors: TiledWangColor[];
   /**
    * Array of Wang colors
    */
   edgecolors: TiledWangColor[];
   name: string;
   properties: TiledProperty[];
   /**
    * Local ID of tile representing the Wang set
    */
   tile: number;
   wangtiles: TiledWangTile[];
}

export interface TiledWangTile {
   /**
    * Array of Wang color indexes (uchar[8]
    */
   wangid: number[];
   /**
    * Tile is flipped diagonally (default: false)
    */
   dflip: boolean;
   /**
    * Tile is flipped horizontally (default: false)
    */
   hflip: boolean;
   /**
    * Local ID of tile
    */
   tileid: number;
   /**
    * Tile is flipped vertically (default: false)
    */
   vflip: boolean;
}

export interface TiledWangColor {
   /**
    * Hex-formatted color (#RRGGBB or #AARRGGBB)
    */
   color: string;
   /**
    * Name of the Wang color
    */
   name: string;
   /**
    * Probability used when randomizing
    */
   probability: number;
   /**
    * Local ID of tile representing the Wang color
    */
   tile: number;
}

export interface TiledGrid {
   /**
    *	orthogonal (default) or isometric
    */
   orientation: 'orthogonal' | 'isometric';
   /**
    * Cell width of tile grid
    */
   width: number;
   /**
    * Cell height of tile grid
    */
   height: number;
}

export interface TiledTile {
   id: number;
   type: string;
   image: string;
   imageheight: number;
   imagewidth: number;
   animation: TiledFrame[];
   properites: TiledProperty[];
   terrain: number[];
   objectgroup: TiledLayer;
   probability: number;
}



export interface TiledFrame {
   /**
    * Frame duration in milliseconds
    */
   duration: number;
   /**
    * 	Local tile ID representing this frame
    */
   tileid: number;
}
export interface TiledMapTerrain {
   name: string;
   /**
    * Local ID of tile representing terrain
    */
   tile: number;
   properties: TiledProperty[];
}

export interface TiledPoint {
   x: number;
   y: number;
}
