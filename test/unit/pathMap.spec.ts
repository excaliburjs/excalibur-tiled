import { pathRelativeToBase } from "../../src/resource/path-util";

describe('A pathMap', () => {
   it('can map paths', () => {

      const pathMap = [
         { path: 'tilemap_packed.png', output: '/test/unit/tiled/template-resource-spec/tilemap_packed.png' }
      ];

      const path = pathRelativeToBase('.', '/some/path/with/tilemap_packed.png', pathMap);

      expect(path).toBe('/test/unit/tiled/template-resource-spec/tilemap_packed.png');

      const otherPath = pathRelativeToBase('.', 'some/path/with/tileset.tsx', pathMap);
      expect(otherPath).toBe('some/path/with/tileset.tsx');
   });


   it('can adjust relative to a base file', () => {

      const pathMap = [
         { path: 'tilemap_packed.png', output: '/test/unit/tiled/template-resource-spec/tilemap_packed.png' }
      ];

      const path = pathRelativeToBase('./some/base.file', '/some/path/with/tilemap_packed.png', pathMap);
      expect(path).toBe('/test/unit/tiled/template-resource-spec/tilemap_packed.png');

      const otherPath = pathRelativeToBase('./base/here/file.file', 'some/path/with/tileset.tsx', pathMap);
      expect(otherPath).toBe('./base/here/some/path/with/tileset.tsx');
   });
})