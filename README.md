# Tiled Plugin for Excalibur.js

Tiled is a super useful tool for building game levels across the industry. The Tiled plugin for Excalibur offers support for both Orthogonal (standard) and Isometric maps!

The current Tiled plugin aims to support *parsing all data* in the Map (.tmx/.tmj), Tileset (.tsx, .tsj.) and Template files (.tx, tj). The plugin however does not support rendering all map types, currently hexagons and isometric staggered are not supported.

The plugin officially supports the latest version of Tiled that has been published and will warn if you are using an older version. This is because there have been many breaking changes to the Tiled map format over time that are difficult to reconcile.

![](./readme/example.gif)

## Installation

```sh
npm install --save-exact @excaliburjs/plugin-tiled
```

Create your resource, load it, then add it to your scene!

```typescript
const game = new ex.Engine({...});

const tiledMap = new TiledResource('./path/to/map.tmx');

const loader = new ex.Loader([tiledMap]);

game.start(loader).then(() => {
    tiledMap.addToScene(game.currentScene);
});

```

## Documentation

For information on how to use the plugin visit https://excaliburjs.com/docs/tiled-plugin

## Contributing

- Built with webpack 5
- Uses webpack-dev-server

To start development server:

    npm start

To watch:

    npm run watch

To compile only:

    npm run build

To run tests:

    npx playwright install
    npm test

To update snapshots

* Windows

   ```powershell
   npx playwright test --update-snapshots
   ```

* Linux for CI

   ```powershell
   docker run --rm --network host -v ${PWD}:/work/ -w /work/ -it mcr.microsoft.com/playwright:v1.41.2-jammy /bin/bash
   npm install
   npx playwright test --update-snapshots
   ```
   


