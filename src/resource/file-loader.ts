

export type FileLoader = (path: string) => Promise<string>;


export const FetchLoader: FileLoader = async (path: string) => {
   const response = await fetch(path);
   const contentType = response.headers.get('Content-Type') ?? 'text/plain';
   switch(contentType.toLowerCase()) {
      case 'text/plain': return await response.text();
      case 'application/json': return await response.json();
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