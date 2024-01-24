import { Component } from "excalibur";
import { TiledTileLayer } from "../parser/tiled-parser";

export interface TiledLayerDataComponentOptions {
   tiledTileLayer: TiledTileLayer;
}

export class TiledLayerDataComponent extends Component {
   public readonly tiledTileLayer: TiledTileLayer;
   constructor(options: TiledLayerDataComponentOptions) {
      super();
      const { tiledTileLayer } = options;
      this.tiledTileLayer = tiledTileLayer;
   }
}