import { ExcaliburCamera } from "./Tiled";
import { TiledEntity } from "./tiled-entity";

export class TiledObjectGroup extends TiledEntity {
   public id: number;
   public objects: TiledObject[] = [];


   public getCamera(): ExcaliburCamera {
      const camera = this.getObjectByType('camera');
      if (camera) {
         const zoom = camera.getProperty('zoom');
         return ({
            x: camera.x,
            y: camera.y,
            zoom: zoom ? +zoom.value : 1
         })
      }
      return null;
   }


   public getObjectByType(type: string): TiledObject {
      return this.getObjectsByType(type)[0];
   }

   public getObjectsByType(type: string): TiledObject[] {
      return this.objects.filter(o => o.type?.toLocaleLowerCase() === type.toLocaleLowerCase());
   }

   public getObjectByName(name: string): TiledObject {
      return this.getObjectsByName(name)[0];
   }

   public getObjectsByName(name: string): TiledObject[] {
      return this.objects.filter(o => o.name?.toLocaleLowerCase() === name.toLocaleLowerCase());
   }
}

export class TiledObject extends TiledEntity {
   public id: number;
   public type?: string;
   public x: number;
   public y: number;
   public width?: number;
   public height?: number;
}