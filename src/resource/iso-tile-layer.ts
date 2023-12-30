import { Color, ParallaxComponent, Vector, vec, GraphicsComponent, Logger, AnimationStrategy, IsometricMap, PolygonCollider, CircleCollider, IsometricTile } from "excalibur";
import { mapProps } from "./properties";
import { TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { TiledResource } from "./tiled-resource";
import { getCanonicalGid } from "./gid-util";
import { ExcaliburTiledProperties } from "./excalibur-properties";
import { TiledLayerDataComponent } from "./tiled-layer-component";
import { Layer } from "./layer";
import { Tile } from "./tileset";

export interface IsometricTileInfo {
   /**
    * Tiled based information for the tile
    */
   tiledTile?: Tile;
   /**
    * Excalibur tile abstraction
    */
   exTile: IsometricTile;
}

export class IsoTileLayer implements Layer {
   private logger = Logger.getInstance();
   public readonly name: string;
   class?: string | undefined;
   /**
    * Number of tiles wide
    */
   public readonly width: number = 0;
   /**
    * Number of tiles high
    */
   public readonly height: number = 0;

   properties = new Map<string, string | number | boolean>();

   /**
    * Original list of gids for this layer from tiled
    */
   data: number[] = [];

   /**
    * Excalibur IsometricMap structure for drawing in excalibur
    */
   isometricMap!: IsometricMap;
   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource, public readonly order: number) {
      this.name = tiledTileLayer.name;
      this.class = tiledTileLayer.class;
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.height;
      mapProps(this, tiledTileLayer.properties);
   }

   getTileByPoint(worldPos: Vector): IsometricTileInfo | null {
      if (!this.isometricMap) {
         this.logger.warn('IsometricMap has not yet been loaded! getTileByPoint() will only return null');
         return null;
      }
      if (this.isometricMap) {
         const exTile = this.isometricMap.getTileByPoint(worldPos);
         if (!exTile) return null;
         const tileIndex = this.isometricMap.tiles.indexOf(exTile);
         const gid = getCanonicalGid(this.data[tileIndex]);

         if (gid <= 0) {
            return null;
         }

         const tileset = this.resource.getTilesetForTileGid(gid);
         const tiledTile = tileset.getTileByGid(gid);

         return { tiledTile, exTile };
      }
      return null;
   }

   async load(): Promise<void> {
      const opacity = this.tiledTileLayer.opacity;
      const hasTint = !!this.tiledTileLayer.tintcolor;
      const tint = this.tiledTileLayer.tintcolor ? Color.fromHex(this.tiledTileLayer.tintcolor) : Color.Transparent;
      if (needsDecoding(this.tiledTileLayer)) {
         this.data = await Decoder.decode(this.tiledTileLayer.data, this.tiledTileLayer.compression);
      } else if (isCSV(this.tiledTileLayer)) {
         this.data = this.tiledTileLayer.data;
      }

      let order = this.order;
      let zoverride = this.properties.get(ExcaliburTiledProperties.ZIndex.ZIndex) as number | undefined;
      if (typeof zoverride === 'number') {
         order = zoverride;
      }

      const layer = this.tiledTileLayer;
      this.isometricMap = new IsometricMap({
         name: this.name,
         pos: vec(layer.offsetx ?? 0, layer.offsety ?? 0),
         tileWidth: this.resource.map.tilewidth,
         tileHeight: this.resource.map.tileheight,
         columns: layer.width,
         rows: layer.height,
         elevation: order
      });

      this.isometricMap.addComponent(new TiledLayerDataComponent({ tiledTileLayer: layer }));
      const graphics = this.isometricMap.get(GraphicsComponent);
      if (graphics) {
         graphics.visible = this.tiledTileLayer.visible;
         graphics.opacity = opacity;
      }
      if (layer.parallaxx || layer.parallaxy) {
         const factor = vec(layer.parallaxx ?? 1, layer.parallaxy ?? 1);
         this.isometricMap.addComponent(new ParallaxComponent(factor));
      }

      const isSolidLayer = !!this.properties.get(ExcaliburTiledProperties.Layer.Solid);

      // Read tiled data into Excalibur's tilemap type
      for (let i = 0; i < this.data.length; i++) {
         let gid = this.data[i];
         if (gid !== 0) {
            const tile = this.isometricMap.tiles[i];
            if (this.resource.useExcaliburWiring && isSolidLayer) {
               tile.solid = true;
            }

            const tileset = this.resource.getTilesetForTileGid(gid);
            let sprite = tileset.getSpriteForGid(gid);
            if (hasTint) {
               sprite = sprite.clone();
               sprite.tint = tint;
            }
            tile.addGraphic(sprite);


            // the whole tilemap uses a giant composite collider relative to the Tilemap
            // not individual tiles
            const colliders = tileset.getCollidersForGid(gid);
            const halfWidth = this.resource.map.tilewidth / 2;
            const height = this.resource.map.tileheight;
            for (let collider of colliders) {
               if (collider instanceof PolygonCollider) {
                  if (tileset.orientation === 'orthogonal') {
                     // Odd rendering case when mixing/matching iso maps with orthogonal tilesets
                     collider.points = collider.points.map(p => p.add(tile.pos).sub(vec(halfWidth, height)));
                     collider = collider.triangulate();
                  } else {
                     collider.points = collider.points.map(p => p.add(tile.pos));
                  }
               }

               if (collider instanceof CircleCollider) {
                  if (tileset.orientation === 'orthogonal') {
                     // Odd rendering case when mixing/matching iso maps with orthogonal tilesets
                     collider.offset = collider.worldPos.sub(vec(halfWidth, height));
                  } else {
                     collider.offset = collider.worldPos.add(tile.pos);
                  }
               }
               tile.addCollider(collider);
            }

            let animation = tileset.getAnimationForGid(gid);
            if (animation) {
               if (hasTint) {
                  animation = animation.clone();
                  animation.tint = tint;
               }
               tile.clearGraphics();
               tile.addGraphic(animation);
               if (this.resource.useExcaliburWiring) {
                  const tileObj = tileset.getTileByGid(gid);
                  const strategy = tileObj?.properties.get(ExcaliburTiledProperties.Animation.Strategy);
                  if (strategy && typeof strategy === 'string') {
                     switch (strategy.toLowerCase()) {
                        case AnimationStrategy.End.toLowerCase(): {
                           animation.strategy = AnimationStrategy.End;
                           break;
                        }
                        case AnimationStrategy.Freeze.toLowerCase(): {
                           animation.strategy = AnimationStrategy.Freeze;
                           break;
                        }
                        case AnimationStrategy.Loop.toLowerCase(): {
                           animation.strategy = AnimationStrategy.Loop;
                           break;
                        }
                        case AnimationStrategy.PingPong.toLowerCase(): {
                           animation.strategy = AnimationStrategy.PingPong;
                           break;
                        }
                        default: {
                           // unknown animation strategy
                           this.logger.warn(`Unknown animation strategy in tileset ${tileset.name} on tile gid ${gid}: ${strategy}`);
                           break;
                        }
                     }
                  }
               }
            }
         }
      }
   }
}
