import { ExcaliburCamera, TiledPoint } from "./tiled-types";
import { TiledEntity } from "./tiled-entity";
import { RawTiledLayer } from "./raw-tiled-layer";
import { RawTiledObject } from "./raw-tiled-object";
import { toRadians } from "excalibur";

export interface Polygon {
   x: number;
   y: number;
   polygon: {
      points: string;
   }
}

export interface Box {
   x: number;
   y: number;
   width: number;
   height: number;
}

export interface Ellipse {
   x: number;
   y: number;
   width: number;
   height: number;
}

export class TiledObjectGroup extends TiledEntity {
   public objects: TiledObject[] = [];

   public rawObjectGroup!: RawTiledLayer;

   public order!: number;

   public getCamera(): ExcaliburCamera | undefined {
      const camera = this.getObjectByClass('camera');
      if (camera) {
         const zoom = camera.getProperty<number>('zoom');
         return ({
            x: camera.x,
            y: camera.y,
            zoom: zoom ? +(zoom?.value ?? 1) : 1
         })
      }
   }

   public getObjectByType(type: string): TiledObject | undefined {
      return this.getObjectsByType(type)[0];
   }

   public getObjectByClass(type: string): TiledObject | undefined {
      return this.getObjectsByClass(type)[0];
   }

   public getObjectsByType(type: string): TiledObject[] {
      return this.objects.filter(o => o.type?.toLocaleLowerCase() === type.toLocaleLowerCase());
   }

   /**
    * Since Tiled 1.10 the property is called `type` again.
    * We treat both properties here to be on the safe side.
    * See https://doc.mapeditor.org/en/stable/reference/tmx-changelog/#tiled-1-10
    */
   public getObjectsByClass(type: string): TiledObject[] {
      return this.objects.filter(o => o.class?.toLocaleLowerCase() === type.toLocaleLowerCase() || o.type?.toLocaleLowerCase() === type.toLocaleLowerCase());
   }

   public getObjectByName(name: string): TiledObject | undefined {
      return this.getObjectsByName(name)[0];
   }

   public getObjectsByName(name: string): TiledObject[] {
      return this.objects.filter(o => o.name?.toLocaleLowerCase() === name.toLocaleLowerCase());
   }

   public getPoints(): TiledObject[] {
      return this.objects.filter(o => !!o.point);
   }

   public getEllipses(): (TiledObject & Ellipse)[] {
      return this.objects.filter(o => !!o.ellipse) as (TiledObject & Ellipse)[];
   }

   public getText(): TiledObject[] {
      return this.objects.filter(o => !!o.text);
   }

   public getPolyLines(): TiledObject[] {
      return this.objects.filter(o => !!o.polyline);
   }

   public getPolygons(): (TiledObject & Polygon)[] {
      return this.objects.filter(o => !!o.polygon) as (TiledObject & Polygon)[];
   }

   public getBoxes(): (TiledObject & Box)[] {
      return this.objects.filter(o => !!o.width && !!o.height && !o.ellipse) as (TiledObject & Box)[];
   }

   public getInsertedTiles(): TiledObject[] {
      return this.objects.filter(o => !!o.gid);
   }

   public static parse(objectGroup: RawTiledLayer): TiledObjectGroup {
      if (objectGroup.type !== 'objectgroup') throw Error('Cannot parse non objectgroup type layer');
      const resultObjectGroup = new TiledObjectGroup();
      resultObjectGroup.id = +objectGroup.id;
      resultObjectGroup.name = objectGroup.name;
      resultObjectGroup.properties = objectGroup.properties ?? [];
      resultObjectGroup.rawObjectGroup = objectGroup;
      resultObjectGroup.order = objectGroup.order;
      for (let object of objectGroup.objects) {
         resultObjectGroup.objects.push(TiledObject.parse(object));
      } 
      return resultObjectGroup;
   }
}

export class TiledObject extends TiledEntity {
   public type?: string;
   public class?: string;
   public x!: number;
   public y!: number;
   public visible!: boolean;
   public rotation!: number;
   public width?: number;
   public height?: number;

   /**
    * Present on point objects
    */
   public point?: boolean;

   /**
    * Present on ellipse objects
    */
   public ellipse?: boolean;

   /**
    * Present on text objects
    */
   public text?: TiledText;
   /**
    * Present on polyline objects
    */
   public polyline?: TiledPoint[];
   /**
    * Present on polygon objects
    */
   public polygon?: TiledPoint[];
   /**
    * Present on inserted tile objects
    */
   public gid?: number;

   public rawObject!: RawTiledObject;

   public static parse(object: RawTiledObject): TiledObject {
      const resultObject = new TiledObject();
      resultObject.id = +object.id;
      resultObject.gid = object.gid;
      resultObject.visible = object.visible ?? true;
      resultObject.name = object.name;
      resultObject.type = object.type;
      resultObject.class = object.class;
      resultObject.x = +object.x;
      resultObject.y = +object.y;
      resultObject.rotation = object.rotation ? toRadians(object.rotation) : 0;
      resultObject.width = object.width ?? 0;
      resultObject.height = object.height ?? 0;
      resultObject.point = object.point;
      resultObject.ellipse = object.ellipse === true || (object.ellipse as any === '');
      resultObject.polyline = object.polyline;
      resultObject.polygon = object.polygon;
      resultObject.rawObject = object;
      if (object.text) {
         resultObject.text = {
            ...object.text,
            pixelSize: object.text.pixelsize,
            fontFamily: object.text.fontfamily
         }
      }
      resultObject.properties = object.properties ?? [];
      return resultObject
   }
}

export interface TiledText {
   text: string;
   color?: string;
   fontFamily: string;
   pixelSize: number;
   bold: boolean;
   italic: boolean;
   underline: boolean;
   strikeout: boolean;
   kerning: boolean;
}

export interface TiledInsertedTile extends TiledObject {
   gid: number;
}
