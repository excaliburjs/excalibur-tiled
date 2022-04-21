import { TiledObjectComponent, TiledObject, TiledLayerComponent, TiledLayer } from '@excalibur-tiled';
import { Actor, TileMap, vec } from 'excalibur';

describe('A TiledLayerComponent', () => {
   it('should exist', () => {
      expect(TiledLayerComponent).toBeDefined();
   });

   it('can be created', () => {
      expect(() => {
         const sut = new TiledLayerComponent(new TiledLayer());
      }).not.toThrow();
   });

   it('can be retrieved from a TileMap', () => {
      const tm = new TileMap({pos: vec(0, 0), tileHeight: 10, tileWidth: 10, columns: 10, rows: 10});
      const sut = new TiledLayerComponent(new TiledLayer());

      expect(tm.get(TiledLayerComponent)).toBeUndefined();

      tm.addComponent(sut);

      expect(tm.get(TiledLayerComponent)).toBe(sut);
   });
});