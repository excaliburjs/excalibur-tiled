import { TiledProperty } from "../parser/tiled-parser";

export interface Properties {
   properties: Map<string, string | number | boolean>;
}

export function mapProps<T extends Properties>(target: T, sourceProps?: TiledProperty[]) {
   if (sourceProps) {
      for (const prop of sourceProps) {
         target.properties.set(prop.name, prop.value);
      }
   }
}