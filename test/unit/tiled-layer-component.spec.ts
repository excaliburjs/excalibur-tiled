import { TiledObjectComponent, TiledObject, TiledLayerComponent, TiledLayer } from '@excalibur-tiled';
import { Actor, TileMap } from 'excalibur';

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
      const tm = new TileMap({x: 0, y: 0, cellHeight: 10, cellWidth: 10, cols: 10, rows: 10});
      const sut = new TiledLayerComponent(new TiledLayer());

      expect(tm.get(TiledLayerComponent)).toBeUndefined();

      tm.addComponent(sut);

      expect(tm.get(TiledLayerComponent)).toBe(sut);
   });
});