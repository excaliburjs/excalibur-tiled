import { TiledParser } from '@excalibur-tiled';

import orthogonalSimpleTmx from '/test/unit/tiled/parser-spec/orthogonal-simple.tmx?url&raw';
import orthogonalSimpleTmj from '/test/unit/tiled/parser-spec/orthogonal-simple.tmj?url&raw';

import orthogonalComplexTmx from '/test/unit/tiled/parser-spec/orthogonal-complex.tmx?url&raw';
import orthogonalComplexTmj from '/test/unit/tiled/parser-spec/orthogonal-complex.tmj?url&raw';

import orthogonalInfiniteTmx from '/test/unit/tiled/parser-spec/orthogonal-infinite.tmx?url&raw';
import orthogonalInfiniteTmj from '/test/unit/tiled/parser-spec/orthogonal-infinite.tmj?url&raw';

import orthogonalTilesetTsx from '/test/unit/tiled/parser-spec/external.tsx?url&raw';
import orthogonalTilesetTsj from '/test/unit/tiled/parser-spec/external.tsj?url&raw';

import orthogonalTilesetCollectionTsx from '/test/unit/tiled/parser-spec/collection.tsx?url&raw';
import orthogonalTilesetCollectionTsj from '/test/unit/tiled/parser-spec/collection.tsj?url&raw';

import isometricTilesetTsx from '/test/unit/tiled/parser-spec/isometric.tsx?url&raw';
import isometricTilesetTsj from '/test/unit/tiled/parser-spec/isometric.tsj?url&raw';

import isometricTilesetCollectionTsx from '/test/unit/tiled/parser-spec/iso-collection.tsx?url&raw';
import isometricTilesetCollectionTsj from '/test/unit/tiled/parser-spec/iso-collection.tsj?url&raw';

import invalidTmx from '/test/unit/tiled/tiled-resource-spec/invalid.tmx?url&raw';

import { diffString } from 'json-diff';

describe('A Tiled xml parser', () => {
   it('should exist', () => {
      expect(TiledParser).toBeDefined();
   });

   describe('Tiled map parser', () => {
      it('can parse an simple orthogonal tmx map file', async () => {
         const parser = new TiledParser();
         const map = parser.parse(orthogonalSimpleTmx);
         const diff = diffString(map, JSON.parse(orthogonalSimpleTmj), {
            excludeKeys: ['encoding'], // we do this encoding change on purpose, only spot we break spec
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('can parse a complex orthogonal tmx map file', () => {
         const parser = new TiledParser();
         const map = parser.parse(orthogonalComplexTmx);
         const diff = diffString(map, JSON.parse(orthogonalComplexTmj), {
            excludeKeys: ['encoding'], // we do this encoding change on purpose, only spot we break spec
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('can parse a infinite orthogonal tmx map file', () => {
         // Infinite maps are a little inconsistent out of tiled the tmx and tmj don't always agree on bounds, seems like tmx is the correct one
         const parser = new TiledParser();
         const map = parser.parse(orthogonalInfiniteTmx);
         const diff = diffString(map, JSON.parse(orthogonalInfiniteTmj), {
            excludeKeys: ['encoding'], // we do this encoding change on purpose, only spot we break spec
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('should not throw on parse in non-strict', () => {
         const parser = new TiledParser();
         // should not throw on parse
         parser.parse(invalidTmx, false);
      })
   });

   describe('Tileset parser', () => {
      it('can parse a orthogonal external tsx tileset file', () => {
         const parser = new TiledParser();
         const tileset = parser.parseExternalTileset(orthogonalTilesetTsx);
         const diff = diffString(tileset, JSON.parse(orthogonalTilesetTsj), {
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('can parse a orthogonal collection of images external tsx tileset file', () => {
         const parser = new TiledParser();
         const tileset = parser.parseExternalTileset(orthogonalTilesetCollectionTsx);
         const diff = diffString(tileset, JSON.parse(orthogonalTilesetCollectionTsj), {
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('can parse a isometric external tsx tileset file', () => {
         const parser = new TiledParser();
         const tileset = parser.parseExternalTileset(isometricTilesetTsx);
         const diff = diffString(tileset, JSON.parse(isometricTilesetTsj), {
            precision: 3 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });

      it('can parse a isometric collection of images external tsx tileset file', () => {
         const parser = new TiledParser();
         const tileset = parser.parseExternalTileset(isometricTilesetCollectionTsx);
         const diff = diffString(tileset, JSON.parse(isometricTilesetCollectionTsj), {
            precision: 2 // tmx numbers and tmj numbers have different precisions :(
         });
         expect(diff).toEqual('');
      });
   });

});
