import { BaseAlign, Collider, Color, Font, FontUnit, Graphic, ImageSource, Sprite, SpriteSheet, TextAlign, Vector, vec } from "excalibur";
import { Text as ExText } from 'excalibur';
import { TiledText } from "../parser/tiled-parser";
import { Properties } from "./properties";
export class Object implements Properties {
   properties = new Map<string, string | number | boolean>();
   constructor(
      public readonly id: number,
      public readonly x: number,
      public readonly y: number) {}
}
export class InsertedTile extends Object {
   constructor(id: number, x: number, y: number, public readonly gid: number, public readonly width: number, public readonly height: number) {
      super(id, x, y);
   }
}
export class Point extends Object {}
export class Text extends Object {
   text: ExText;
   font: Font;
   
   constructor(id: number, x: number, y: number, text: TiledText, width: number) {
      super(id, x, y);

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
   constructor(id: number, x: number, y: number, public readonly width: number, public readonly height: number) {
      super(id, x, y);
   }
}
export class Rectangle extends Object {
   constructor(id: number, x: number, y: number, public readonly width: number, public readonly height: number) {
      super(id, x, y);
   }
}
export class Polygon extends Object {
   public readonly points: Vector[] = []
   constructor(id: number, x: number, y: number, points: {x: number, y: number}[]) {
      super(id, x, y);
      this.points = points.map(p => vec(p.x, p.y).add(vec(this.x, this.y)));
   }
}
export class Polyline extends Object {
   public readonly points: Vector[] = []
   constructor(id: number, x: number, y: number, points: {x: number, y: number}[]) {
      super(id, x, y);
      this.points = points.map(p => vec(p.x, p.y));
   }
}