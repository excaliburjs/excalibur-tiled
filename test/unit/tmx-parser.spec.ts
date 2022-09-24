import { TmxParser } from "@excalibur-tiled"

fdescribe('A TmxParser', () => {
   it('exists', () => {
      expect(TmxParser).toBeDefined();
   });

   it('will parse tmx map info', () => {
      let mapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <map
         version="1.9"
         tiledversion="1.9.0"
         orientation="orthogonal"
         renderorder="right-down"
         width="10"
         height="11"
         tilewidth="32"
         tileheight="33"
         nextobjectid="15">
         <properties>
            <property name="someprop" type="bool" value="true"/>
         </properties>
         <layer id="1" name="Tile Layer 1" width="30" height="20">
            <data encoding="csv">
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
            </data>
         </layer>
      </map>
      `
      const sut = new TmxParser();
      const rawMap = sut.parse(mapXml);

      expect(rawMap.version).toEqual(1.9);
      expect(rawMap.tiledversion).toEqual("1.9.0");
      expect(rawMap.width).toEqual(10);
      expect(rawMap.height).toEqual(11);
      expect(rawMap.tilewidth).toEqual(32);
      expect(rawMap.tileheight).toEqual(33);
      expect(rawMap.nextobjectid).toEqual(15);
      expect(rawMap.properties[0]).toEqual({
         name: "someprop",
         value: true,
         type: 'bool'
      })
   });

   it('will parse tmx tile layers', () => {
      let mapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <map
         version="1.9"
         tiledversion="1.9.0"
         orientation="orthogonal"
         renderorder="right-down"
         width="10"
         height="11"
         tilewidth="32"
         tileheight="33"
         nextobjectid="15">
         <layer
            id="1"
            name="Tile Layer 1"
            class="SomeClass"
            width="30"
            height="20"
            tintcolor="#76258a"
            offsetx="10"
            offsety="50"
            parallaxx="0.5">
            <properties>
               <property name="some prop" type="bool" value="false"/>
            </properties>
            <data encoding="csv">
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
            </data>
         </layer>
      </map>
      `
      const sut = new TmxParser();
      const rawMap = sut.parse(mapXml);

      expect(rawMap.layers.length).toBe(1);
      expect(rawMap.layers[0].id).toBe(1);
      expect(rawMap.layers[0].type).toBe("tilelayer");
      expect(rawMap.layers[0].name).toBe("Tile Layer 1");
      expect(rawMap.layers[0].width).toBe(30);
      expect(rawMap.layers[0].height).toBe(20);
      expect(rawMap.layers[0].tintcolor).toBe("#76258a");
      expect(rawMap.layers[0].opacity).toBe(1.0);
      expect(rawMap.layers[0].visible).toBe(true);
      expect(rawMap.layers[0].offsetx).toBe(10);
      expect(rawMap.layers[0].offsety).toBe(50);
      expect(rawMap.layers[0].parallaxx).toBe(.5);
      expect(rawMap.layers[0].parallaxy).toBe(1);
      expect(rawMap.layers[0].properties[0]).toEqual({
         name: "some prop",
         type: 'bool',
         value: false
      });
      expect(rawMap.layers[0].compression).toBe(undefined);
      expect(rawMap.layers[0].data).toContain("0,0");
      expect(rawMap.layers[0].encoding).toContain("csv");

   });

   it('will parse tmx object layers', () => {
      let mapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <map
         version="1.9"
         tiledversion="1.9.0"
         orientation="orthogonal"
         renderorder="right-down"
         width="10"
         height="11"
         tilewidth="32"
         tileheight="33"
         nextobjectid="15">
         <objectgroup color="#299632" id="2" name="Object Layer 1" tintcolor="#6f41ca">
            <properties>
               <property name="someprop" type="bool" value="true"/>
            </properties>
            <object id="1" x="19" y="54" width="35" height="29"/>
         </objectgroup>
      </map>
      `
      const sut = new TmxParser();
      const rawMap = sut.parse(mapXml);

      expect(rawMap.layers.length).toBe(1);
      expect(rawMap.layers[0].id).toBe(2);
      expect(rawMap.layers[0].type).toBe("objectgroup");
      expect(rawMap.layers[0].name).toBe("Object Layer 1");
      expect(rawMap.layers[0].tintcolor).toBe("#6f41ca");
      expect(rawMap.layers[0].color).toBe("#299632");
      expect(rawMap.layers[0].opacity).toBe(1.0);
      expect(rawMap.layers[0].visible).toBe(true);
      expect(rawMap.layers[0].offsetx).toBe(0);
      expect(rawMap.layers[0].offsety).toBe(0);
      expect(rawMap.layers[0].parallaxx).toBe(1);
      expect(rawMap.layers[0].parallaxy).toBe(1);
      expect(rawMap.layers[0].properties[0]).toEqual({
         name: "someprop",
         type: 'bool',
         value: true
      });
      expect(rawMap.layers[0].objects.length).toBe(1);
      expect(rawMap.layers[0].objects[0].id).toBe(1);
      expect(rawMap.layers[0].objects[0].x).toBe(19);
      expect(rawMap.layers[0].objects[0].y).toBe(54);
      expect(rawMap.layers[0].objects[0].width).toBe(35);
      expect(rawMap.layers[0].objects[0].height).toBe(29);
   });

   it('will preserve layer order and flatten groups', () => {
      let mapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <map
         version="1.9"
         tiledversion="1.9.0"
         orientation="orthogonal"
         renderorder="right-down"
         width="10"
         height="11"
         tilewidth="32"
         tileheight="33"
         nextobjectid="15">
         <imagelayer id="9" name="Image Layer 1">
            <image source="tilemap.png" width="128" height="64"/>
         </imagelayer>
         <objectgroup color="#299632" id="2" name="Object Layer 1" tintcolor="#6f41ca">
         </objectgroup>
         <layer id="1" name="Tile Layer 1" class="SomeClass" width="30" height="20" tintcolor="#76258a" offsetx="10" offsety="50" parallaxx="0.5">
            <data encoding="csv">
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
            </data>
        </layer>
        <objectgroup id="8" name="Object Layer"/>
        <group id="3" name="Group 1">
         <group id="5" name="Group 2">
          <objectgroup id="7" name="Object Layer 3"/>
         </group>
         <layer id="10" name="Tile Layer 2" width="30" height="20">
            <data encoding="csv">
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
            </data>
         </layer>
         <objectgroup id="6" name="Object Layer 2"/>
        </group>
      </map>
      `
      const sut = new TmxParser();
      const rawMap = sut.parse(mapXml);

      // order is maintained
      expect(rawMap.layers[0].id).toBe(9);
      expect(rawMap.layers[1].id).toBe(2);
      expect(rawMap.layers[2].id).toBe(1);
      expect(rawMap.layers[3].id).toBe(8);
      expect(rawMap.layers[4].id).toBe(7);
      expect(rawMap.layers[5].id).toBe(10);
      expect(rawMap.layers[6].id).toBe(6);

   })

   it('will parse tmx tilesets', () => {
      let mapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <map
         version="1.9"
         tiledversion="1.9.0"
         orientation="orthogonal"
         renderorder="right-down"
         width="10"
         height="10"
         tilewidth="32"
         tileheight="32"
         nextobjectid="15">

         <tileset
            firstgid="1"
            version="1.9"
            tiledversion="1.9.0"
            name="Tileset"
            tilewidth="16"
            tileheight="16"
            tilecount="486"
            columns="27">
            <properties>
               <property name="someprop" type="bool" value="true"/>
            </properties>
            <image source="path/to/some/image.png" width="432" height="288"/>
            <tile id="190">
               <objectgroup draworder="index" id="2">
                  <object id="3" x="6.0625" y="8.875">
                     <polygon points="0,0 3.0625,0 3,6.0625 -0.0625,6"/>
                  </object>
                  <object id="4" x="3.75" y="0.9375" width="7.6875" height="7.6875">
                     <ellipse/>
                  </object>
               </objectgroup>
            </tile>
         </tileset>
         <tileset firstgid="1" source="some/external.tsx"/>
      </map>
      `
      const sut = new TmxParser();
      const rawMap = sut.parse(mapXml);
      expect(rawMap.tilesets.length).toBe(2);
      expect(rawMap.tilesets[0].type).toBe('tileset');
      expect(rawMap.tilesets[0].version).toBe(1.9);
      expect(rawMap.tilesets[0].tiledversion).toBe('1.9.0');
      expect(rawMap.tilesets[0].imagewidth).toBe(432);
      expect(rawMap.tilesets[0].imageheight).toBe(288);
      expect(rawMap.tilesets[0].spacing).toBe(0);
      expect(rawMap.tilesets[0].properties.length).toBe(1);
      expect(rawMap.tilesets[0].properties[0]).toEqual({
         name: 'someprop',
         type: 'bool',
         value: true
      });
      expect(rawMap.tilesets[0].source).toBe(undefined);
      expect(rawMap.tilesets[0].image).toBe("path/to/some/image.png");
      expect(rawMap.tilesets[0].firstgid).toBe(1);
      expect(rawMap.tilesets[0].name).toBe("Tileset");
      expect(rawMap.tilesets[0].tilewidth).toBe(16);
      expect(rawMap.tilesets[0].tileheight).toBe(16);
      expect(rawMap.tilesets[0].tilecount).toBe(486);
      expect(rawMap.tilesets[0].columns).toBe(27);
      expect(rawMap.tilesets[0].tiles.length).toBe(1);
      expect(rawMap.tilesets[0].tiles[0].id).toBe(190);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects.length).toBe(2);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[0].id).toBe(3);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[0].x).toBe(6.0625);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[0].y).toBe(8.875);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[0].polygon).toEqual([
         { x: 0, y: 0 }, {x: 3.0625, y: 0 }, {x: 3, y: 6.0625}, {x: -0.0625, y: 6 }
      ]);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].id).toBe(4);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].x).toBe(3.75);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].y).toBe(0.9375);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].width).toBe(7.6875);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].height).toBe(7.6875);
      expect(rawMap.tilesets[0].tiles[0].objectgroup.objects[1].ellipse).toBe(true);

      expect(rawMap.tilesets[1].source).toBe("some/external.tsx");
   });
});