import { AffineMatrix, Circle, Collider, Animation, Frame, Graphic, Shape, Sprite, SpriteSheet, Vector, vec, AnimationStrategy } from "excalibur";
import { getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically } from "./gid-util";
import { TiledTile, TiledTileset, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Ellipse, InsertedTile, Point, Polygon, Polyline, Rectangle, Text } from "./objects";
import { Properties, mapProps } from "./properties";
import { Object } from "./objects";


export interface TileOptions {
   id: number;
   tileset: Tileset;
   tiledTile: TiledTile;
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
         for (const object of tiledTile.objectgroup.objects) {
            let newObject: Object;
            if (object.point) {
               // Template objects don't have an id for some reason
               newObject = new Point(object.id ?? -1, object.x, object.y);
            } else if (object.ellipse) {
               newObject = new Ellipse(object.id ?? -1, object.x, object.y, object.width ?? 0, object.height ?? 0);
            } else if (object.polygon) {
               newObject =  new Polygon(object.id ?? -1, object.x, object.y, object.polygon);
            } else if (object.polyline) {
               newObject = new Polyline(object.id ?? -1, object.x, object.y, object.polyline);
            } else if(object.text) {
               newObject = new Text(object.id ?? -1, object.x, object.y, object.text, object.width ?? 0);
            } else if (object.gid) {
               newObject = new InsertedTile(object.id ?? -1, object.x, object.y, object.gid,  object.width ?? 0, object.height ?? 0);
            } else { // rectangle
               newObject = new Rectangle(object.id ?? -1, object.x, object.y, object.width ?? 0, object.height ?? 0);
            }
            mapProps(newObject, object.properties);
            this.objects.push(newObject);
         }
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
   sprites?: Sprite[];
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
      const { name, tiledTileset, spritesheet, sprites } = options;
      this.name = name;
      this.tiledTileset = tiledTileset;

      
      if (isTiledTilesetSingleImage(tiledTileset) && tiledTileset.firstgid !== undefined && spritesheet) {
         mapProps(this, tiledTileset.properties);
         this.horizontalFlipTransform = AffineMatrix.identity().translate(tiledTileset.tilewidth, 0).scale(-1, 1);
         this.verticalFlipTransform = AffineMatrix.identity().translate(0, tiledTileset.tileheight).scale(1, -1);
         this.diagonalFlipTransform = AffineMatrix.identity().translate(0, 0).rotate(-Math.PI/2).scale(-1, 1);
         this.spritesheet = spritesheet;
         this.firstGid = tiledTileset.firstgid;
         this.tileCount = tiledTileset.tileheight;
         // TODO produce tiles
         for (const tile of tiledTileset.tiles) {
            this.tiles.push(new Tile({
               id: tile.id,
               tileset: this,
               tiledTile: tile
            }))
         }
      } else {
         // TODO collection of images
         // They SHOULD have a firstGid
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
      if (tile && tile.animation) {
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
         return null;
      }
      return null;
   }

}