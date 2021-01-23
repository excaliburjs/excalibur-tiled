import { TiledProperty } from "./tiled-types";


export class TiledEntity {
   public id: number;
   public name?: string;
   public properties: TiledProperty[] = [];
   public getProperty<T = unknown>(prop: string): TiledProperty<T> {
      return this.properties.filter(p => p.name?.toLocaleLowerCase() === prop.toLocaleLowerCase())[0] as TiledProperty<T>;
   }
}