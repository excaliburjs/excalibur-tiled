/// <reference path="../bower_components/excalibur/dist/excalibur.d.ts" />
/// <reference path="../dist/excalibur-tiled.d.ts" />
var game = new ex.Engine({
    width: 500,
    height: 400,
    canvasElementId: 'game'
});
var map = new Extensions.Tiled.TiledResource("test.json");
var loader = new ex.Loader([map]);
game.start(loader).then(function () {
    console.log("Game loaded");
    map.data.tilesets.forEach(function (ts) {
        console.log(ts.image, ts.imageTexture.isLoaded());
    });
    var tm = map.getTileMap();
    game.add(tm);
});
