import { FLIPPED_DIAGONALLY_FLAG, FLIPPED_HORIZONTALLY_FLAG, FLIPPED_VERTICALLY_FLAG, getCanonicalGid, isFlippedDiagonally, isFlippedHorizontally, isFlippedVertically, TiledLayer } from "@excalibur-tiled";


describe('A Tiled Layer', () => {

   it('exists', () => {
      expect(TiledLayer).toBeDefined();
   });

   it('can have a flipped tile encoded in the gid', () => {

      const gid = 1 | FLIPPED_DIAGONALLY_FLAG | FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG;

      expect(isFlippedDiagonally(gid)).toBeTrue();
      expect(isFlippedHorizontally(gid)).toBeTrue();
      expect(isFlippedVertically(gid)).toBeTrue();

      expect(getCanonicalGid(gid)).toBe(1);
   });
});