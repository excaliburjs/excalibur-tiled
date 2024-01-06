export interface CanLoad {
   load(): Promise<any>;
}

/**
 * Read through cache for loadables
 */
export class LoaderCache<T extends CanLoad> {
   private _loaded = false;
   cache = new Map<string, T>();

   constructor(public readonly type: new (...args: any[]) => T){}

   getOrAdd(...args: any[]): T {
      let resource = this.cache.get(args.join('+'));
      if (resource) {
         return resource;
      }

      resource = new this.type(...args);
      this.cache.set(args.join('+'), resource);
      return resource;
   }

   values(): T[] {
      if (this._loaded) {
         return Array.from(this.cache.values());
      }
      throw new Error(`Read through cache not yet loaded! No values to return!`);
   }

   async load() {
      const resources = Array.from(this.cache.entries());
      const results = await Promise.allSettled(resources.map(i => i[1].load()));

      // Check for errors loading resources
      let errored = 0;
      for (let i = 0; i < results.length; i++) {
         const result = results[i];
         if (result.status === 'rejected') {
            console.error(`Error loading resource at ${resources[i][0]}, is your pathMap correct? or your Tiled map corrupted?`, result.reason);
            errored++;
         }
      }
      if (errored) {
         throw new Error(`Error loading ${errored} resources`);
      }
      this._loaded = true;
   }
}