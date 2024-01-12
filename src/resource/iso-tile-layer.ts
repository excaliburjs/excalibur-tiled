import { Color, ParallaxComponent, Vector, vec, GraphicsComponent, Logger, AnimationStrategy, IsometricMap, PolygonCollider, CircleCollider, IsometricTile, IsometricEntityComponent } from "excalibur";
import { mapProps } from "./properties";
import { TiledTileLayer, isCSV, isInfiniteLayer, needsDecoding } from "../parser/tiled-parser";
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

   // TODO implement the same methods as Tile Layer maybe add an interface? or a base type?

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

   private updateTile(tile: IsometricTile, gid: number, hasTint: boolean, tint: Color, isSolidLayer: boolean) {
      if (this.resource.useExcaliburWiring && isSolidLayer) {
         tile.solid = true;
      }

      const iso = tile.get(IsometricEntityComponent);
      if (iso) {
         iso.elevation = this.order;
      }

      const tileset = this.resource.getTilesetForTileGid(gid);
      let sprite = tileset.getSpriteForGid(gid);
      if (hasTint) {
         sprite = sprite.clone();
         sprite.tint = tint;
      }
      tile.addGraphic(sprite, { offset: tileset.tileOffset });

      let offset = tile.pos;
      if (tileset.orientation === 'orthogonal') {
         // Odd rendering case when mixing/matching iso maps with orthogonal tilesets
         offset = vec(0, 0);
      } else {
         const halfWidth = this.resource.map.tilewidth / 2;
         const height = this.resource.map.tileheight;
         offset = vec(halfWidth, height);
      }

      // the whole tilemap uses a giant composite collider relative to the Tilemap
      // not individual tiles
      const colliders = tileset.getCollidersForGid(gid, {offset});
      for (let collider of colliders) {
         tile.addCollider(collider);
      }

      let animation = tileset.getAnimationForGid(gid);
      if (animation) {
         if (hasTint) {
            animation = animation.clone();
            animation.tint = tint;
         }
         tile.clearGraphics();
         tile.addGraphic(animation, { offset: tileset.tileOffset });
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

   async load(): Promise<void> {
      const layer = this.tiledTileLayer;
      const isSolidLayer = !!this.properties.get(ExcaliburTiledProperties.Layer.Solid);
      const opacity = this.tiledTileLayer.opacity;
      const hasTint = !!this.tiledTileLayer.tintcolor;
      const tint = this.tiledTileLayer.tintcolor ? Color.fromHex(this.tiledTileLayer.tintcolor) : Color.Transparent;
      const pos = vec(layer.offsetx ?? 0, layer.offsety ?? 0);
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
      


      if (this.resource.map.infinite && isInfiniteLayer(this.tiledTileLayer)) {
         const start = this.resource.isometricTiledCoordToWorld(this.tiledTileLayer.startx, this.tiledTileLayer.starty);
         const infiniteStartPos = vec(
            start.x * this.resource.map.tilewidth,
            start.y * this.resource.map.tileheight);
         this.isometricMap = new IsometricMap({
            name: this.name,
            pos: pos.add(infiniteStartPos),
            tileHeight: this.resource.map.tileheight,
            tileWidth: this.resource.map.tilewidth,
            columns: layer.width,
            rows: layer.height,
            elevation: order
         });
      } else {
         this.isometricMap = new IsometricMap({
            name: this.name,
            pos,
            tileWidth: this.resource.map.tilewidth,
            tileHeight: this.resource.map.tileheight,
            columns: layer.width,
            rows: layer.height,
            elevation: order
         });
      }

      // TODO make these optional params in the ctor
      this.isometricMap.visible = this.tiledTileLayer.visible;
      this.isometricMap.opacity = this.tiledTileLayer.opacity;
      this.isometricMap.addComponent(new TiledLayerDataComponent({ tiledTileLayer: layer }));
      if (layer.parallaxx || layer.parallaxy) {
         const factor = vec(layer.parallaxx ?? 1, layer.parallaxy ?? 1);
         this.isometricMap.addComponent(new ParallaxComponent(factor));
      }

      if (this.resource.map.infinite && isInfiniteLayer(this.tiledTileLayer)) {
         for (let chunk of this.tiledTileLayer.chunks) {
            for (let i = 0; i < chunk.data.length; i++) {
               const gid = chunk.data[i];
               if (gid != 0) {
                  // Map from chunk to big tile map
                  const tileX = (i % chunk.width) + (chunk.x - this.tiledTileLayer.startx);
                  const tileY = Math.floor(i / chunk.width) + (chunk.y - this.tiledTileLayer.starty);
                  const tile = this.isometricMap.tiles[tileX + tileY * layer.width];
                  this.updateTile(tile, gid, hasTint, tint, isSolidLayer);
               }
            }
         }
      } else {
         // Read tiled data into Excalibur's tilemap type
         for (let i = 0; i < this.data.length; i++) {
            let gid = this.data[i];
            if (gid !== 0) {
               const tile = this.isometricMap.tiles[i];
               this.updateTile(tile, gid, hasTint, tint, isSolidLayer);
            }
         }
      }
   }
}
