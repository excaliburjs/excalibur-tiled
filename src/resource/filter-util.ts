
export const byNameCaseInsensitive = (name?: string) => {
   return <TObject extends {name?: string}>(object: TObject) => {
      if (object?.name && name) {
         return object.name.toLocaleLowerCase().localeCompare(name.toLocaleLowerCase()) === 0;
      }
      return object?.name === name;
   }
}

export const byClassCaseInsensitive = (className?: string) => {
   return <TObject extends {class?: string}>(object: TObject) => {
      if (object?.class && className) {
         return object.class.toLocaleLowerCase().localeCompare(className.toLocaleLowerCase()) === 0;
      }
      return object?.class === className;
   }
}

const copyPropsLowerCase = (properties: Map<string, string | number | boolean>) => {
   const lowercase = new Map<string, string | number | boolean>();
   for (let [key, value] of properties) {
      let normalizedValue = value;
      if (typeof value === 'string') {
         normalizedValue = value.toLocaleLowerCase();
      }
      lowercase.set(key.toLocaleLowerCase(), normalizedValue);
   }
   return lowercase;
}

export const byPropertyCaseInsensitive = (propertyName: string, value?: any) => {
   return <TObject extends {properties: Map<string, string | number | boolean>}>(object: TObject) => {
      const lowercase = copyPropsLowerCase(object.properties);

      if (value !== undefined) {
         let normalizedValue = value;
         if (typeof value === 'string') {
            normalizedValue = value.toLocaleLowerCase();
         }

         return lowercase.get(propertyName.toLocaleLowerCase()) === normalizedValue;
      } else {
         return lowercase.has(propertyName.toLocaleLowerCase());
      }
   }
}