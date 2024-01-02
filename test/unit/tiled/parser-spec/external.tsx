<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="External" class="SomeClass" tilewidth="16" tileheight="16" tilecount="132" columns="12">
 <editorsettings>
  <export target="external.tsj" format="json"/>
 </editorsettings>
 <properties>
  <property name="someprop" value="prop"/>
 </properties>
 <image source="tilemap_packed.png" width="192" height="176"/>
 <tile id="29">
  <objectgroup draworder="index" id="2">
   <object id="1" x="1.75" y="3.5" width="7.5" height="7.5">
    <ellipse/>
   </object>
   <object id="2" x="9.5" y="8" width="5.25" height="4.75">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="54" type="some class" probability="0.5"/>
 <tile id="93">
  <objectgroup draworder="index" id="2">
   <object id="1" x="3" y="2" width="10" height="12"/>
  </objectgroup>
 </tile>
 <tile id="110">
  <objectgroup draworder="index" id="2">
   <object id="1" x="3.25" y="11">
    <polygon points="0,0 5.75,-6 8.75,-1 4.25,2.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="130">
  <animation>
   <frame tileid="130" duration="500"/>
   <frame tileid="131" duration="500"/>
  </animation>
 </tile>
</tileset>
