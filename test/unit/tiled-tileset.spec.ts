import { parseExternalTsx } from "@excalibur-tiled"

import tsx from './tileset.tsx';

describe('A Tiled Tileset', () => {
   it('exists', () => {
      expect(parseExternalTsx).toBeDefined();
   });

   it('can be parsed from a TSX file', () => {
      const tileset = parseExternalTsx(tsx, 1, './path/to/tileset.tsx');

      expect(tileset.name).toBe('Some Tile Set Name');
      expect(tileset.image).toBe('sourceImage.png');
      expect(tileset.firstGid).toBe(1);
      expect(tileset.source).toBe('./path/to/tileset.tsx');
      expect(tileset.tileWidth).toBe(16);
      expect(tileset.tileHeight).toBe(16);
      expect(tileset.columns).toBe(27);
      expect(tileset.tileCount).toBe(486);
      expect(tileset.imageWidth).toBe(432);
      expect(tileset.imageHeight).toBe(288);
   });

});