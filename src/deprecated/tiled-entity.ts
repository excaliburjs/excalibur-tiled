import { TiledProperty } from "./tiled-types";

/**
 * Get tile entry property by property name
 * @param properties 
 * @param prop 
 * @returns 
 * @deprecated
 */
export const getProperty = <T = unknown>(properties: TiledProperty[], prop: string): TiledProperty<T> | undefined => {
   if (Array.isArray(properties)) {
      return properties?.filter(p => p.name?.toLocaleLowerCase() === prop.toLocaleLowerCase())[0] as TiledProperty<T>;
   }
}

/**
 * @deprecated
 */
export class TiledEntity {
   public id!: number;
   public name?: string;
   public properties: TiledProperty[] = [];
   public getProperty<T = unknown>(prop: string): TiledProperty<T> | undefined {
      return getProperty<T>(this.properties, prop);
   }
}