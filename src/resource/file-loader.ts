

export type FileLoader = (path: string, contentType: 'json' | 'xml') => Promise<string>;


export const FetchLoader: FileLoader = async (path: string, contentType: 'json' | 'xml') => {
   const response = await fetch(path);
   switch(contentType.toLowerCase()) {
      case 'xml': return await response.text();
      case 'json': return await response.json();
      default: return await response.text();
   }
}

export const NodeLoader: FileLoader = async (path: string) => {


   return 'data';
}


// export const BunLoader: FileLoader = async (path: string) => {
//    const file = Bun.file(this.path);
//    switch(this.responseType) {
//       case 'text': return this.data = await file.text() as string;
//       case 'json': return this.data = await file.json();
//    }
// }