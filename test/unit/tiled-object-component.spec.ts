import { TiledObjectComponent, TiledObject } from '@excalibur-tiled';
import { Actor } from 'excalibur';

describe('A TiledObjectComponent', () => {
   it('should exist', () => {
      expect(TiledObjectComponent).toBeDefined();
   });

   it('can be created', () => {
      expect(() => {
         const sut = new TiledObjectComponent(new TiledObject());
      }).not.toThrow();
   });

   it('can be retrieved from an actor', () => {
      const actor = new Actor({x: 0, y: 0});
      const sut = new TiledObjectComponent(new TiledObject());

      expect(actor.get(TiledObjectComponent)).toBeUndefined();

      actor.addComponent(sut);
      
      expect(actor.get(TiledObjectComponent)).toBe(sut);
   });
});