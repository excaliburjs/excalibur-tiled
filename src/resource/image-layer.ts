import { Actor, Color, ImageSource, Vector, vec } from "excalibur";
import { Layer } from "./layer";
import { TiledImageLayer } from "../parser/tiled-parser";
import { TiledResource } from "./tiled-resource";
import { mapProps } from "./properties";
import { pathRelativeToBase } from "./path-util";

export class ImageLayer implements Layer {
   public readonly name: string;
   public readonly class?: string;
   properties = new Map<string, string | number | boolean>();
   image: ImageSource | null = null;
   imageActor: Actor | null = null;
   constructor(public tiledImageLayer: TiledImageLayer, public resource: TiledResource, public readonly order: number) {
      this.name = tiledImageLayer.name;
      this.class = tiledImageLayer.class;
      mapProps(this, tiledImageLayer.properties);
      if (tiledImageLayer.image) {
         this.image = new ImageSource(pathRelativeToBase(this.resource.path, tiledImageLayer.image, this.resource.pathMap))
      }
   }
   async load(): Promise<void> {
      const opacity = this.tiledImageLayer.opacity;
      const hasTint = !!this.tiledImageLayer.tintcolor;
      const tint = this.tiledImageLayer.tintcolor ? Color.fromHex(this.tiledImageLayer.tintcolor) : Color.White;
      const offset = vec(this.tiledImageLayer.offsetx ?? 0, this.tiledImageLayer.offsety ?? 0);
      if (this.image) {
         if (!this.resource.headless) {
            await this.image.load();
         }
         this.imageActor = new Actor({
            name: this.tiledImageLayer.name,
            pos: offset,
            anchor: Vector.Zero
         });
         // FIXME when excalibur supports tiling we should use it here for repeatx/repeaty!
         const sprite = this.image.toSprite();
         this.imageActor.graphics.use(sprite);
         this.imageActor.graphics.visible = this.tiledImageLayer.visible;
         this.imageActor.graphics.opacity = opacity;
         if (hasTint) {
            sprite.tint = tint;
         }
      }
   }
}