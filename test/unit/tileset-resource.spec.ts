import { TilesetResource } from '@excalibur-tiled';
import { Tileset } from '../../src/resource/tileset.js';
import { AnimationStrategy, vec } from 'excalibur';

describe('A Tiled tileset resource parser', () => {
   it('should exist', () => {
      expect(TilesetResource).toBeDefined();
   });

   it('can load a tileset tmx', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsx', 1);

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy');
   });

   it('can load a tileset tmj', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsj', 1);

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy-tmj');
   });

   it('can redirect loading with pathmap', async () => {
      const tilesetResource = new TilesetResource('/test/unit/tiled/tileset-resource-spec/external-fantasy.tsj', 1, {
         pathMap: [
            { path: 'tilemap_packed.png', output: '/test/unit/tiled/template-resource-spec/tilemap_packed.png' }
         ]
      });

      spyOn((tilesetResource as any).imageLoader, 'getOrAdd').and.callThrough();

      await tilesetResource.load();

      const tileset = tilesetResource.data;
      expect(tileset.name).toBe('external-fantasy-tmj');
      expect((tilesetResource as any).imageLoader.getOrAdd).toHaveBeenCalledWith('/test/unit/tiled/template-resource-spec/tilemap_packed.png');
   });
});

describe('getAnimationForGid', () => {
   let tileset: Tileset;

   beforeEach(async () => {
      const tilesetResource = new TilesetResource(
         '/test/unit/tiled/tileset-resource-spec/animated-tileset.tsx',
         1
      );
      await tilesetResource.load();
      tileset = tilesetResource.data;
   });

   it('returns animation for animated tile gid', () => {
      const anim = tileset.getAnimationForGid(1);
      expect(anim).not.toBeNull();
   });

   it('returns null for non-animated tile gid', () => {
      const anim = tileset.getAnimationForGid(2);
      expect(anim).toBeNull();
   });

   it('animation has correct frame count', () => {
      const anim = tileset.getAnimationForGid(1)!;
      expect(anim.frames.length).toBe(3);
   });

   it('animation preserves frame durations', () => {
      const anim = tileset.getAnimationForGid(1)!;
      expect(anim.frames[0].duration).toBe(100);
      expect(anim.frames[1].duration).toBe(200);
      expect(anim.frames[2].duration).toBe(300);
   });

   it('animation uses Loop strategy', () => {
      const anim = tileset.getAnimationForGid(1)!;
      expect(anim.strategy).toBe(AnimationStrategy.Loop);
   });

   it('no flip - default rotation and scale', () => {
      const anim = tileset.getAnimationForGid(1)!;
      expect(anim.rotation).toBe(0);
      expect(anim.scale).toEqual(vec(1, 1));
   });

   it('horizontal flip - scale.x = -1', () => {
      const hFlipGid = 1 | 0x80000000;
      const anim = tileset.getAnimationForGid(hFlipGid)!;
      expect(anim.rotation).toBe(0);
      expect(anim.scale.x).toBe(-1);
      expect(anim.scale.y).toBe(1);
   });

   it('vertical flip - scale.y = -1', () => {
      const vFlipGid = 1 | 0x40000000;
      const anim = tileset.getAnimationForGid(vFlipGid)!;
      expect(anim.rotation).toBe(0);
      expect(anim.scale.x).toBe(1);
      expect(anim.scale.y).toBe(-1);
   });

   it('diagonal flip - rotation and scale', () => {
      const dFlipGid = 1 | 0x20000000;
      const anim = tileset.getAnimationForGid(dFlipGid)!;
      expect(anim.rotation).toBeCloseTo(-Math.PI / 2);
      expect(anim.scale).toEqual(vec(-1, 1));
   });

   it('H+V flip - scale = (-1, -1)', () => {
      const hvFlipGid = 1 | 0xC0000000;
      const anim = tileset.getAnimationForGid(hvFlipGid)!;
      expect(anim.rotation).toBe(0);
      expect(anim.scale).toEqual(vec(-1, -1));
   });

   it('H+D flip - rotation and scale', () => {
      const hdFlipGid = 1 | 0xA0000000;
      const anim = tileset.getAnimationForGid(hdFlipGid)!;
      expect(anim.rotation).toBeCloseTo(-Math.PI / 2);
      expect(anim.scale).toEqual(vec(-1, -1));
   });

   it('V+D flip - rotation and scale', () => {
      const vdFlipGid = 1 | 0x60000000;
      const anim = tileset.getAnimationForGid(vdFlipGid)!;
      expect(anim.rotation).toBeCloseTo(-Math.PI / 2);
      expect(anim.scale).toEqual(vec(1, 1));
   });

   it('H+V+D flip - rotation and scale', () => {
      const hvdFlipGid = 1 | 0xE0000000;
      const anim = tileset.getAnimationForGid(hvdFlipGid)!;
      expect(anim.rotation).toBeCloseTo(-Math.PI / 2);
      expect(anim.scale).toEqual(vec(1, -1));
   });

   it('each frame sprite has flip applied', () => {
      const hFlipGid = 1 | 0x80000000;
      const anim = tileset.getAnimationForGid(hFlipGid)!;
      expect(anim.scale.x).toBe(-1);
   });

   it('works with non-1 firstGid', async () => {
      const tilesetResource = new TilesetResource(
         '/test/unit/tiled/tileset-resource-spec/animated-tileset.tsx',
         100
      );
      await tilesetResource.load();
      const customTileset = tilesetResource.data;

      const hFlipGid = 100 | 0x80000000;
      const anim = customTileset.getAnimationForGid(hFlipGid)!;
      expect(anim.rotation).toBe(0);
      expect(anim.scale.x).toBe(-1);
   });

   it('caches animations by full gid', () => {
      const gid = 1 | 0x80000000;
      const anim1 = tileset.getAnimationForGid(gid);
      const anim2 = tileset.getAnimationForGid(gid);
      expect(anim1).toBe(anim2);
   });

   it('different flip flags return different cached instances', () => {
      const gid1 = 1;
      const gid2 = 1 | 0x80000000;
      const anim1 = tileset.getAnimationForGid(gid1);
      const anim2 = tileset.getAnimationForGid(gid2);
      expect(anim1).not.toBe(anim2);
   });

   it('out-of-bounds gid returns null', () => {
      const anim = tileset.getAnimationForGid(999);
      expect(anim).toBeNull();
   });
});