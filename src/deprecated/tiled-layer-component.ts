import { Component } from "excalibur";
import { TiledLayer } from "./tiled-layer";

/**
 * @deprecated
 */
// @ts-ignore
export class TiledLayerComponent extends Component<'ex.tiledlayer'> {
   public readonly type = "ex.tiledlayer";
   constructor(public layer: TiledLayer) {
      super();
   }
}