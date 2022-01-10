import { Component } from "excalibur";
import { TiledObject } from "./tiled-object";

export class TiledDataComponent extends Component<'ex.tiled'> {
   public readonly type = "ex.tiled";
   constructor(public tiledObject: TiledObject) {
      super();
   }
}