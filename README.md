# Tiled Plugin for Excalibur.js

Tiled is a super useful tool for building game levels across the industry. The Tiled plugin for Excalibur offers support for both Orthogonal (standard) and Isometric maps!

The current Tiled plugin aims to support *parsing all data* in the Map (.tmx/.tmj), Tileset (.tsx, .tsj.) and Template files (.tx, tj). The plugin however does not support rendering all map types, currently hexagons and isometric staggered are not supported.

The plugin officially supports the latest version of Tiled that has been published and will warn if you are using an older version. This is because there have been many breaking changes to the Tiled map format over time that are difficult to reconcile.


## Documentation

For information on how to use the plugin visit https://beta.excaliburjs.com/docs/plugin/tiled-plugin

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

    npm test
