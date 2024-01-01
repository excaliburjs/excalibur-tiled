import { TiledMap } from "@excalibur-tiled/deprecated"
import testTmx from './basic.tmx';
import objectsTmx from './objects.tmx'
import testZLibTmx from './zlib.tmx';
import testGZipTmx from './gzip.tmx';
import testZStdTmx from './zstd.tmx';
import testJson from './basic.json';
import objectsJson from './objects.json';


describe('A Tiled Map', () => {
   it('exists', () => {
      expect(TiledMap).toBeDefined();
   });

   it('can parse a basic empty TMX map', async () => {

      const tiledMap = await TiledMap.fromTmx(testTmx);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].id).toBe(1);
      expect(tiledMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(tiledMap.layers[0].encoding).toBe('csv');
      expect(tiledMap.layers[0].width).toBe(5);
      expect(tiledMap.layers[0].height).toBe(5);
      expect(tiledMap.layers[0].properties).toEqual([]);
      expect(tiledMap.objectGroups.length).toBe(0);
      expect(tiledMap.height).toBe(5);
      expect(tiledMap.width).toBe(5);
      expect(tiledMap.tileWidth).toBe(16);
      expect(tiledMap.tileHeight).toBe(16);
   });

   it('can parse a compressed zlib empty TMX map', async () => {

      const tiledMap = await TiledMap.fromTmx(testZLibTmx);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].id).toBe(1);
      expect(tiledMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(tiledMap.layers[0].encoding).toBe('base64');
      expect(tiledMap.layers[0].compression).toBe('zlib');
      expect(tiledMap.layers[0].width).toBe(5);
      expect(tiledMap.layers[0].height).toBe(5);
      expect(tiledMap.layers[0].properties).toEqual([]);
      expect(tiledMap.objectGroups.length).toBe(0);
      expect(tiledMap.height).toBe(5);
      expect(tiledMap.width).toBe(5);
      expect(tiledMap.tileWidth).toBe(16);
      expect(tiledMap.tileHeight).toBe(16);
   });

   it('can parse a compressed zstd empty TMX map', async () => {

      const tiledMap = await TiledMap.fromTmx(testZStdTmx);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].id).toBe(1);
      expect(tiledMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(tiledMap.layers[0].encoding).toBe('base64');
      expect(tiledMap.layers[0].compression).toBe('zstd');
      expect(tiledMap.layers[0].width).toBe(5);
      expect(tiledMap.layers[0].height).toBe(5);
      expect(tiledMap.layers[0].properties).toEqual([]);
      expect(tiledMap.objectGroups.length).toBe(0);
      expect(tiledMap.height).toBe(5);
      expect(tiledMap.width).toBe(5);
      expect(tiledMap.tileWidth).toBe(16);
      expect(tiledMap.tileHeight).toBe(16);
   });

   it('can parse a compressed gzip empty TMX map', async () => {

      const tiledMap = await TiledMap.fromTmx(testGZipTmx);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].id).toBe(1);
      expect(tiledMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(tiledMap.layers[0].encoding).toBe('base64');
      expect(tiledMap.layers[0].compression).toBe('gzip');
      expect(tiledMap.layers[0].width).toBe(5);
      expect(tiledMap.layers[0].height).toBe(5);
      expect(tiledMap.layers[0].properties).toEqual([]);
      expect(tiledMap.objectGroups.length).toBe(0);
      expect(tiledMap.height).toBe(5);
      expect(tiledMap.width).toBe(5);
      expect(tiledMap.tileWidth).toBe(16);
      expect(tiledMap.tileHeight).toBe(16);
   });

   it('can parse objects from a TMX map', async () => {

      const tiledMap = await TiledMap.fromTmx(objectsTmx);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].order).toBe(0);
      expect(tiledMap.objectGroups.length).toBe(2);
      expect(tiledMap.objectGroups[0].name).toBe('Object Layer 1');
      expect(tiledMap.objectGroups[0].order).toBe(1);
      expect(tiledMap.objectGroups[1].name).toBe('Object Layer 2');
      expect(tiledMap.objectGroups[1].order).toBe(2);

      expect(tiledMap.objectGroups[0].getPoints().length).toBe(1);
      expect(tiledMap.objectGroups[0].getEllipses().length).toBe(1);
      expect(tiledMap.objectGroups[0].getPolyLines().length).toBe(1);
      expect(tiledMap.objectGroups[0].getPolygons().length).toBe(1);
      expect(tiledMap.objectGroups[0].getText().length).toBe(1);
      expect(tiledMap.objectGroups[0].getInsertedTiles().length).toBe(4);
      expect(tiledMap.objectGroups[0].getCamera()).toEqual({x: 16, y: 16, zoom: 1});
   });

   it('can parse a basic empty JSON map', async () => {

      const tiledMap = await TiledMap.fromJson(testJson);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.layers[0].id).toBe(1);
      expect(tiledMap.layers[0].data).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
      expect(tiledMap.layers[0].encoding).toBe('csv');
      expect(tiledMap.layers[0].width).toBe(5);
      expect(tiledMap.layers[0].height).toBe(5);
      expect(tiledMap.layers[0].properties).toEqual([]);
      expect(tiledMap.objectGroups.length).toBe(0);
      expect(tiledMap.height).toBe(5);
      expect(tiledMap.width).toBe(5);
      expect(tiledMap.tileWidth).toBe(16);
      expect(tiledMap.tileHeight).toBe(16);
   });

   it('can parse objects from a JSON map', async () => {

      const tiledMap = await TiledMap.fromJson(objectsJson);

      expect(tiledMap).toBeDefined();
      expect(tiledMap.layers.length).toBe(1);
      expect(tiledMap.layers[0].name).toBe('Tile Layer 1');
      expect(tiledMap.objectGroups.length).toBe(1);
      expect(tiledMap.objectGroups[0].name).toBe('Object Layer 1');

      expect(tiledMap.objectGroups[0].getPoints().length).toBe(1);
      expect(tiledMap.objectGroups[0].getEllipses().length).toBe(1);
      expect(tiledMap.objectGroups[0].getPolyLines().length).toBe(1);
      expect(tiledMap.objectGroups[0].getPolygons().length).toBe(1);
      expect(tiledMap.objectGroups[0].getText().length).toBe(1);
      expect(tiledMap.objectGroups[0].getInsertedTiles().length).toBe(1);
      expect(tiledMap.objectGroups[0].getCamera()).toEqual({x: 16, y: 16, zoom: 1});
   });
});