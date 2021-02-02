import { TiledMapResource } from "@excalibur-tiled";


describe('A Tiled Map Excalibur Resource', () => {
   it('exists', () => {
      expect(TiledMapResource).toBeDefined();
   });

   it('can be loaded', async () => {
      const tiled = new TiledMapResource('base/test/unit/basic.tmx');
      await tiled.load();
      
      expect(tiled.isLoaded()).toBe(true);

      const map = tiled.getTileMap();
      expect(map.cols).toBe(5);
      expect(map.rows).toBe(5);
      expect(map.cellWidth).toBe(16);
      expect(map.cellHeight).toBe(16);
   });

   it('can load solid layers', async () => {
      const tiled = new TiledMapResource('base/test/unit/solid.tmx');
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const map = tiled.getTileMap();
      tiled.useSolidLayers();
      
      expect(map.getCell(2, 2).solid).toBeTrue();
      expect(map.getCell(0, 0).solid).toBeFalse();
   });
});