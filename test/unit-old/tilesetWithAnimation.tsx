<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.4" tiledversion="1.4.3" name="Some Tile Set Name" tilewidth="16" tileheight="16" tilecount="486" columns="27">
 <image source="sourceImage.png" width="432" height="288"/>
 <tile id="455">
   <properties>
    <property name="AnimationStrategy" value="end"/>
    <property name="OtherProp" value="someval"/>
   </properties>
   <animation>
    <frame tileid="455" duration="300"/>
    <frame tileid="482" duration="400"/>
   </animation>
  </tile>
  <tile id="456">
   <properties>
    <property name="AnimationStrategy" value="loop"/>
    <property name="OtherProp" value="someval"/>
   </properties>
   <animation>
    <frame tileid="456" duration="300"/>
    <frame tileid="483" duration="300"/>
   </animation>
  </tile>
  <tile id="457">
   <properties>
    <property name="AnimationStrategy" value="freeze"/>
    <property name="OtherProp" value="someval"/>
   </properties>
   <animation>
    <frame tileid="457" duration="300"/>
    <frame tileid="484" duration="300"/>
   </animation>
  </tile>
  <tile id="458">
   <animation>
    <frame tileid="458" duration="300"/>
    <frame tileid="485" duration="300"/>
   </animation>
  </tile>
</tileset>
