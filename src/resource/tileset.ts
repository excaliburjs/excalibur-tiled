import { AffineMatrix, Circle, Collider, Animation, Frame, Graphic, Shape, Sprite, SpriteSheet, Vector, vec, AnimationStrategy, ImageSource } from "excalibur";
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from "./gid-util";
import { TiledTile, TiledTileset, isTiledTilesetCollectionOfImages, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Ellipse, InsertedTile, Point, Polygon, Polyline, Rectangle, Text, parseObjects } from "./objects";
import { Properties, mapProps } from "./properties";
import { Object } from "./objects";
import { pathRelativeToBase } from "./path-util";


export interface TileOptions {
   id: number;
   tileset: Tileset;
   tiledTile: TiledTile;
   image?: ImageSource;
}

export class Tile implements Properties {
   id: number;
   tileset: Tileset;
   tiledTile: TiledTile;
   // image?: ImageSource;
   graphic?: Graphic;
   objects: Object[] = [];
   colliders: Collider[] = [];
   animation: {tileid: number, duration: number}[] = [];
   properties = new Map<string, string | number | boolean>()
   constructor(options: TileOptions) {
      const {id, tileset, tiledTile} = options;
      this.id = id;
      this.tileset = tileset;
      this.tiledTile = tiledTile;

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

export class Tileset implements Properties {
   name: string;
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
         this.horizontalFlipTransform = AffineMatrix.identity().translate(tiledTileset.tilewidth, 0).scale(-1, 1);
         this.verticalFlipTransform = AffineMatrix.identity().translate(0, tiledTileset.tileheight).scale(1, -1);
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI/2).scale(-1, 1);
         this.spritesheet = spritesheet;
         this.firstGid = tiledTileset.firstgid;
         this.tileCount = tiledTileset.tilecount;
         // TODO produce tiles
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
      // TODO should we throw here?
      throw new Error(`Tileset: [${this.name}] Could not find sprite for gid: [${gid}] normalized gid: [${normalizedGid}]`);
   }

   /**
    * Returns any excalibur colliders setup for a Tile by gid
    *
    * Currently only supports Polygons, Boxes, and Ellipses*
    *
    * - Note: Ellipses can only be circles, the minimum dimension will be used to make a circle.
    * @param gid
    */
   getCollidersForGid(gid: number): Collider[] {
      const tile = this.getTileByGid(gid);
      const result: Collider[] = [];
      if (tile && tile.objects) {
         for (let object of tile.objects) {
            if (object instanceof Polygon) {
               const poly = Shape.Polygon(this._transformPoints(object.points, gid));
               result.push(poly);
            }
            if (object instanceof Rectangle) {
               const box = Shape.Box(object.width, object.height, Vector.Zero);
               box.points = box.points.map(p => p.add(vec(object.x, object.y)));
               box.points = this._transformPoints(box.points, gid);
               result.push(box);
            }
            if (object instanceof Circle) {
               const circle = Shape.Circle(
                     Math.min(object.width / 2, object.height / 2),
                          vec(object.width / 2, object.height / 2).add(vec(object.x, object.y)));
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
   private _transformPoints(points: Vector[], gid: number): Vector[] {
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