import { ExcaliburCamera, TiledPoint } from "./tiled-types";
import { TiledEntity } from "./tiled-entity";
import { RawTiledLayer, RawTiledObject } from ".";

export class TiledObjectGroup extends TiledEntity {
   public objects: TiledObject[] = [];

   public rawObjectGroup!: RawTiledLayer;

   public getCamera(): ExcaliburCamera | undefined {
      const camera = this.getObjectByType('camera');
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

   public getObjectsByType(type: string): TiledObject[] {
      return this.objects.filter(o => o.type?.toLocaleLowerCase() === type.toLocaleLowerCase());
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

   public getEllipses(): TiledObject[] {
      return this.objects.filter(o => !!o.ellipse);
   }

   public getText(): TiledObject[] {
      return this.objects.filter(o => !!o.text);
   }

   public getPolyLines(): TiledObject[] {
      return this.objects.filter(o => !!o.polyline);
   }

   public getPolygons(): TiledObject[] {
      return this.objects.filter(o => !!o.polygon);
   }

   public getInsertedTiles(): TiledObject[] {
      return this.objects.filter(o => !!o.gid);
   }
}

export class TiledObject extends TiledEntity {
   public type?: string;
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