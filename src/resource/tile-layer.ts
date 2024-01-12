import { Color, ParallaxComponent, TileMap, Vector, vec, GraphicsComponent, Logger, AnimationStrategy, TransformComponent, Tile as ExTile } from "excalibur";
import { mapProps } from "./properties";
import { TiledTileLayer, isCSV, isInfiniteLayer, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { TiledResource } from "./tiled-resource";
import { getCanonicalGid } from "./gid-util";
import { ExcaliburTiledProperties } from "./excalibur-properties";
import { TiledLayerDataComponent } from "./tiled-layer-component";
import { Layer } from "./layer";
import { Tile } from "./tileset";
import { byClassCaseInsensitive, byPropertyCaseInsensitive } from "./filter-util";

/**
 * Tile information for both excalibur and tiled tile representations
 */
export interface TileInfo {
   /**
    * Tiled based information for the tile
    */
   tiledTile?: Tile;
   /**
    * Excalibur tile abstraction
    */
   exTile: ExTile;
}

export class TileLayer implements Layer {
   private logger = Logger.getInstance();
   public readonly name: string;
   public readonly class?: string;
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
    * Excalibur TileMap structure for drawing in excalibur
    */
   tilemap!: TileMap;

   private _gidToTileInfo = new Map<number, TileInfo[]>();

   /**
    * Returns the excalibur tiles that match a tiled gid
    */
   getTilesByGid(gid: number): TileInfo[] {
      return this._gidToTileInfo.get(gid) ?? [];
   }

   /**
    * Returns the excalibur tiles that match a tiled class name
    * @param className
    */
   getTilesByClassName(className: string): TileInfo[] {
      const tiles = this.tilemap.tiles.filter(t => {
         const maybeTiled = t.data.get(ExcaliburTiledProperties.TileData.Tiled) as Tile | undefined;
         if (maybeTiled) {
            return byClassCaseInsensitive(className)(maybeTiled);
         }
         return false;
      });

      return tiles.map(t => ({
         exTile: t,
         tiledTile: t.data.get(ExcaliburTiledProperties.TileData.Tiled)
      }))
   }

   /**
    * Returns the excalibur tiles that match a tiled property and optional value
    * @param name
    * @param value
    */
   getTilesByProperty(name: string, value?: any): TileInfo[] {
      const tiles = this.tilemap.tiles.filter(t => {
         const maybeTiled = t.data.get(ExcaliburTiledProperties.TileData.Tiled) as Tile | undefined;
         if (maybeTiled) {
            return byPropertyCaseInsensitive(name, value)(maybeTiled);
         }
         return false;
      });

      return tiles.map(t => ({
         exTile: t,
         tiledTile: t.data.get(ExcaliburTiledProperties.TileData.Tiled)
      }))
   }

   getTileByPoint(worldPos: Vector): TileInfo | null {
      if (!this.tilemap) {
         this.logger.warn('Tilemap has not yet been loaded! getTileByPoint() will only return null');
         return null;
      }
      if (this.tilemap) {
         const exTile = this.tilemap.getTileByPoint(worldPos);
         if (!exTile) return null;
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
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

   getTileByCoordinate(x: number, y: number): TileInfo | null {
      if (!this.tilemap) {
         this.logger.warn('Tilemap has not yet been loaded! getTileByCoordinate() will only return null');
         return null;
      }
      if (this.tilemap) {
         const exTile = this.tilemap.getTile(x, y);
         const tileIndex = this.tilemap.tiles.indexOf(exTile);
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

   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource, public readonly order: number) {
      this.name = tiledTileLayer.name;
      this.class = tiledTileLayer.class;
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.height;
      mapProps(this, tiledTileLayer.properties);
   }

   private _recordTileData(gid: number, tile: ExTile) {
      let tiles: TileInfo[] | undefined = this._gidToTileInfo.get(gid);
      let tileset = this.resource.getTilesetForTileGid(gid);
      let maybeTile = tileset.getTileByGid(gid);
      if (!tiles) {
         tiles = [{exTile: tile, tiledTile: maybeTile}];
      } else {
         tiles.push({exTile: tile, tiledTile: maybeTile});
      }
      this._gidToTileInfo.set(gid, tiles);
      tile.data.set(ExcaliburTiledProperties.TileData.Tiled, maybeTile);
   }

   private updateTile(tile: ExTile, gid: number, hasTint: boolean, tint: Color, isSolidLayer: boolean) {
      this._recordTileData(gid, tile);
      if (this.resource.useExcaliburWiring && isSolidLayer) {
         tile.solid = true;
      }

      const tileset = this.resource.getTilesetForTileGid(gid);
      let sprite = tileset.getSpriteForGid(gid);
      if (hasTint) {
         sprite = sprite.clone();
         sprite.tint = tint;
      }
      tile.addGraphic(sprite, { offset: tileset.tileOffset });

      // the whole tilemap uses a giant composite collider relative to the Tilemap
      // not individual tiles
      const colliders = tileset.getCollidersForGid(gid);
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

   async load() {
      const opacity = this.tiledTileLayer.opacity;
      const hasTint = !!this.tiledTileLayer.tintcolor;
      const tint = this.tiledTileLayer.tintcolor ? Color.fromHex(this.tiledTileLayer.tintcolor) : Color.Transparent;
      const isSolidLayer = !!this.properties.get(ExcaliburTiledProperties.Layer.Solid);
      const layer = this.tiledTileLayer;
      const pos = vec(layer.offsetx ?? 0, layer.offsety ?? 0);
      if (needsDecoding(this.tiledTileLayer)) {
         this.data = await Decoder.decode(this.tiledTileLayer.data, this.tiledTileLayer.compression);
      } else if (isCSV(this.tiledTileLayer)) {
         this.data = this.tiledTileLayer.data;
      }

      // Create tilemap infinite or not
      if (this.resource.map.infinite && isInfiniteLayer(this.tiledTileLayer)) {
         const infiniteStartPos = vec(
            this.tiledTileLayer.startx * this.resource.map.tilewidth,
            this.tiledTileLayer.starty * this.resource.map.tileheight);
         this.tilemap = new TileMap({
            name: this.name,
            pos: pos.add(infiniteStartPos),
            tileHeight: this.resource.map.tileheight,
            tileWidth: this.resource.map.tilewidth,
            columns: layer.width,
            rows: layer.height
         });
      } else {
         this.tilemap = new TileMap({
            name: this.name,
            pos,
            tileWidth: this.resource.map.tilewidth,
            tileHeight: this.resource.map.tileheight,
            columns: layer.width,
            rows: layer.height,
         });
      }

      // Common tilemap props
      this.tilemap.addComponent(new TiledLayerDataComponent({ tiledTileLayer: layer }));
      const tx = this.tilemap.get(TransformComponent);
      if (tx) {
         tx.z = this.order;
         let zoverride = this.properties.get(ExcaliburTiledProperties.ZIndex.ZIndex) as number | undefined;
         if (typeof zoverride === 'number') {
            tx.z = zoverride;
         }
      }
      const graphics = this.tilemap.get(GraphicsComponent);
      if (graphics) {
         graphics.visible = this.tiledTileLayer.visible;
         graphics.opacity = opacity;
      }
      if (layer.parallaxx || layer.parallaxy) {
         const factor = vec(layer.parallaxx ?? 1, layer.parallaxy ?? 1);
         this.tilemap.addComponent(new ParallaxComponent(factor));
      }

      // Parse tilemap data infinit or not
      if (this.resource.map.infinite && isInfiniteLayer(this.tiledTileLayer)) {
         for (let chunk of this.tiledTileLayer.chunks) {
            for (let i = 0; i < chunk.data.length; i++) {
               const gid = chunk.data[i];
               if (gid != 0) {
                  // Map from chunk to big tile map
                  const tileX = (i % chunk.width) + (chunk.x - this.tiledTileLayer.startx);
                  const tileY = Math.floor(i / chunk.width) + (chunk.y - this.tiledTileLayer.starty);
                  const tile = this.tilemap.tiles[tileX + tileY * layer.width];
                  this.updateTile(tile, gid, hasTint, tint, isSolidLayer);
               }
            }
         }
      } else {
         // Read tiled data into Excalibur's tilemap type
         for (let i = 0; i < this.data.length; i++) {
            let gid = this.data[i];
            if (gid !== 0) {
               const tile = this.tilemap.tiles[i];
               this.updateTile(tile, gid, hasTint, tint, isSolidLayer);
            }
         }
      }
   }
}




