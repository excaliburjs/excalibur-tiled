import { AffineMatrix, Circle, Collider, Animation, Frame, Graphic, Shape, Sprite, SpriteSheet, Vector, vec, AnimationStrategy, ImageSource, BoundingBox } from "excalibur";
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from "./gid-util";
import { TiledTile, TiledTileset, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Ellipse, InsertedTile, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";
import { Properties, mapProps } from "./properties";
import { PluginObject } from "./objects";
import { pathRelativeToBase } from "./path-util";


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
   animation: {tileid: number, duration: number}[] = [];
   properties = new Map<string, string | number | boolean>()
   constructor(options: TileOptions) {
      const {id, tileset, tiledTile} = options;
      this.id = id;
      this.tileset = tileset;
      this.tiledTile = tiledTile;
      this.class = tiledTile.type;

      mapProps(this, tiledTile.properties);

      if (tiledTile.objectgroup && tiledTile.objectgroup.objects) {
         this.objects =  parseObjects(tiledTile.objectgroup);
      }

      if (tiledTile.animation) {
         this.animation = tiledTile.animation;
      }

   }
}

export interface TilesetOptions {
   name: string;
   tiledTileset: TiledTileset;
   spritesheet?: SpriteSheet;
   tileToImage?: Map<TiledTile, ImageSource>;
}

/**
 * Friendly plugin representation of Tiled tilesets
 */
export class Tileset implements Properties {
   // TODO object alignment specified in tileset! https://doc.mapeditor.org/en/stable/manual/objects/#insert-tile
   // TODO fill mode
   // TODO orientation
   // TODO grid width/height
   name: string;
   class?: string;
   firstGid = -1;
   tileCount: number = 0;
   tiledTileset: TiledTileset;
   spritesheet!: SpriteSheet;
   tiles: Tile[] = [];
   properties = new Map<string, string | number | boolean>();

   horizontalFlipTransform!: AffineMatrix;
   verticalFlipTransform!: AffineMatrix;
   diagonalFlipTransform!: AffineMatrix;

   constructor(options: TilesetOptions) {
      const { name, tiledTileset, spritesheet, tileToImage } = options;
      this.name = name;
      this.tiledTileset = tiledTileset;
      
      if (isTiledTilesetSingleImage(tiledTileset) && tiledTileset.firstgid !== undefined && spritesheet) {
         mapProps(this, tiledTileset.properties);
         this.class = tiledTileset.class;
         this.horizontalFlipTransform = AffineMatrix.identity().translate(tiledTileset.tilewidth, 0).scale(-1, 1);
         this.verticalFlipTransform = AffineMatrix.identity().translate(0, tiledTileset.tileheight).scale(1, -1);
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI/2).scale(-1, 1);
         this.spritesheet = spritesheet;
         this.firstGid = tiledTileset.firstgid;
         this.tileCount = tiledTileset.tilecount;
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
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI/2).scale(-1, 1);
         this.firstGid = tiledTileset.firstgid!;
         this.tileCount = tiledTileset.tilecount;
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
         this.spritesheet = new SpriteSheet({sprites});
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
   getCollidersForGid(gid: number, options?: { anchor: Vector, scale: Vector}): Collider[] {
      let { anchor, scale } = {
         anchor: Vector.Zero,
         scale: Vector.One,
         ...options
      } ;
      const tile = this.getTileByGid(gid);
      const result: Collider[] = [];
      if (tile && tile.objects) {
         for (let object of tile.objects) {
            if (object instanceof Polygon) {
               // This is the offset into the first point (local space)
               let points = object.points.map(p => p.scale(scale));
               points = this._applyFlipsToPoints(points, gid);
               const poly = Shape.Polygon(points);
               result.push(poly);
            }
            if (object instanceof Rectangle) {
               const bb = BoundingBox.fromDimension(
                  object.width * scale.x,
                  object.height * scale.y,
                  anchor);
               const points = this._applyFlipsToPoints(bb.getPoints(), gid);
               const box = Shape.Polygon(points);
               result.push(box);
            }
            if (object instanceof Circle) {
               // This is the offset into the first point (local space)
               const offset = vec(object.x, object.y);
               const circle = Shape.Circle(
                     Math.min(object.width / 2, object.height / 2),
                          vec(object.width / 2, object.height / 2).add(offset).scale(scale));
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
            // TODO excalibur smarts animation strategy
            strategy: AnimationStrategy.Loop
         });
      }
      return null;
   }

}