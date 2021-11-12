import { TiledMapResource } from "@excalibur-tiled";


describe('A Tiled Map Excalibur Resource', () => {
   it('exists', () => {
      expect(TiledMapResource).toBeDefined();
   });

   it('can be loaded', async () => {
      const tiled = new TiledMapResource('base/test/unit/basic.tmx');
      await tiled.load();
      
      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(1);

      expect(layers[0].cols).toBe(5);
      expect(layers[0].rows).toBe(5);
      expect(layers[0].cellWidth).toBe(16);
      expect(layers[0].cellHeight).toBe(16);
   });

   it('can load solid layers', async () => {
      const tiled = new TiledMapResource('base/test/unit/solid.tmx');
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(2);

      tiled.useSolidLayers();
      
      expect(layers[1].getCell(2, 2).solid).toBeTrue();
      expect(layers[1].getCell(0, 0).solid).toBeFalse();
   });

   it('can load layers with zindex', async () => {
      const tiled = new TiledMapResource('base/test/unit/layer-zindex.tmx');
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(3);

      tiled.useSolidLayers();
      
      expect(layers[0].z).toBe(-1);
      expect(layers[1].z).toBe(0);
      expect(layers[2].z).toBe(5);
   });

   it('can overwrite the base z-index start value', async () => {
      const tiled = new TiledMapResource('base/test/unit/layer-zindex.tmx', undefined, -5);
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(3);

      tiled.useSolidLayers();
      
      expect(layers[0].z).toBe(-5);
      expect(layers[1].z).toBe(-4);
      expect(layers[2].z).toBe(5);
   });

   it('can find a camera in a non-first layer', async () => {
      const tiled = new TiledMapResource('base/test/unit/camera.tmx');
      await tiled.load();
      expect(tiled.isLoaded()).toBe(true);

      expect(tiled.ex.camera).toBeDefined();
      expect(tiled.ex.camera?.x).toBe(50);
      expect(tiled.ex.camera?.y).toBe(50);
      expect(tiled.ex.camera?.zoom).toBe(4);
   });
});