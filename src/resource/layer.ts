import { Actor, Shape, toRadians, Entity, ImageSource, CollisionType, IsometricEntityComponent } from "excalibur";
import { Properties } from "./properties";
import { Tileset } from "./tileset";

export interface Layer extends Properties {
   /**
    * Name from Tiled
    */
   name: string;
   /**
    * Original ordering from Tiled
    */
   order: number;
   /**
    * Class name from Tiled
    */
   class?: string;
   /**
    * Loads friendly datastructure (called by the plugin)
    * @internal
    */
   load(): Promise<void>;
}


