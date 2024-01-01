import { BaseAlign, Color, Font, FontUnit, TextAlign, Vector, vec } from "excalibur";
import { Text as ExText } from 'excalibur';
import { TiledObject, TiledObjectGroup, TiledText } from "../parser/tiled-parser";
import { Properties, mapProps } from "./properties";
import { Template } from "./template";
import { filenameFromPath } from "./path-util";

export interface PluginObjectProps {
   tiledObject: TiledObject;
}
export class PluginObject implements Properties {
   id: number;
   x: number;
   y: number;
   name?: string;
   class?: string;
   tiledObject: TiledObject;
   properties = new Map<string, string | number | boolean>();
   constructor(props: PluginObjectProps) {
      this.tiledObject = props.tiledObject;
      this.name = this.tiledObject.name;
      // Yes this is class in the Tiled UI, it switched from Type -> Class but not all the representations match
      // class mostly synonymous with type in tiled except for a few instances
      this.class = this.tiledObject.type; 
      this.id = this.tiledObject.id ?? -1;
      this.x = this.tiledObject.x ?? 0;
      this.y = this.tiledObject.y ?? 0;
   }
}

export class TemplateObject extends PluginObject {
   public source: string;
   public template: Template;
   public tiledTemplate: TiledObject;
   constructor(tiledObject: TiledObject, template: Template) {
      super({tiledObject});
      if (!tiledObject.template) throw new Error('Invalid template');
      this.source = tiledObject.template
      this.tiledTemplate = tiledObject;
      this.template = template;
   }
}
export class InsertedTile extends PluginObject {
   constructor(tiledObject: TiledObject, public readonly gid: number, public readonly width: number, public readonly height: number) {
      super({tiledObject});
   }
}
export class Point extends PluginObject {}
export class Text extends PluginObject {
   text: ExText;
   font: Font;
   
   constructor(tiledObject: TiledObject, text: TiledText, width: number, textQuality: number) {
      super({tiledObject});

      this.font = new Font({
         family: text.fontfamily ?? 'sans-serif',
         color: text.color ? Color.fromHex(text.color) : Color.Black,
         size: text.pixelsize ?? 16,
         unit: FontUnit.Px,
         textAlign: this._textAlignFromTiled(text.halign),
         baseAlign: this._textBaselineFromTiled(text.valign),
         quality: textQuality
      })

      const textWrap = text.wrap ?? false;

      this.text = new ExText({
         text: text.text,
         font: this.font,
         ...(textWrap ? {
            maxWidth: width + 10 // FIXME: need to bump by a few pixels for some reason
         }: {})
      });
   }
   _textBaselineFromTiled(code: Pick<TiledText, 'valign'>['valign']){
      switch(code) {
         case 'bottom': {
            return BaseAlign.Bottom;
         }
         case 'center': {
            return BaseAlign.Middle;
         }
         case 'top': {
            return BaseAlign.Top;
         }
         default: {
            return BaseAlign.Top;
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
            return TextAlign.Start
         }
         default: {
            return TextAlign.Left;
         }
      }
   }

}
export class Ellipse extends PluginObject {
   constructor(tiledObject: TiledObject, public readonly width: number, public readonly height: number) {
      super({tiledObject});
   }
}
export class Rectangle extends PluginObject {

   constructor(tiledObject: TiledObject, public readonly width: number, public readonly height: number, public readonly anchor: Vector) {
      super({tiledObject});
   }
}
export class Polygon extends PluginObject {
   /**
    * Transformed world space points
    */
   public readonly points: Vector[] = [];
   /**
    * Local space points
    */
   public readonly localPoints: Vector[] = [];
   constructor(tiledObject: TiledObject, points: {x: number, y: number}[]) {
      super({tiledObject});
      this.localPoints = points.map(p => vec(p.x, p.y));
      this.points = points.map(p => vec(p.x, p.y).add(vec(this.x, this.y)));
   }
}
export class Polyline extends PluginObject {
   public readonly points: Vector[] = []
   constructor(tiledObject: TiledObject, points: {x: number, y: number}[]) {
      super({tiledObject});
      this.points = points.map(p => vec(p.x, p.y));
   }
}

export type ObjectTypes = Polygon | Polyline | Rectangle | Ellipse | Text | Point | InsertedTile | PluginObject;
export function parseObject(object: TiledObject, templates: Template[], textQuality = 4,): PluginObject {
   let newObject: PluginObject;
   if (object.point) {
      // Template objects don't have an id for some reason
      newObject = new Point({tiledObject: object});
   } else if (object.ellipse) {
      if (object.width && object.height) {
         // if defaulted the circle center is accurate, otherwise need to be offset by radius
         newObject = new Ellipse(object, object.width, object.height);
         newObject.x += object.width / 2;
         newObject.y += object.height / 2;
      } else {
         // Tiled undocumented default is 20x20
         newObject = new Ellipse(object, 20, 20);
      }
   } else if (object.polygon) {
      newObject = new Polygon(object, object.polygon);
   } else if (object.polyline) {
      newObject = new Polyline(object, object.polyline);
   } else if(object.text) {
      newObject = new Text(object, object.text, object.width ?? 0, textQuality);
   } else if (object.gid) {
      newObject = new InsertedTile(object, object.gid,  object.width ?? 0, object.height ?? 0);
   } else if (object.template) {
      // FIXME This is problematic if you have files with the same name but different paths
      const template = templates.find(t => filenameFromPath(t.templatePath) === filenameFromPath(object.template!));
      if (template) {
         newObject = new TemplateObject(object, template);
      } else {
         // This is truly an error situation
         throw new Error(`Template object id ${object.id} with name ${object.name} is missing loaded template file, there should be one loaded from ${object.template}! Is your tiled map or template corrupted?`);
      }
   } else { // rectangle
      if (object.width && object.height) {
         // if defaulted the rectangle center is accurate, otherwise need to be offset by radius
         newObject = new Rectangle(object, object.width, object.height, Vector.Zero);
      } else {
         // Tiled undocumented default is 20x20 AND pivots around the center
         newObject = new Rectangle(object, 20, 20, Vector.Half);
      }
   }
   return newObject;
}

export function parseObjects(tiledObjectGroup: TiledObjectGroup, templates: Template[], textQuality: number) {
   const objects: PluginObject[] = [];
   for (const object of tiledObjectGroup.objects) {
      let newObject: PluginObject = parseObject(object, templates, textQuality);
      mapProps(newObject, object.properties);
      objects.push(newObject);
   }
   return objects;
}