

export type PathMap = { path: string | RegExp, output: string }[];

export function filenameFromPath(inputPath: string): string {
   const filenameExpression = /[^/\\&\?]+\.\w{2,4}(?=([\#\?&].*$|$))/ig

   const matches = inputPath.match(filenameExpression);

   if (matches) {
      const match = matches[0];
      return match;
   }

   throw new Error(`Could not locate filename from path: ${inputPath}`);
}

export function mapPath(inputPath: string, pathMap: PathMap): string {

   for (const { path, output } of pathMap) {
      if (typeof path === 'string') {
         if (inputPath.includes(path)) {
            return output;
         }
      } else {
         const match = inputPath.match(path);
         if (match) {
            return output.replace('[match]', match[0]);;
         }
      }
   }
   return inputPath;
}

export function pathInMap(inputPath: string, pathMap?: PathMap): boolean {
   if (!pathMap) return false;
   for (const { path, output } of pathMap) {
      if (typeof path === 'string') {
         if (inputPath.includes(path)) {
            return true;
         }
      } else {
         const match = inputPath.match(path);
         if (match) {
            return true;
         }
      }
   }
   return false;
}


export function pathRelativeToBase(basePath: string, relativeToBase: string, pathMap?: PathMap) {
   if (pathInMap(relativeToBase, pathMap) && pathMap) {
      return mapPath(relativeToBase, pathMap);
   }

   // Use absolute path if specified
   if (relativeToBase.indexOf('/') === 0) {
      return relativeToBase;
   }

   const originSplit = basePath.split('/');
   const relativeSplit = relativeToBase.split('/');
   // if origin path is a file, remove it so it's a directory
   if (originSplit[originSplit.length - 1].includes('.')) {
      originSplit.pop();
   }
   return originSplit.concat(relativeSplit).join('/');
}