import { InsertedTile, TemplateResource }  from '@excalibur-tiled';

describe('A Tiled template resource', () => {
   it('should exist', () => {
      expect(TemplateResource).toBeDefined();
   });

   it('can load a template with data', async () => {
      const templateRes = new TemplateResource('/test/unit/tiled/template-resource-spec/template.tx');

      await templateRes.load();

      expect(templateRes.data).not.toBeNull();
      expect(templateRes.data).not.toBeUndefined();

      const template = templateRes.data;

      expect(template.tileset).not.toBeNull();
      expect(template.object).not.toBeNull();
      expect(template.tiledTemplate).not.toBeNull();

      expect(template.tileset?.class).toBe('TilesetClass');
      expect(template.tileset?.name).toBe('external-fantasy');

      const tile = template.tileset?.getTileByGid(94);
      expect(tile?.class).toBe('TilesetClass');
      expect(tile?.properties).toEqual(new Map([
         ['item', 'test'],
         ['tileset', 'prop']
      ]));
      expect(tile?.objects.length).toBe(1);

      expect(template.object.name).toBe('Coin');
      expect(template.object.class).toBe('Collectable');
      expect(template.object).toBeInstanceOf(InsertedTile);

      const insertedTile = template.object as InsertedTile;

      expect(insertedTile.gid).toBe(94);
      expect(insertedTile.width).toBe(16);
      expect(insertedTile.height).toBe(16);
      expect(insertedTile.properties).toEqual(new Map([
         ['item', 'coin']
      ]));
   });
});