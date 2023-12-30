import { AffineMatrix, Collider, Animation, Frame, Graphic, Shape, Sprite, SpriteSheet, Vector, vec, AnimationStrategy, ImageSource, BoundingBox } from "excalibur";
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from "./gid-util";
import { TiledTile, TiledTileset, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Ellipse, Polygon, Rectangle, parseObjects } from "./objects";
import { Properties, mapProps } from "./properties";
import { PluginObject } from "./objects";
import { byClassCaseInsensitive, byPropertyCaseInsensitive } from "./filter-util";


export interface TileOptions {
   id: number;
   tileset: Tileset;
   tiledTile: TiledTile;
   image?: ImageSource;
}

/**
 * Friendly plugin representation of tiled Tile
 */
export class Tile implements Properties {
   id: number;
   tileset: Tileset;
   tiledTile: TiledTile;
   class?: string;
   graphic?: Graphic;
   objects: PluginObject[] = [];
   colliders: Collider[] = [];
   animation: { tileid: number, duration: number }[] = [];
   properties = new Map<string, string | number | boolean>()
   constructor(options: TileOptions) {
      const { id, tileset, tiledTile } = options;
      this.id = id;
      this.tileset = tileset;
      this.tiledTile = tiledTile;
      this.class = tiledTile.type;

      mapProps(this, tiledTile.properties);

      if (tiledTile.objectgroup && tiledTile.objectgroup.objects) {
         // templates are not possibel at the moment insed a tile so []
         // text isn't possible at the moment inside a tile so -1
         this.objects = parseObjects(tiledTile.objectgroup, [], -1); 
      }

      if (tiledTile.animation) {
         this.animation = tiledTile.animation;
      }

   }
}

export interface TilesetOptions {
   name: string;
   tiledTileset: TiledTileset;
   firstGid: number;
   image?: ImageSource;
   tileToImage?: Map<TiledTile, ImageSource>;
}

/**
 * Friendly plugin representation of Tiled tilesets
 */
export class Tileset implements Properties {
   // FIXME fill mode
   name: string;
   class?: string;
   firstGid = -1;
   tileCount: number = 0;
   tiledTileset: TiledTileset;
   tileWidth: number = 0;
   tileHeight: number = 0;
   tileOffset: Vector = vec(0, 0);
   spritesheet!: SpriteSheet;
   tiles: Tile[] = [];
   objectalignment: string = 'bottomleft';
   orientation: 'isometric' | 'orthogonal' = 'orthogonal';
   properties = new Map<string, string | number | boolean>();

   horizontalFlipTransform!: AffineMatrix;
   verticalFlipTransform!: AffineMatrix;
   diagonalFlipTransform!: AffineMatrix;

