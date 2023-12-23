import { Component } from "excalibur";
import { PluginObject } from "./objects";
import { Properties } from "./properties";

export interface TiledDataComponentOptions {
   tiledObject: PluginObject;
}
export class TiledDataComponent extends Component<'ex.tiled-data'> {
   public readonly type = 'ex.tiled-data';
   public tiledObject: PluginObject;
   constructor(options: TiledDataComponentOptions){
      super();
      const {tiledObject} = options;
      this.tiledObject = tiledObject;
   }
}