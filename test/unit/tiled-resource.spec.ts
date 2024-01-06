import { FactoryProps, FetchLoader, TiledResource } from '@excalibur-tiled';
import { Actor, vec } from 'excalibur';

describe('A Tiled map resource parser', () => {
   it('should exist', () => {
      expect(TiledResource).toBeDefined();
   });

   it('can load a tiled map resource', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      expect(tiledMap.map).not.toBeNull();
      expect(tiledMap.map).not.toBeUndefined();

      expect(tiledMap.map.backgroundcolor).toBe('#2df6f9');
      expect(tiledMap.map.width).toBe(10);
      expect(tiledMap.map.height).toBe(10);
      expect(tiledMap.map.tileheight).toBe(16);
      expect(tiledMap.map.tilewidth).toBe(16);

      expect(tiledMap.getObjectLayers().length).toBe(2);
      expect(tiledMap.getTileLayers().length).toBe(3);
      expect(tiledMap.getImageLayers().length).toBe(1);
      expect(tiledMap.getIsoTileLayers().length).toBe(0);
   });

   it('should warn on bad version', async () => {
      spyOn(console, 'warn').and.callThrough();

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/badversion.tmx');

      await tiledMap.load();

      expect(console.warn).toHaveBeenCalledWith('The excalibur tiled plugin officially supports 1.10.1+, the current map has tiled version 1.1.0');
   });

   it('should not warn on newer version', async () => {
      spyOn(console, 'warn').and.callThrough();

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/newversion.tmx');

      await tiledMap.load();

      expect(console.warn).not.toHaveBeenCalled();
   });

   it('can redirect loading with pathmap', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', {
         pathMap: [
            { path: 'tilemap_packed.png', output: '/test/unit/tiled/template-resource-spec/tilemap_packed.png' },
            { path: 'coin.tx', output: '/test/unit/tiled/template-resource-spec/coin.tx'},
            { path: 'external-fantasy.tsx', output: '/test/unit/tiled/template-resource-spec/external-fantasy.tsx'},
         ]
      });

      spyOn((tiledMap as any)._imageLoader, 'getOrAdd').and.callThrough();
      spyOn((tiledMap as any)._tilesetLoader, 'getOrAdd').and.callThrough();
      spyOn((tiledMap as any)._templateLoader, 'getOrAdd').and.callThrough();

      await tiledMap.load();

      expect((tiledMap as any)._imageLoader.getOrAdd).toHaveBeenCalledWith('/test/unit/tiled/template-resource-spec/tilemap_packed.png');
      expect((tiledMap as any)._templateLoader.getOrAdd).toHaveBeenCalledWith('/test/unit/tiled/template-resource-spec/coin.tx', jasmine.any(Object));
      expect((tiledMap as any)._tilesetLoader.getOrAdd).toHaveBeenCalledWith('/test/unit/tiled/template-resource-spec/external-fantasy.tsx', jasmine.any(Number), jasmine.any(Object));
   });

   it('can set a start z index', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', {
         startZIndex: 10
      });

      await tiledMap.load();

      expect(tiledMap.layers[0].order).toBe(10);
      expect(tiledMap.layers[1].order).toBe(11);
      expect(tiledMap.layers[2].order).toBe(12);
      expect(tiledMap.layers[3].order).toBe(13);
      expect(tiledMap.layers[4].order).toBe(14);

      const tileLayers = tiledMap.getTileLayers();

      expect(tileLayers[0].tilemap.z).toBe(10);
      expect(tileLayers[1].tilemap.z).toBe(11);
      expect(tileLayers[2].tilemap.z).toBe(12);
   });

   it('can load headless', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', {
         headless: true
      });

      spyOn((tiledMap as any)._imageLoader, 'load').and.callThrough();

      await tiledMap.load();

      expect((tiledMap as any)._imageLoader.load).not.toHaveBeenCalled();
   });

   it('can with custom file loader', async () => {
      const spiedLoader = jasmine.createSpy('spiedLoader', FetchLoader).and.callThrough();
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', {
         headless: true,
         fileLoader: spiedLoader
      });

      await tiledMap.load();

      expect(spiedLoader).toHaveBeenCalledTimes(5);
      expect(spiedLoader.calls.argsFor(0)).toEqual(['/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', 'xml']);
      expect(spiedLoader.calls.argsFor(1)).toEqual(['/test/unit/tiled/tiled-resource-spec/external-fantasy.tsx', 'xml']);
      expect(spiedLoader.calls.argsFor(2)).toEqual(['/test/unit/tiled/tiled-resource-spec/external-fantasy.tsj', 'json']);
      expect(spiedLoader.calls.argsFor(3)).toEqual(['/test/unit/tiled/tiled-resource-spec/coin.tx', 'xml']);
      expect(spiedLoader.calls.argsFor(4)).toEqual(['/test/unit/tiled/tiled-resource-spec/external-fantasy.tsx', 'xml']);
   });


   it('can find layers by name (case insensitive)', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const objects = tiledMap.getLayersByName('objects');

      expect(objects.length).toBe(1);
      expect(objects[0].name).toBe('Objects');

      const imagelayers = tiledMap.getLayersByName('imagelayer');

      expect(imagelayers.length).toBe(1);
      expect(imagelayers[0].name).toBe('ImageLayer');

      const tilelayers = tiledMap.getLayersByName('above');

      expect(tilelayers.length).toBe(1);
      expect(tilelayers[0].name).toBe('Above');
   });

   it('can find layers by property name/value (case insensitive)', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const objects = tiledMap.getLayersByProperty('object', true);

      expect(objects.length).toBe(1);
      expect(objects[0].name).toBe('Objects');

      const imagelayers = tiledMap.getLayersByProperty('answer');

      expect(imagelayers.length).toBe(1);
      expect(imagelayers[0].name).toBe('ImageLayer');

      const tilelayers = tiledMap.getLayersByProperty('above', 'HERE');

      expect(tilelayers.length).toBe(1);
      expect(tilelayers[0].name).toBe('Above');
   });

   it('can find layers by class name (case insensitive)', async () => {
      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const objects = tiledMap.getLayersByClassName('someobjectlayer');

      expect(objects.length).toBe(1);
      expect(objects[0].name).toBe('Objects');

      const imagelayers = tiledMap.getLayersByClassName('someimagelayer');

      expect(imagelayers.length).toBe(1);
      expect(imagelayers[0].name).toBe('ImageLayer');

      const tilelayers = tiledMap.getLayersByClassName('SomeTileLayer');

      expect(tilelayers.length).toBe(1);
      expect(tilelayers[0].name).toBe('Above');
   });

   it('can register entity factories', async () => {
      const factorySpy = jasmine.createSpy('factorySpy', (props: FactoryProps) => {
         return new Actor({
            name: props.name,
            pos: props.worldPos
         })
      }).and.callThrough();

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx', {
         entityClassNameFactories: {
            'Collectable': factorySpy
         }
      });

      await tiledMap.load();

      spyOn(console, 'warn').and.callThrough();

      // will warn if registered after load
      tiledMap.registerEntityFactory('player-start', (props) => {
         return new Actor({
            pos: props.worldPos
         })
      });

      expect(console.warn).toHaveBeenCalledWith('Tiled Resource has already loaded, register "player-start" factory before load has been called for it to function.');

      expect(factorySpy).toHaveBeenCalledTimes(2);

      const entities = tiledMap.getEntitiesByClassName('Collectable');
      expect(entities.length).toBe(2);
      expect(entities[0].name).toBe('Coin');
      expect(entities[1].name).toBe('Arrow');
   });

   it('can get entities by name (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const entities = tiledMap.getEntitiesByName('arrow');

      expect(entities.length).toBe(1);
   });

   it('can get objects by name (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const objects = tiledMap.getObjectsByName('Camera');

      expect(objects.length).toBe(1);
      expect(objects[0].name).toBe('camera');
   });

   it('can get objects by class name (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      // inherited!
      const objects = tiledMap.getObjectsByClassName('collectable');

      expect(objects.length).toBe(2);
      expect(objects[0].name).toBe('Coin');
      expect(objects[1].name).toBe('Arrow');
   });

   it('can get objects by property name/value (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      // inherited!
      const objects = tiledMap.getObjectsByProperty('item');

      expect(objects.length).toBe(2);
      expect(objects[0].name).toBe('Coin');
      expect(objects[1].name).toBe('Arrow');

      const arrow = tiledMap.getObjectsByProperty('item', 'arrow');
      expect(arrow[0].name).toBe('Arrow');

      const coin = tiledMap.getObjectsByProperty('item', 'coin');
      expect(coin[0].name).toBe('Coin');
   });

   it('can get tilesets by name (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const fantasy = tiledMap.getTilesetByName('Fantasy');

      expect(fantasy[0].name).toBe('fantasy');

      const externalfantasy = tiledMap.getTilesetByName('external-Fantasy');

      expect(externalfantasy[0].name).toBe('external-fantasy');

      const externalfantasytmj = tiledMap.getTilesetByName('external-Fantasy-tmj');

      expect(externalfantasytmj[0].name).toBe('external-fantasy-tmj');


   });
   it('can get tilesets by class name (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tileset = tiledMap.getTilesetByClassName('External');
      expect(tileset[0].name).toBe('external-fantasy-tmj');
   });

   it('can get tilesets by property name/value (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tileset = tiledMap.getTilesetByProperty('someprop', 'somevalue');
      expect(tileset[0].name).toBe('external-fantasy-tmj');
   });


   it('can get tilesets by property name/value (case insensitive)', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tileset = tiledMap.getTilesetByProperty('someprop', 'somevalue');
      expect(tileset[0].name).toBe('external-fantasy-tmj');
   });

   it('can get tileset by gid', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const fantasy = tiledMap.getTilesetForTileGid(1);
      expect(fantasy.name).toBe('fantasy');


      const fantasyexternal = tiledMap.getTilesetForTileGid(133);
      expect(fantasyexternal.name).toBe('external-fantasy');

      const fantasyexternaltmj = tiledMap.getTilesetForTileGid(265);
      expect(fantasyexternaltmj.name).toBe('external-fantasy-tmj');
   });

   it('can get tile by layer and coord', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tile = tiledMap.getTileByCoordinate('ground', 0, 0);

      expect(tile?.exTile.x).toBe(0);
      expect(tile?.exTile.y).toBe(0);

      expect(tile?.tiledTile?.id).toBe(2);
      expect(tile?.tiledTile?.properties.get('tileprop')).toBe('someprop');
      expect(tile?.tiledTile?.class).toBe('tileclass');

      const othertile = tiledMap.getTileByCoordinate('ground', 4, 0);

      expect(othertile?.exTile.x).toBe(4);
      expect(othertile?.exTile.y).toBe(0);
      
      expect(othertile?.tiledTile).toBe(undefined);
   });

   it('can get tile by layer and world pos', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tile = tiledMap.getTileByPoint('ground', vec(8, 8));

      expect(tile?.exTile.x).toBe(0);
      expect(tile?.exTile.y).toBe(0);

      expect(tile?.tiledTile?.id).toBe(2);
      expect(tile?.tiledTile?.properties.get('tileprop')).toBe('someprop');
      expect(tile?.tiledTile?.class).toBe('tileclass');

      const othertile = tiledMap.getTileByPoint('ground', vec(16*4 + 8, 8));

      expect(othertile?.exTile.x).toBe(4);
      expect(othertile?.exTile.y).toBe(0);
      
      expect(othertile?.tiledTile).toBe(undefined);
   });

   it('can get tile by class name', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tile = tiledMap.getTilesByClassName('tileclass');

      expect(tile[0].id).toBe(2);
      expect(tile[0].properties.get('tileprop')).toBe('someprop');
      expect(tile[0].class).toBe('tileclass');
   });

   it('can get tile by class name', async () => {

      const tiledMap = new TiledResource('/test/unit/tiled/tiled-resource-spec/orthogonal.tmx');

      await tiledMap.load();

      const tile = tiledMap.getTilesByProperty('tileprop');

      expect(tile[0].id).toBe(2);
      expect(tile[0].properties.get('tileprop')).toBe('someprop');
      expect(tile[0].class).toBe('tileclass');
   });
});