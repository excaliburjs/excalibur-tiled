import { TiledParser } from '@excalibur-tiled';

import orthogonalSimpleTmx from './tiled/parser-spec/orthogonal-simple.tmx';
import orthogonalSimpleTmj from './tiled/parser-spec/orthogonal-simple.tmj';

import orthogonalComplexTmx from './tiled/parser-spec/orthogonal-complex.tmx';
import orthogonalComplexTmj from './tiled/parser-spec/orthogonal-complex.tmj';

import orthogonalInfiniteTmx from './tiled/parser-spec/orthogonal-infinite.tmx';
import orthogonalInfiniteTmj from './tiled/parser-spec/orthogonal-infinite.tmj';

import orthogonalTilesetTsx from './tiled/parser-spec/external.tsx';
import orthogonalTilesetTsj from './tiled/parser-spec/external.tsj';

import orthogonalTilesetCollectionTsx from './tiled/parser-spec/collection.tsx';
import orthogonalTilesetCollectionTsj from './tiled/parser-spec/collection.tsj';

import isometricTilesetTsx from './tiled/parser-spec/isometric.tsx';
import isometricTilesetTsj from './tiled/parser-spec/isometric.tsj';

import isometricTilesetCollectionTsx from './tiled/parser-spec/iso-collection.tsx';
import isometricTilesetCollectionTsj from './tiled/parser-spec/iso-collection.tsj';

import { diffString } from 'json-diff';

describe('A Tiled xml parser', () => {
   it('should exist', () => {
      expect(TiledParser).toBeDefined();
   });

   describe('Tiled map parser', () => {
      it('can parse an simple orthogonal tmx map file', () => {
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