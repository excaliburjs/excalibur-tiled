import { TilesetResource } from '@excalibur-tiled';

describe('A Tiled tileset resource parser', () => {
   it('should exist', () => {
      expect(TilesetResource).toBeDefined();
   });

   it('can load a tileset tmx', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsx', 1);

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy');
   });

   it('can load a tileset tmj', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsj', 1);

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy-tmj');
   });

   it('can redirect loading with pathmap', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsj', 1, {
         pathMap: [
            { path: 'tilemap_packed.png', output: '/test/unit/tiled/template-resource-spec/tilemap_packed.png' }
         ]
      });

      spyOn((tilesetResource as any).imageLoader, 'getOrAdd').and.callThrough();

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy-tmj');
      expect((tilesetResource as any).imageLoader.getOrAdd).toHaveBeenCalledWith('/test/unit/tiled/template-resource-spec/tilemap_packed.png');
   });
});