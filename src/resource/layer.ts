import { ParallaxComponent, TileMap, vec } from "excalibur";
import { Properties, mapProps } from "./properties";
import { TiledMap, TiledTileLayer, isCSV, needsDecoding } from "../parser/tiled-parser";
import { Decoder } from "./decoder";
import { TiledResource } from "./tiled-resource";

export class Layer implements Properties {
   properties = new Map<string, string | number | boolean>();
   constructor(public readonly name: string) {}
}


export class TileLayer extends Layer {
   /**
    * Number of tiles wide
    */
   width: number = 0;
   /**
    * Number of tiles high
    */
   height: number = 0;

   /**
    * Original list of gids for this layer from tiled
    */
   data: number[] = [];

   /**
    * Excalibur TileMap structure for drawing in excalibur
    */
   tilemap!: TileMap;

   constructor(public tiledTileLayer: TiledTileLayer, public resource: TiledResource) {
      super(tiledTileLayer.name);

      mapProps(this, tiledTileLayer.properties);
      this.width = tiledTileLayer.width;
      this.height = tiledTileLayer.width;
   }

   async decodeAndBuild() {
      if (needsDecoding(this.tiledTileLayer)) {
         this.data = await Decoder.decode(this.tiledTileLayer.data, this.tiledTileLayer.compression);
      } else if (isCSV(this.tiledTileLayer)) {
         this.data = this.tiledTileLayer.data;
      }

      // TODO support different tile maps besides orthogonal
      // this.data.orientation === "orthogonal"
      const layer = this.tiledTileLayer;
      this.tilemap = new TileMap({
         name: this.name,
         pos: vec(layer.offsetx ?? 0, layer.offsety ?? 0),
         tileWidth: this.resource.map.tilewidth,
         tileHeight: this.resource.map.tileheight,
         columns: layer.width,
         rows: layer.height
      });
      // TODO attach the "this" to the tilemap
      // this.tilemap.addComponent(new TiledLayerComponent(layer));
      if (layer.parallaxx || layer.parallaxy) {
         const factor = vec(layer.parallaxx ?? 1.0, layer.parallaxy ?? 1.0);
         this.tilemap.addComponent(new ParallaxComponent(factor));
      }

      for (let i = 0; i < this.data.length; i++) {
         let gid = this.data[i];
         if (gid !== 0) {
            const tileset = this.resource.getTilesetForTile(gid);
            const sprite = tileset.getSpriteForGid(gid);
            this.tilemap.tiles[i].addGraphic(sprite);
         }
      }

      // I know this looks goofy, but the entity and the layer "it belongs" to are the same here
      // tileMapLayer.z = this._calculateZIndex(layer, layer); 
      // for (let i = 0; i < rawLayer.data.length; i++) {
      //    let gid = <number>rawLayer.data[i];
      //    if (gid !== 0) {
      //       const sprite = this.getSpriteForGid(gid);
      //       tileMapLayer.tiles[i].addGraphic(sprite);
      //       const colliders = this.getCollidersForGid(gid);
      //       for (let collider of colliders) {
      //          tileMapLayer.tiles[i].addCollider(collider);
      //       }
      //       const animation = this.getAnimationForGid(gid);
      //       if (animation) {
      //          tileMapLayer.tiles[i].clearGraphics();
      //          tileMapLayer.tiles[i].addGraphic(animation);
      //       }
      //    }
      // }
   }
   
}