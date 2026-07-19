import { PropertyMapValue } from "./properties";

export const byNameCaseInsensitive = (name?: string) => {
   return <TObject extends { name?: string }>(object: TObject) => {
      if (object?.name && name) {
         return object.name.toLocaleLowerCase().localeCompare(name.toLocaleLowerCase()) === 0;
      }
      return object?.name === name;
   }
}

export const byClassCaseInsensitive = (className?: string) => {
   return <TObject extends { class?: string }>(object: TObject) => {
      if (object?.class && className) {
         return object.class.toLocaleLowerCase().localeCompare(className.toLocaleLowerCase()) === 0;
      }
      return object?.class === className;
   }
}

const copyPropsLowerCase = (properties: Map<string, PropertyMapValue>) => {
   const lowercase = new Map<string, PropertyMapValue>();
   for (let [key, value] of properties) {
      lowercase.set(key.toLocaleLowerCase(), value);
   }
   return lowercase;
}

function deepEqual(a: any, b: any): boolean {
   if (a === b) return true;
   if (a == null || b == null) return false;
   if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
         if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
   }
   return false;
}

function listContains(list: any[], target: any): boolean {
   for (const item of list) {
      if (deepEqual(item, target)) return true;
      if (item && typeof item === 'object' && 'value' in item) {
         if (deepEqual(item.value, target)) return true;
      }
   }
   return false;
}

export const byProperty = (propertyName: string, value?: any, valueMatchInsensitve = true) => {
   return <TObject extends { properties: Map<string, PropertyMapValue> }>(object: TObject) => {
      const lowercase = copyPropsLowerCase(object.properties);

      if (value !== undefined) {
         let normalizedValue = value;
         if (typeof value === 'string') {
            normalizedValue = valueMatchInsensitve ? value.toLocaleLowerCase() : value;
         }

         const maybeValue = lowercase.get(propertyName.toLocaleLowerCase());
         if (maybeValue === undefined) return false;

         // Containment check for list values
         if (Array.isArray(maybeValue)) {
            return listContains(maybeValue, normalizedValue);
         }

         if (typeof maybeValue === 'string') {
            return (valueMatchInsensitve ? maybeValue.toLocaleLowerCase() : maybeValue) === normalizedValue;
         }

         return deepEqual(maybeValue, normalizedValue);
      } else {
         return lowercase.has(propertyName.toLocaleLowerCase());
      }
   }
}

export const byPropertyValueMatcher = (propertyName: string, matchValue: (val: any) => boolean) => {
   return <TObject extends { properties: Map<string, PropertyMapValue> }>(object: TObject) => {
      const lowercase = copyPropsLowerCase(object.properties);
      return matchValue(lowercase.get(propertyName.toLocaleLowerCase()));
   }
}
