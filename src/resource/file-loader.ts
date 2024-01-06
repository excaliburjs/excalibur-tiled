

export type FileLoader = (path: string, contentType: 'json' | 'xml') => Promise<string | any>;

export const FetchLoader: FileLoader = async (path: string, contentType: 'json' | 'xml') => {
   const response = await fetch(path);
   switch(contentType.toLowerCase()) {
      case 'xml': return await response.text();
      case 'json': return await response.json();
      default: return await response.text();
   }
}