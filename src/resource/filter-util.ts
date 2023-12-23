
export const byNameCaseInsensitive = (name?: string) => {
   return function innerFilter<TObject extends {name?: string}>(object: TObject) {
      if (object?.name && name) {
         return object.name.toLocaleLowerCase().localeCompare(name.toLocaleLowerCase()) === 0;
      }
      return object?.name === name;
   }
}

export const byClassCaseInsensitive = (className?: string) => {
   return function innerFilter<TObject extends {class?: string}>(object: TObject) {
      if (object?.class && className) {
         return object.class.toLocaleLowerCase().localeCompare(className.toLocaleLowerCase()) === 0;
      }
      return object?.class === className;
   }
}

export const byPropertyCaseInsensitive = (propertyName: string, value?: any) => {
   return function innerFilter<TObject extends {properties:Map<string, string | number | boolean>}>(object: TObject) {
      if (value !== undefined) {
         let normalizedValue = value;
         if (typeof value === 'string') {
            normalizedValue = value.toLocaleLowerCase();
         }
         return object.properties.get(propertyName.toLocaleLowerCase()) === normalizedValue;
      } else {
         return object.properties.has(propertyName.toLocaleLowerCase());
      }
   }
}