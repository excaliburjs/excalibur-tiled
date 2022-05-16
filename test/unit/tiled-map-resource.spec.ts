import { TiledObjectComponent, TiledMapResource, TiledLayerComponent } from "@excalibur-tiled";
import { AnimationStrategy, Animation, Scene, TileMap } from "excalibur";


describe('A Tiled Map Excalibur Resource', () => {
   it('exists', () => {
      expect(TiledMapResource).toBeDefined();
   });

   it('can be loaded', async () => {
      const tiled = new TiledMapResource('base/test/unit/basic.tmx');
      await tiled.load();
      
      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(1);

      expect(layers[0].columns).toBe(5);
      expect(layers[0].rows).toBe(5);
      expect(layers[0].tileWidth).toBe(16);
      expect(layers[0].tileHeight).toBe(16);
   });

   it('can load solid layers', async () => {
      const tiled = new TiledMapResource('base/test/unit/solid.tmx');
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(2);

      tiled.useSolidLayers();
      
      expect(layers[1].getTile(2, 2).solid).toBeTrue();
      expect(layers[1].getTile(0, 0).solid).toBeFalse();
   });

   it('can load layers with zindex', async () => {
      const tiled = new TiledMapResource('base/test/unit/layer-zindex.tmx');
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(3);

      tiled.useSolidLayers();
      
      expect(layers[0].z).toBe(-1);
      expect(layers[1].z).toBe(0);
      expect(layers[2].z).toBe(5);
   });

   it('can overwrite the base z-index start value', async () => {
      const tiled = new TiledMapResource('base/test/unit/layer-zindex.tmx', {
         startingLayerZIndex: -5
      });
      await tiled.load();

      expect(tiled.isLoaded()).toBe(true);

      const layers = tiled.getTileMapLayers();
      expect(layers).toHaveSize(3);

      tiled.useSolidLayers();
      
      expect(layers[0].z).toBe(-5);
      expect(layers[1].z).toBe(-4);
      expect(layers[2].z).toBe(5);
   });

   it('can find a camera in a non-first layer', async () => {
      const tiled = new TiledMapResource('base/test/unit/camera.tmx');
      await tiled.load();
      expect(tiled.isLoaded()).toBe(true);

      expect(tiled.ex.camera).toBeDefined();
      expect(tiled.ex.camera?.x).toBe(50);
      expect(tiled.ex.camera?.y).toBe(50);
      expect(tiled.ex.camera?.zoom).toBe(4);
   });

   it('will support "z" and "zindex" otherwise default to owning layer', async () => {
      const tiled = new TiledMapResource('test/unit/objects.tmx')
      await tiled.load();
      expect(tiled.isLoaded());

      const scene = new Scene();
      tiled.addTiledMapToScene(scene);

      const objects = scene.actors.filter(a => a.get(TiledObjectComponent));

      // z
      const insertedTile1 = objects.find(a => a.get(TiledObjectComponent)?.object.id === 8);
      expect(insertedTile1?.z).toBe(3);
      
      // z index
      const insertedTile2 = objects.find(a => a.get(TiledObjectComponent)?.object.id === 9);
      expect(insertedTile2?.z).toBe(3);
      
      // layer order
      const insertedTile3 = objects.find(a => a.get(TiledObjectComponent)?.object.id === 10);
      expect(insertedTile3?.z).toBe(0);

      // layer order
      const insertedTile4 = objects.find(a => a.get(TiledObjectComponent)?.object.id === 11);
      expect(insertedTile4?.z).toBe(1);
   });

   it('will parse inserted tile entities and include their TiledObject in the TileObjectComponent', async () => {
      const tiled = new TiledMapResource('test/unit/objects.tmx')
      await tiled.load();
      expect(tiled.isLoaded());

      const scene = new Scene();
      tiled.addTiledMapToScene(scene);

      const objects = scene.actors.filter(a => a.get(TiledObjectComponent));

      const insertedTile = objects.find(a => a.get(TiledObjectComponent)?.object.id === 8);
      
      const component = insertedTile?.get(TiledObjectComponent);

      // <object id="8" gid="1073741992" x="42" y="42" width="16" height="16">
      //    <properties>
      //    <property name="zindex" type="int" value="3"/>
      //    </properties>
      // </object>
      expect(component?.object).not.toBeNull();
      expect(component?.object).not.toBeUndefined();
      expect(component?.object.gid).toBe(1073741992)
      expect(component?.object.visible).toBe(true)
      expect(component?.object.x).toBe(42);
      expect(component?.object.y).toBe(42);
      expect(component?.object.width).toBe(16);
      expect(component?.object.height).toBe(16);
      expect(insertedTile?.z).toBe(3);
      expect(insertedTile?.name).toBe('some-name');
      expect(component?.object.getProperty<number>("z")?.value).toBe(3);
      expect(component?.object.rawObject).toBeDefined();
   });

   it('will parse inserted tile entities and include their TiledObject in the TileLayerComponent', async () => {
      const tiled = new TiledMapResource('test/unit/objects.tmx')
      await tiled.load();
      expect(tiled.isLoaded());

      const scene = new Scene();
      tiled.addTiledMapToScene(scene);

      const tm = scene.tileMaps[0];

      const component = tm?.get(TiledLayerComponent);

      expect(component?.layer.id).toBe(1);
      expect(component?.layer.name).toBe("Tile Layer 1");
      expect(component?.layer.width).toBe(5);
      expect(component?.layer.height).toBe(5);
      expect(component?.layer.encoding).toBe('csv');
      expect(component?.layer.rawLayer).toBeDefined();
   });

   it('will parse animation tiles and produce animation graphics', async () => {
      const tiled = new TiledMapResource('test/unit/animation.tmx');
      await tiled.load();
      expect(tiled.isLoaded());

      const tileset = tiled.getTilesetForTile(279);
      expect(tileset.tiles[0].animation?.length).toBe(3);
      expect(tileset.tiles[0].animationStrategy).toBe(AnimationStrategy.Loop);

      const anim = tiled.getAnimationForGid(279);
      expect(anim).not.toBeNull();
      expect(anim?.frames.length).toBe(3);
      expect(anim?.frames[0].duration).toBe(300);
      expect(anim?.frames[1].duration).toBe(300);
      expect(anim?.frames[2].duration).toBe(300);

      const tile = (tiled.layers as TileMap[])[1].getTile(2, 2);
      expect(tile.getGraphics()[0]).toBeInstanceOf(Animation);
   })
});