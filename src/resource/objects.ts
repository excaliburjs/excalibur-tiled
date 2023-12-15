import { BaseAlign, Collider, Color, Font, FontUnit, Graphic, ImageSource, Sprite, SpriteSheet, TextAlign, Vector, vec } from "excalibur";
import { Text as ExText } from 'excalibur';
import { TiledObject, TiledObjectGroup, TiledText } from "../parser/tiled-parser";
import { Properties, mapProps } from "./properties";

export interface ObjectProps {
   tiledObject: TiledObject;
}
export class Object implements Properties {
   id: number;
   x: number;
   y: number;
   tiledObject: TiledObject;
   properties = new Map<string, string | number | boolean>();
   constructor(props: ObjectProps) {
      this.tiledObject = props.tiledObject;
      this.id = this.tiledObject.id ?? -1;
      this.x = this.tiledObject.x;
      this.y = this.tiledObject.y;
   }
}
export class InsertedTile extends Object {
   constructor(tiledObject: TiledObject, public readonly gid: number, public readonly width: number, public readonly height: number) {
      super({tiledObject});
   }
}
export class Point extends Object {}
export class Text extends Object {
   text: ExText;
   font: Font;
   
   constructor(tiledObject: TiledObject, text: TiledText, width: number) {
      super({tiledObject});

      this.font = new Font({
         family: text.fontfamily ?? 'sans-serif',
         color: text.color ? Color.fromHex(text.color) : Color.Black,
         size: text.pixelsize ?? 16,
         unit: FontUnit.Px,
         textAlign: this._textAlignFromTiled(text.halign),
         baseAlign: this._textBaselineFromTiled(text.valign)
      })

      const textWrap = text.wrap ?? false;

      this.text = new ExText({
         text: text.text,
         font: this.font,
         ...(textWrap ? {
            maxWidth: width
         }: {})
      });
   }
   _textBaselineFromTiled(code: Pick<TiledText, 'valign'>['valign']){
      switch(code) {
         case 'bottom': {
            return BaseAlign.Bottom;
         }
         case 'center': {
            // TODO is this right?
            return BaseAlign.Middle;
         }
         case 'top': {
            return BaseAlign.Top;
         }
         default: {
            // TODO what is the Tiled default
            return BaseAlign.Middle;
         }
      }
   }

   _textAlignFromTiled(code: Pick<TiledText,'halign'>['halign']) {
      switch(code) {
         case 'left': {
            return TextAlign.Left
         }
         case 'center': {
            return TextAlign.Center
         }
         case 'right': {
            return TextAlign.Right
         }
         case 'justify': {
            // TODO is this right?
            return TextAlign.Start
         }
         default: {
            return TextAlign.Left;
         }
      }
   }

}
export class Ellipse extends Object {
   constructor(tiledObject: TiledObject, public readonly width: number, public readonly height: number) {
      super({tiledObject});
   }
}
export class Rectangle extends Object {
   constructor(tiledObject: TiledObject, public readonly width: number, public readonly height: number) {
      super({tiledObject});
   }
}
export class Polygon extends Object {
   public readonly points: Vector[] = []
   constructor(tiledObject: TiledObject, points: {x: number, y: number}[]) {
      super({tiledObject});
      this.points = points.map(p => vec(p.x, p.y).add(vec(this.x, this.y)));
   }
}
export class Polyline extends Object {
   public readonly points: Vector[] = []
   constructor(tiledObject: TiledObject, points: {x: number, y: number}[]) {
      super({tiledObject});
      this.points = points.map(p => vec(p.x, p.y));
   }
}

export function parseObjects(tiledObjectGroup: TiledObjectGroup) {
   const objects: Object[] = [];
   for (const object of tiledObjectGroup.objects) {
      let newObject: Object;
      if (object.point) {
         // Template objects don't have an id for some reason
         newObject = new Point({tiledObject: object});
      } else if (object.ellipse) {
         newObject = new Ellipse(object, object.width ?? 0, object.height ?? 0);
      } else if (object.polygon) {
         newObject =  new Polygon(object, object.polygon);
      } else if (object.polyline) {
         newObject = new Polyline(object, object.polyline);
      } else if(object.text) {
         newObject = new Text(object, object.text, object.width ?? 0);
      } else if (object.gid) {
         newObject = new InsertedTile(object, object.gid,  object.width ?? 0, object.height ?? 0);
      } else { // rectangle
         newObject = new Rectangle(object, object.width ?? 0, object.height ?? 0);
      }
      mapProps(newObject, object.properties);
      objects.push(newObject);
   }
   return objects;
}