   constructor(options: TilesetOptions) {
      const { name, tiledTileset, image, tileToImage, firstGid } = options;
      this.name = name;
      this.tiledTileset = tiledTileset;
      this.firstGid = firstGid;

      if (isTiledTilesetSingleImage(tiledTileset) && image) {
         mapProps(this, tiledTileset.properties);
         const spacing = tiledTileset.spacing;
         const columns = Math.floor((tiledTileset.imagewidth + spacing) / (tiledTileset.tilewidth + spacing));
         const rows = Math.floor((tiledTileset.imageheight + spacing) / (tiledTileset.tileheight + spacing));
         this.class = tiledTileset.class;
         this.orientation = tiledTileset.grid?.orientation ?? 'orthogonal';
         this.horizontalFlipTransform = AffineMatrix.identity().translate(tiledTileset.tilewidth, 0).scale(-1, 1);
         this.verticalFlipTransform = AffineMatrix.identity().translate(0, tiledTileset.tileheight).scale(1, -1);
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI / 2).scale(-1, 1);
         this.objectalignment = tiledTileset.objectalignment ?? (this.orientation === 'orthogonal' ? 'bottomleft' : 'bottom');
         this.spritesheet =  SpriteSheet.fromImageSource({
            image,
            grid: {
               rows,
               columns,
               spriteWidth: tiledTileset.tilewidth,
               spriteHeight: tiledTileset.tileheight
            },
            spacing: {
               originOffset: {
                  x: tiledTileset.margin ?? 0,
                  y: tiledTileset.margin ?? 0
               },
               margin: {
                  x: tiledTileset.spacing ?? 0,
                  y: tiledTileset.spacing ?? 0
               }
            }
         });
         this.tileCount = tiledTileset.tilecount;
         this.tileWidth = tiledTileset.tilewidth;
         this.tileHeight = tiledTileset.tileheight;
         if (tiledTileset.tileoffset) {
            this.tileOffset = vec(tiledTileset.tileoffset.x, tiledTileset.tileoffset.y);
         }
         for (const tile of tiledTileset.tiles) {
            this.tiles.push(new Tile({
               id: tile.id,
               tileset: this,
               tiledTile: tile
            }))
         }
      }
      if (isTiledTilesetCollectionOfImages(tiledTileset) && tiledTileset.firstgid !== undefined && tileToImage) {
         this.horizontalFlipTransform = AffineMatrix.identity().translate(tiledTileset.tilewidth, 0).scale(-1, 1);
         this.verticalFlipTransform = AffineMatrix.identity().translate(0, tiledTileset.tileheight).scale(1, -1);
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI / 2).scale(-1, 1);
         this.objectalignment = tiledTileset.objectalignment ?? (this.orientation === 'orthogonal' ? 'bottomleft' : 'bottom');
         this.orientation = tiledTileset.grid?.orientation ?? 'orthogonal';
         this.tileCount = tiledTileset.tilecount;
         this.tileWidth = tiledTileset.tilewidth;
         this.tileHeight = tiledTileset.tileheight;
         if (tiledTileset.tileoffset) {
            this.tileOffset = vec(tiledTileset.tileoffset.x, tiledTileset.tileoffset.y);
         }
         let sprites: Sprite[] = []
         for (const tile of tiledTileset.tiles) {
            const image = tileToImage.get(tile);
            if (image) {
               this.tiles.push(new Tile({
                  id: tile.id,
                  tileset: this,
                  tiledTile: tile,
                  image
               }))
               sprites.push(image.toSprite())
            }
         }
         this.spritesheet = new SpriteSheet({ sprites });
      }
   }

   getTilesetAlignmentAnchor(overrideAlignment?: string) {
      // https://doc.mapeditor.org/en/stable/manual/editing-tilesets/#tileset-properties
      switch(overrideAlignment ?? this.objectalignment) {
         case 'topleft' : {
            return vec(0, 0);
         }
         case 'top' : {
            return vec(0.5, 0);
         }
         case 'topright' : {
            return vec(1, 0);
         }
         case 'left' : {
            return vec(0, .5);
         }
         case 'center' : {
            return vec(0.5, 0.5);
         }
         case 'right' : {
            return vec(1, .5);
         }
         case 'bottomleft' : {
            return vec(0, 1);
         }
         case 'bottom' : {
            return vec(0.5, 1);
         }
         case 'bottomright' : {
            return vec(1, 1);
         }
         default: { // default is bottom left
            return vec(0, 1);
         }
      }
   }


   /**
    * Returns any specially configured tiles by gid, Tiled assigns a different id to tiles
    * this helps retrieve tiles by a more common id
    * @param gid
    */
   getTileByGid(gid: number): Tile | undefined {
      const normalizedGid = getCanonicalGid(gid);
      const tileIndex = normalizedGid - this.firstGid;
      const tile = this.tiles.find(t => t.id === tileIndex);
      return tile;
   }

   getTilesByClassName(className: string): Tile[] {
      return this.tiles.filter(byClassCaseInsensitive(className));
   }

   getTilesByProperty(name: string, value?: any): Tile[] {
      return this.tiles.filter(byPropertyCaseInsensitive(name, value));
   }

   getSpriteForGid(gid: number): Sprite {
      const h = isFlippedHorizontally(gid);
      const v = isFlippedVertically(gid);
      const d = isFlippedDiagonally(gid);
      const normalizedGid = getCanonicalGid(gid);
      const spriteIndex = normalizedGid - this.firstGid;
      if (this.spritesheet) {
         let sprite = this.spritesheet.sprites[spriteIndex];
         if (d || h || v) {
            sprite = sprite.clone();
         }
         // See https://github.com/mapeditor/tiled/issues/2119#issuecomment-491533214
         if (d) {
            sprite.rotation = -Math.PI / 2;
            sprite.scale = vec(-1, 1);
         }
         if (h) {
            sprite.scale = vec((d ? 1 : -1) * sprite.scale.x, (d ? -1 : 1) * sprite.scale.y);
         }
         if (v) {
            sprite.scale = vec((d ? -1 : 1) * sprite.scale.x, (d ? 1 : -1) * sprite.scale.y);
         }
         return sprite;
      }
      throw new Error(`Tileset: [${this.name}] Could not find sprite for gid: [${gid}] normalized gid: [${normalizedGid}]`);
   }

   private _isometricTiledCoordToWorld(isoCoord: Vector): Vector {
      // Transformation sourced from:
      // https://discourse.mapeditor.org/t/how-to-get-cartesian-coords-of-objects-from-tileds-isometric-map/4623/3
      const originX = 0;
      const tileWidth = this.tileWidth;
      // This is slightly different in tilesets because the grid aligns with actual image rectangles
      // Tiled Resource DOES not, and aligns with the "logical" height
      const halftileHeight = this.tileHeight / 2; 
      const tileY = isoCoord.y / halftileHeight;
      const tileX = isoCoord.x / halftileHeight;
      return vec(
         (tileX - tileY) * tileWidth / 2 + originX,
         (tileX + tileY) * halftileHeight / 2);
   }

   /**
    * Returns any excalibur colliders setup for a Tile by gid
    * 
    * By default it returns the collider in local coordinates, but sometimes you might need the collider in world coordinates
    *
    * Currently only supports Polygons, Boxes, and Ellipses*
    *
    * - Note: Ellipses can only be circles, the minimum dimension will be used to make a circle.
    * @param gid
    */
   getCollidersForGid(gid: number, options?: { anchor?: Vector, scale?: Vector, orientationOverride?: 'isometric' | 'orthogonal' }): Collider[] {
      let { anchor, scale, orientationOverride } = {
         anchor: Vector.Zero,
         scale: Vector.One,
         orientationOverride: 'orthogonal',
         ...options
      };
      const tile = this.getTileByGid(gid);
      const result: Collider[] = [];
      if (tile && tile.objects) {
         for (let object of tile.objects) {
            if (object instanceof Polygon) {
               // This is the offset into the first point (local space)
               let points = object.points.map(p => p.scale(scale));
               points = this._applyFlipsToPoints(points, gid);
               if (this.orientation === 'isometric' || orientationOverride === 'isometric') {
                  points = points.map(p => this._isometricTiledCoordToWorld(p));
               }
               const poly = Shape.Polygon(points, Vector.Zero, true); // TODO we should triangulate here probably
               result.push(poly);
            }
            if (object instanceof Rectangle) {
               const bb = BoundingBox.fromDimension(
                  object.width * scale.x,
                  object.height * scale.y,
                  anchor);
               let points = bb.getPoints().map(p => p.add(vec(object.x, object.y)));
               if (this.orientation === 'isometric'  || orientationOverride === 'isometric') {
                  points = points.map(p => this._isometricTiledCoordToWorld(p));
               }
               points = this._applyFlipsToPoints(points, gid);
               const box = Shape.Polygon(points);
               result.push(box);
            }
            if (object instanceof Ellipse) {
               // This is the offset into the first point (local space)
               let offsetPoint = vec(object.x, object.y);
               if (this.orientation === 'isometric'  || orientationOverride === 'isometric') {
                  offsetPoint = this._isometricTiledCoordToWorld(offsetPoint);
               }
               const radius = Math.min(object.width / 2, object.height / 2);
               const circle = Shape.Circle(radius, offsetPoint.scale(scale));
               result.push(circle);
            }
         }
      }
      return result;
   }

   /**
    * Transforms points based on any gid transformations
    * @param points
    * @param gid
    */
   private _applyFlipsToPoints(points: Vector[], gid: number): Vector[] {
      const h = isFlippedHorizontally(gid);
      const v = isFlippedVertically(gid);
      const d = isFlippedDiagonally(gid);
      if (d) {
         points = points.map(p => this.diagonalFlipTransform.multiply(p));
      }
      if (h) {
         points = points.map(p => this.horizontalFlipTransform.multiply(p));
      }
      if (v) {
         points = points.map(p => this.verticalFlipTransform.multiply(p));
      }
      return points;
   }

   public getAnimationForGid(gid: number): Animation | null {
      const tile = this.getTileByGid(gid);
      if (tile && tile.animation?.length) {
         let exFrames: Frame[] = [];
         for (let frame of tile.animation) {
            exFrames.push({
               graphic: this.getSpriteForGid(frame.tileid + this.firstGid),
               duration: frame.duration
            });
         }
         return new Animation({
            frames: exFrames,
            strategy: AnimationStrategy.Loop
         });
      }
      return null;
   }
}