import { Component } from "excalibur";
import { TiledObject } from "./tiled-object";

export class TiledObjectComponent extends Component<'ex.tiledobject'> {
   public readonly type = "ex.tiledobject";
   constructor(public object: TiledObject) {
      super();
   }
}