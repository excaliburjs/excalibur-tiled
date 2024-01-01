import { TiledEntity } from '@excalibur-tiled/deprecated';

describe('A Tiled Entity', () => {
   it('should exist', () => {
      expect(TiledEntity).toBeDefined();
   });

   it('can locate properties by name', () => {
      const sut = new TiledEntity();
      sut.properties = [
         {
            name: 'some-prop',
            type: 'bool',
            value: true
         },
         {
            name: 'other-prop',
            type: 'float',
            value: 1.5
         }
      ];

      expect(sut.getProperty('some-prop')).toEqual(sut.properties[0]);
      expect(sut.getProperty('other-prop')).toEqual(sut.properties[1]);
      expect(sut.getProperty('no-prop')).toBeUndefined();
   });
});