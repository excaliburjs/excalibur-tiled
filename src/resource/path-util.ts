
// TODO path mapping

export function pathRelativeToBase(basePath: string, relativeToBase: string) {
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