
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

const copyPropsLowerCase = (properties: Map<string, string | number | boolean>) => {
   const lowercase = new Map<string, string | number | boolean>();
   for (let [key, value] of properties) {
      lowercase.set(key.toLocaleLowerCase(), value);
   }
   return lowercase;
}

export const byProperty = (propertyName: string, value?: any, valueMatchInsensitve = true) => {
   return <TObject extends { properties: Map<string, string | number | boolean> }>(object: TObject) => {
      const lowercase = copyPropsLowerCase(object.properties);

      if (value !== undefined) {
         let normalizedValue = value;
         if (typeof value === 'string') {
            normalizedValue = valueMatchInsensitve ? value.toLocaleLowerCase() : value;
         }

         const maybeValue = lowercase.get(propertyName.toLocaleLowerCase());
         if (typeof maybeValue === 'string') {
            return (valueMatchInsensitve ? maybeValue.toLocaleLowerCase() : maybeValue) === normalizedValue;
         }

         return lowercase.get(propertyName.toLocaleLowerCase()) === normalizedValue;
      } else {
         return lowercase.has(propertyName.toLocaleLowerCase());
      }
   }
}

export const byPropertyValueMatcher = (propertyName: string, matchValue: (val: any) => boolean) => {
   return <TObject extends { properties: Map<string, string | number | boolean> }>(object: TObject) => {
      const lowercase = copyPropsLowerCase(object.properties);
      return matchValue(lowercase.get(propertyName.toLocaleLowerCase()));
   }
}
