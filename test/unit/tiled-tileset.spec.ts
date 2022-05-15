import { parseExternalJson, parseExternalTsx } from "@excalibur-tiled"
import { AnimationStrategy, Rectangle } from "excalibur";

import tsx from './tileset.tsx';
import tsxWithAnimation from './tilesetWithAnimation.tsx';
import tsjWithAnimation from './tilesetWithAnimation.tsj';


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

   it('can parse animations from an external TSX tileset', () => {
      const tileset = parseExternalTsx(tsxWithAnimation, 1, './path/to/tileset.tsx');
      const mockTilemap = jasmine.createSpyObj('tilemap', ['getSpriteForGid']);
      mockTilemap.getSpriteForGid.and.returnValue(new Rectangle({width: 100, height: 100}));

      expect(tileset.tiles.length).toBe(4);
      expect(tileset.tiles[0].animation?.length).toBe(2);
      expect(tileset.tiles[0].hasAnimation()).toBe(true);
      expect(tileset.tiles[0].animationStrategy).toBe(AnimationStrategy.End);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.strategy).toBe(AnimationStrategy.End);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames.length).toBe(2);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames[0].duration).toBe(300);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames[1].duration).toBe(400);
      
      expect(tileset.tiles[1].animation?.length).toBe(2);
      expect(tileset.tiles[1].hasAnimation()).toBe(true);
      expect(tileset.tiles[1].animationStrategy).toBe(AnimationStrategy.Loop);
      
      expect(tileset.tiles[2].animation?.length).toBe(2);
      expect(tileset.tiles[2].hasAnimation()).toBe(true);
      expect(tileset.tiles[2].animationStrategy).toBe(AnimationStrategy.Freeze);
      
      expect(tileset.tiles[3].animation?.length).toBe(2);
      expect(tileset.tiles[3].hasAnimation()).toBe(true);
      expect(tileset.tiles[3].animationStrategy).toBe(AnimationStrategy.Loop);
   });

   it('can parse animations from an external TSJ tileset', () => {
      const tileset = parseExternalJson(JSON.parse(tsjWithAnimation), 1, './path/to/tileset.tsj');
      const mockTilemap = jasmine.createSpyObj('tilemap', ['getSpriteForGid']);
      mockTilemap.getSpriteForGid.and.returnValue(new Rectangle({width: 100, height: 100}));

      expect(tileset.tiles.length).toBe(4);
      expect(tileset.tiles[0].animation?.length).toBe(2);
      expect(tileset.tiles[0].hasAnimation()).toBe(true);
      expect(tileset.tiles[0].animationStrategy).toBe(AnimationStrategy.End);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.strategy).toBe(AnimationStrategy.End);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames.length).toBe(2);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames[0].duration).toBe(300);
      expect(tileset.tiles[0].getAnimation(mockTilemap)?.frames[1].duration).toBe(400);
      
      expect(tileset.tiles[1].animation?.length).toBe(2);
      expect(tileset.tiles[1].hasAnimation()).toBe(true);
      expect(tileset.tiles[1].animationStrategy).toBe(AnimationStrategy.Loop);
      
      expect(tileset.tiles[2].animation?.length).toBe(2);
      expect(tileset.tiles[2].hasAnimation()).toBe(true);
      expect(tileset.tiles[2].animationStrategy).toBe(AnimationStrategy.Freeze);
      
      expect(tileset.tiles[3].animation?.length).toBe(2);
      expect(tileset.tiles[3].hasAnimation()).toBe(true);
      expect(tileset.tiles[3].animationStrategy).toBe(AnimationStrategy.Loop);
   });
});