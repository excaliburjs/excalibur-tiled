import { BoundingBox, CollisionGroup, Color, Entity, ImageSource, Loadable, Logger, Scene, TransformComponent, Vector, vec } from "excalibur";
import { TiledMap, TiledParser, TiledTile, isTiledTilesetCollectionOfImages, isTiledTilesetEmbedded, isTiledTilesetExternal, isTiledTilesetSingleImage } from "../parser/tiled-parser";
import { Tile, Tileset } from "./tileset";
import { Layer } from "./layer";
import { IsometricTileInfo } from "./iso-tile-layer";
import { TileInfo } from "./tile-layer";
import { IsoTileLayer } from "./iso-tile-layer";
import { TileLayer } from "./tile-layer";
import { ObjectLayer } from './object-layer';
import { Template } from "./template";
import { compare } from "compare-versions";
import { getCanonicalGid } from "./gid-util";
import { PathMap, pathRelativeToBase } from "./path-util";
import { PluginObject } from "./objects";
import { byClassCaseInsensitive, byNameCaseInsensitive, byProperty } from "./filter-util";
import { ExcaliburTiledProperties } from "./excalibur-properties";
import { FetchLoader, FileLoader } from './file-loader';
import { TilesetResource, TilesetResourceOptions } from "./tileset-resource";
import { LoaderCache } from "./loader-cache";
import { TemplateResource, TemplateResourceOptions } from "./template-resource";
import { ImageLayer } from "./image-layer";

export interface TiledLayerConfig {
  /**
   * Solid layers mean that Excalibur should treat the presence of a tile as solid, it will use the Tile bounds as a collider.
   *
   * Override the Tiled layer property solid=true|false
   */
  isSolid?: boolean;
  /**
   * Collision group to associate with colliders in this layer
   */
  collisionGroup?: CollisionGroup;
  /**
   * Use custom colliders in Excalibur set in the tileset regardless if the layer is set to solid=true|false
   */
  useTileColliders?: boolean;
  /**
   * Use custom colliders in Excalibur set in the tileset regardless if the layer is currently visible
   */
  useTileCollidersWhenInvisible?: boolean;
}

export interface TiledAddToSceneOptions {
  pos: Vector;
}

export interface TiledResourceOptions {

  /**
   * Plugin will operate in headless mode and skip all graphics related
   * excalibur items including creating ImageSource's for Tiled items.
   *
   * Default false.
   */
  headless?: boolean;

  /**
   * Add a starting z index for the layers to use. By default the layers count up from 0.
   *
   * If you'd like to manually override a z-index on a layer use the 'zindex' custom property on a layer.
   */
  startZIndex?: number;

  /**
   * Default true. If false, only tilemap will be parsed and displayed, it's up to you to wire up any excalibur behavior.
   * Automatically wires excalibur to the following
   * * Wire up current scene camera
   * * Make Actors/Tiles with colliders on Tiled tiles & Tiled objects
   * * Support solid layers
   *
   * Read more at excaliburjs.com!
   */
  useExcaliburWiring?: boolean;

  /**
   * Sets excalibur's background color to match the Tiled map
   */
  useMapBackgroundColor?: boolean;


  /**
   * Keeps the camera viewport within the bounds of the TileMap, uses the first tile layer's bounds.
   *
   * Defaults true, if false the camera will use the layer bounds to keep the camera from showing the background.
   */
  useTilemapCameraStrategy?: boolean;

  /**
   * Plugin detects the map type based on extension, if you know better you can force an override.
   */
  mapFormatOverride?: 'TMX' | 'TMJ';

  /**
   * Configure tile layers by string name or by number id
   */
  layerConfig?: Record<string | number, TiledLayerConfig>;

  /**
   * The pathMap helps work around odd things bundlers do with static files by providing a way to redirect the original
   * source paths in the Tiled files to new locations.
   *
   * When the Tiled resource comes across something that matches `path`, it will use the output string instead.
   * 
   * Example:
   * ```typescript
   * const newResource = new TiledResource('./example-city.tmx', {
   *     pathMap: [
   *        // If the "path" is included in the source path, the output will be used
   *        { path: 'cone.tx', output: '/static/assets/cone.tx' },
   *        // Regex matching with special [match] in output string that is replaced with the first match from the regex
   *        { path: /(.*\..*$)/, output: '/static/assets/[match]'}
   *     ]
   *  }
   * ```
   */
  pathMap?: PathMap;

  /**
   * Optionally provide a custom file loader implementation instead of using the built in ajax (fetch) loader
   * that takes a path and returns file data
   * 
   */
  fileLoader?: FileLoader;

  /**
   * By default `true`, means Tiled files must pass the plugins Typed parse pass.
   *
   * If you have something that the Tiled plugin does not expect, you can set this to false and it will do it's best
   * to parse the Tiled source map file.
   */
  strict?: boolean;

  /**
   * Configure the text quality to use in Excalibur's Text implementation for the Tiled resources that involve text
   *
   * By default it's 4 for 4x scaled bitmap
   */
  textQuality?: number;

  /**
   * Configure custom Actor/Entity factory functions to construct Actors/Entities
   * given a Tiled class name.
   */
  entityClassNameFactories?: Record<string, (props: FactoryProps) => Entity | undefined>;
}

export interface FactoryProps {
  /**
   * Excalibur world position
   */
  worldPos: Vector;
  /**
   * Tiled name in UI
   */
  name?: string;
  /**
   * Tiled class in UI (internally in Tiled is represented as the string 'type')
   */
  class: string;
  /**
   * Layer (either TileLayer or ObjectLayer) that this object is part of
   */
  layer: Layer;
  /**
   * If using an object layer or a tile object property, the object will be passed.
   */
  object: PluginObject;
  /**
   * Tiled properties, these are all converted to lowercase keys, and lowercase if the value is a string
   */
  properties: Record<string, any>;
}

export class TiledResource implements Loadable<any> {
  private logger = Logger.getInstance();
  /**
   * Currently the latest tested and supported version of Tiled
   * with the Excalibur Tiled plugin
   */
  public static supportedTiledVersion = '1.10.1';
  data: any;

  /**
   * The original tiled map representation in Tiled JSON/TMJ format
   * 
   * If loaded from a Tiled TMX file, it has been converted to the same JSON/TMJ format
   */
  map!: TiledMap;
  /**
   * A list of Tilesets from Tiled in a friendly data structure (original TSX/TSJ is available on that type)
   */
  tilesets: Tileset[] = [];
  /**
   * A list of Templates from Tiled in a friendly data structure (original TX/TJ is available on that type)
   */
  templates: Template[] = [];
  /**
   * A list of Layers from Tiled in a friendly data structure (original layer format is available on that type)
   *
   * Layers can either be an ObjectLayer, TileLayer, or ImageLayer
   *
   * GroupLayers don't exist in the plugin, they are flattened and the proper order preserved.
   */
  layers: Layer[] = [];

  public readonly mapFormat: 'TMX' | 'TMJ' = 'TMX';
  public readonly strict: boolean = true;

  public factories = new Map<string, (props: FactoryProps) => Entity | undefined>();

  public parser = new TiledParser();

  public fileLoader: FileLoader = FetchLoader;

  public pathMap: PathMap | undefined;

  public readonly startZIndex: number = 0;
  public readonly textQuality: number = 4;
  public readonly useExcaliburWiring: boolean = true;
  public readonly useMapBackgroundColor: boolean = false;
  public readonly useTilemapCameraStrategy: boolean = false;
  public readonly headless: boolean = false;
  public layerConfig: Record<string | number, TiledLayerConfig> = {};

  private _imageLoader = new LoaderCache(ImageSource);
  private _tilesetLoader = new LoaderCache(TilesetResource);
  private _templateLoader = new LoaderCache(TemplateResource);
  constructor(public readonly path: string, options?: TiledResourceOptions) {
    const {
      mapFormatOverride,
      textQuality,
      entityClassNameFactories,
      useExcaliburWiring,
      useTilemapCameraStrategy,
      useMapBackgroundColor,
      layerConfig,
      pathMap,
      fileLoader,
      strict,
      headless,
      startZIndex
    } = { ...options };
    this.strict = strict ?? this.strict;
    this.headless = headless ?? this.headless;
    this.useExcaliburWiring = useExcaliburWiring ?? this.useExcaliburWiring;
    this.useTilemapCameraStrategy = useTilemapCameraStrategy ?? this.useTilemapCameraStrategy;
    this.useMapBackgroundColor = useMapBackgroundColor ?? this.useMapBackgroundColor;
    this.layerConfig = layerConfig ?? this.layerConfig;
    this.textQuality = textQuality ?? this.textQuality;
    this.startZIndex = startZIndex ?? this.startZIndex;
    this.fileLoader = fileLoader ?? this.fileLoader;
    this.pathMap = pathMap;
    for (const key in entityClassNameFactories) {
      this.registerEntityFactory(key, entityClassNameFactories[key]);
    }
    this.mapFormat = mapFormatOverride ?? (path.includes('.tmx') ? 'TMX' : 'TMJ');
  }

  /**
   * Registers an entity factory to run on load, if added after load it will be run immediately
   * @param className 
   * @param factory 
   */
  registerEntityFactory(className: string, factory: (props: FactoryProps) => Entity | undefined): void {
    if (this.factories.has(className)) {
      console.warn(`Another factory has already been registered for tiled class/type "${className}", this is probably a bug.`);
    }
    this.factories.set(className, factory);
    if (this.isLoaded()) {
      for (let objectLayer of this.getObjectLayers()) {
        objectLayer.runFactory(className);
      }
    }
  }

  unregisterEntityFactory(className: string) {
    if (!this.factories.has(className)) {
      console.warn(`No factory has been registered for tiled class/type "${className}", cannot unregister!`);
    }
    this.factories.delete(className);
  }

  getLayerConfig(idOrName: number | string): TiledLayerConfig | undefined {
    return this.layerConfig[idOrName];
  }

  /**
   * Given a gid, find the Tileset it belongs to in the map!
   * @param gid 
   * @returns 
   */
  getTilesetForTileGid(gid: number): Tileset {
    const normalizedGid = getCanonicalGid(gid)
    if (this.tilesets) {
      for (let tileset of this.tilesets) {
        if (normalizedGid >= tileset.firstGid && normalizedGid <= tileset.firstGid + tileset.tileCount - 1) {
          return tileset;
        }
      }
    }
    throw Error(`No tileset exists for tiled gid [${gid}] normalized [${normalizedGid}]!`);
  }

  /**
   * Queries for tilesets in the map by name (case insensitive)
   * @param name 
   * @returns 
   */
  getTilesetByName(name: string): Tileset[] {
    return this.tilesets.filter(byNameCaseInsensitive(name));
  }
  /**
   * Queries for tilesets in the map by class name (case insensitive)
   * @param className 
   * @returns 
   */
  getTilesetByClassName(className: string): Tileset[] {
    return this.tilesets.filter(byClassCaseInsensitive(className));
  }

  /**
   * Queries for tilesets in the map by property and an optional value (case insensitive)
   * @param propertyName 
   * @param value 
   * @returns 
   */
  getTilesetByProperty(propertyName: string, value?: any): Tileset[] {
    return this.tilesets.filter(byProperty(propertyName, value));
  }

  /**
   * Queries ALL tilesets tile data in the map for a specific class name (case insensitive)
   * @param className 
   * @returns 
   */
  getTileMetadataByClassName(className: string): Tile[] {
    let results: Tile[] = [];
    for (let tileset of this.tilesets) {
      results = results.concat(tileset.tiles.filter(byClassCaseInsensitive(className)));
    }
    return results;
  }

  /**
   * Queries ALL tilesets tile data in the map for a specific property and an optional value (case insensitive)
   * @param name 
   * @param value 
   * @returns 
   */
  getTileMetadataByProperty(name: string, value?: any): Tile[] {
    let results: Tile[] = [];
    for (let tileset of this.tilesets) {
      results = results.concat(tileset.tiles.filter(byProperty(name, value)));
    }
    return results;
  }


  /**
   * Queries ALL tile layers tile instances in the map for a specific gid
   * @param className 
   * @returns 
   */
  getTilesByGid(gid: number): TileInfo[] | IsometricTileInfo[] {
    if (this.map.orientation === 'orthogonal') {
      let results: TileInfo[] = [];
      for (let layer of this.getTileLayers()) {
        results = results.concat(layer.getTilesByGid(gid));
      }
      return results;
    } else {
      let results: IsometricTileInfo[] = [];
      for (let layer of this.getIsoTileLayers()) {
        results = results.concat(layer.getTilesByGid(gid));
      }
      return results;
    }
  }

  /**
   * Queries ALL tile layers tile instances in the map for a specific class name (case insensitive)
   * @param className 
   * @returns 
   */
  getTilesByClassName(className: string): TileInfo[] | IsometricTileInfo[] {
    if (this.map.orientation === 'orthogonal') {
      let results: TileInfo[] = [];
      for (let layer of this.getTileLayers()) {
        results = results.concat(layer.getTilesByClassName(className));
      }
      return results;
    } else {
      let results: IsometricTileInfo[] = [];
      for (let layer of this.getIsoTileLayers()) {
        results = results.concat(layer.getTilesByClassName(className));
      }
      return results;
    }
  }

  /**
   *  Queries ALL tile layers tile instances in the map for a specific property and an optional value (case insensitive)
   * @param name 
   * @param value 
   * @returns 
   */
  getTilesByProperty(name: string, value?: any): TileInfo[] | IsometricTileInfo[] {
    if (this.map.orientation === 'orthogonal') {
      let results: TileInfo[] = [];
      for (let layer of this.getTileLayers()) {
        results = results.concat(layer.getTilesByProperty(name, value));
      }
      return results;
    } else {
      let results: IsometricTileInfo[] = [];
      for (let layer of this.getIsoTileLayers()) {
        results = results.concat(layer.getTilesByProperty(name, value));
      }
      return results;
    }
  }

  /**
   * Returns a tile by the world position from a layer. (Uses the first layer name that matches case insensitive).
   * @param layerName 
   * @param worldPos 
   * @returns 
   */
  getTileByPoint(layerName: string, worldPos: Vector): TileInfo | IsometricTileInfo | null {
    if (this.map.orientation === 'isometric') {
      const layer = this.getIsoTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
        return layer.getTileByPoint(worldPos);
      }
    } else {
      const layer = this.getTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
        return layer.getTileByPoint(worldPos);
      }
    }

    return null;
  }

  /**
   * Returns a tile by x, y integer coordinate from a layer. (Uses the first layer name that matches case insensitive).
   * @param layerName 
   * @param x 
   * @param y 
   */
  getTileByCoordinate(layerName: string, x: number, y: number): TileInfo | IsometricTileInfo | null {
    if (this.map.orientation === 'isometric') {
      const layer = this.getIsoTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
        return layer.getTileByCoordinate(x, y);
      }
    } else {
      const layer = this.getTileLayers().find(byNameCaseInsensitive(layerName));
      if (layer) {
        return layer.getTileByCoordinate(x, y);
      }
    }

    return null;
  }

  /**
   * Returns a tile by the world position from a layer. (Uses the first layer name that matches case insensitive).
   * @param layerName 
   * @param worldPos 
   * @returns 
   */
  getTilesByPoint(worldPos: Vector): TileInfo[] | IsometricTileInfo[] {
    if (this.map.orientation === 'orthogonal') {
      let results: TileInfo[] = [];
      for (let layer of this.getTileLayers()) {
        const maybeTile = layer.getTileByPoint(worldPos);
        if (maybeTile) {
          results.push(maybeTile);
        }
      }
      return results;
    } else {
      let results: IsometricTileInfo[] = [];
      for (let layer of this.getIsoTileLayers()) {
        const maybeTile = layer.getTileByPoint(worldPos);
        if (maybeTile) {
          results.push(maybeTile);
        }
      }
      return results;
    }
  }

  /**
   * Returns a tile by the world position from a layer. (Uses the first layer name that matches case insensitive).
   * @param layerName 
   * @param worldPos 
   * @returns 
   */
  getTilesByCoordinate(x: number, y: number): TileInfo[] | IsometricTileInfo[] {
    if (this.map.orientation === 'orthogonal') {
      let results: TileInfo[] = [];
      for (let layer of this.getTileLayers()) {
        const maybeTile = layer.getTileByCoordinate(x, y);
        if (maybeTile) {
          results.push(maybeTile);
        }
      }
      return results;
    } else {
      let results: IsometricTileInfo[] = [];
      for (let layer of this.getIsoTileLayers()) {
        const maybeTile = layer.getTileByCoordinate(x, y);
        if (maybeTile) {
          results.push(maybeTile);
        }
      }
      return results;
    }
  }

  /**
   * Queries all layers for objects that match a name (case insensitive)
   * @param name 
   * @returns 
   */
  getObjectsByName(name: string): PluginObject[] {
    let results: PluginObject[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getObjectsByName(name));
    }
    return results;
  }

  getEntitiesByName(name: string): Entity[] {
    let results: Entity[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getEntitiesByName(name));
    }
    return results;
  }

  getEntityByObject(object: PluginObject): Entity | undefined {
    for (let objectlayer of this.getObjectLayers()) {
      const entity = objectlayer.getEntityByObject(object);
      if (entity) {
        return entity;
      }
    }
    return;
  }

  getObjectByEntity(actor: Entity): PluginObject | undefined {
    for (let objectlayer of this.getObjectLayers()) {
      const object = objectlayer.getObjectByEntity(actor);
      if (object) {
        return object;
      }
    }
    return;
  }

  /**
   * Search for a tiled object that has a property name, and optionally specify a value
   * @param propertyName 
   * @param value 
   * @returns 
   */
  getObjectsByProperty(propertyName: string, value?: any): PluginObject[] {
    let results: PluginObject[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getObjectsByProperty(propertyName, value));
    }
    return results;
  }
  /**
   * Search for actors that were created from tiled objects
   * @returns 
   */
  getEntitiesByProperty(propertyName: string, value?: any): Entity[] {
    let results: Entity[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getEntitiesByProperty(propertyName, value));
    }
    return results;
  }

  /**
   * Search for an Tiled object by it's Tiled class name
   * @returns 
   */
  getObjectsByClassName(className: string): PluginObject[] {
    let results: PluginObject[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getObjectsByClassName(className));
    }
    return results;
  }

  /**
   * Search for an Actor created by the plugin by it's Tiled object
   * @param className 
   * @returns 
   */
  getEntitiesByClassName(className: string): Entity[] {
    let results: Entity[] = [];
    for (let objectlayer of this.getObjectLayers()) {
      results = results.concat(objectlayer.getEntitiesByClassName(className));
    }
    return results;
  }

  getImageLayers(name?: string): ImageLayer[] {
    const layers = this.layers.filter(l => l instanceof ImageLayer) as ImageLayer[];
    if (name) {
      return layers.filter(byNameCaseInsensitive(name));
    }
    return layers;
  }

  getTileLayers(name?: string): TileLayer[] {
    const layers = this.layers.filter(l => l instanceof TileLayer) as TileLayer[];
    if (name) {
      return layers.filter(byNameCaseInsensitive(name));
    }
    return layers;
  }

  getIsoTileLayers(name?: string): IsoTileLayer[] {
    const layers = this.layers.filter(l => l instanceof IsoTileLayer) as IsoTileLayer[];
    if (name) {
      return layers.filter(byNameCaseInsensitive(name));
    }
    return layers;
  }

  getObjectLayers(name?: string): ObjectLayer[] {
    const layers = this.layers.filter(l => l instanceof ObjectLayer) as ObjectLayer[];
    if (name) {
      return layers.filter(byNameCaseInsensitive(name));
    }
    return layers;
  }

  getLayersByName(name: string): Layer[] {
    return this.layers.filter(byNameCaseInsensitive(name));
  }

  getLayersByClassName(className: string): Layer[] {
    return this.layers.filter(byClassCaseInsensitive(className));
  }

  getLayersByProperty(propertyName: string, value?: any): Layer[] {
    return this.layers.filter(byProperty(propertyName, value));
  }

  private _parseMap(data: any) {
    if (this.mapFormat === 'TMX') {
      return this.parser.parse(data, this.strict);
    } else {
      return data as TiledMap;
    }
  }

  async load(): Promise<any> {
    const data = await this.fileLoader(this.path, this.mapFormat === 'TMX' ? 'xml' : 'json');

    // Parse initial Tiled map structure
    let map: TiledMap;
    if (this.strict) {
      try {
        map = this._parseMap(data);
      } catch (e) {
        console.error(`Could not parse tiled map from location ${this.path}, attempted to interpret as ${this.mapFormat}.\nExcalibur only supports the latest version of Tiled formats as of the plugin's release.`);
        console.error(`Is your map file corrupted or being interpreted as the wrong type?`)
        throw e;
      }
    } else {
      map = this._parseMap(data);
    }

    if (compare(TiledResource.supportedTiledVersion, map.tiledversion ?? '0.0.0', ">")) {
      console.warn(`The excalibur tiled plugin officially supports ${TiledResource.supportedTiledVersion}+, the current map has tiled version ${map.tiledversion}`)
    }

    this.map = map;

    this._collectTilesets();
    this._collectTemplates();

    // Load all the stuff!
    await Promise.all([
      this._tilesetLoader.load(),
      (this.headless ? Promise.resolve() : this._imageLoader.load()),
      this._templateLoader.load()
    ]);

    // Friendly data structures are needed before layer parsing
    this.tilesets = [...this.tilesets, ...this._tilesetLoader.values().map(t => t.data)];
    this.templates = this._templateLoader.values().map(t => t.data);

    // Layers
    let friendlyLayers: Layer[] = [];
    let order = this.startZIndex;
    for (const layer of this.map.layers) {
      if (layer.type === 'tilelayer') {
        if (this.map.orientation === 'isometric') {
          const isolayer = new IsoTileLayer(layer, this, order);
          friendlyLayers.push(isolayer);
        }
        if (this.map.orientation === 'orthogonal') {
          const tilelayer = new TileLayer(layer, this, order);
          friendlyLayers.push(tilelayer);
        }
      }
      if (layer.type === 'objectgroup') {
        const objectlayer = new ObjectLayer(layer, this, order);
        friendlyLayers.push(objectlayer);
      }
      if (layer.type === 'imagelayer') {
        const imagelayer = new ImageLayer(layer, this, order);
        friendlyLayers.push(imagelayer);
      }
      order++;
    }
    // Layer loading depends on data from previous load step
    await Promise.all(friendlyLayers.map(layer => layer.load()));
    this.layers = friendlyLayers;
  }

  private _collectTilesets() {
    // Resolve initial tilesets either embedded or external
    for (const tileset of this.map.tilesets) {
      // Embedded are technically already loaded
      if (isTiledTilesetEmbedded(tileset)) {
        if (isTiledTilesetSingleImage(tileset)) {
          const imagePath = pathRelativeToBase(this.path, tileset.image, this.pathMap);
          const image = this._imageLoader.getOrAdd(imagePath);
          const friendlyTileset = new Tileset({
            name: tileset.name,
            tiledTileset: tileset,
            image,
            firstGid: tileset.firstgid!
          });
          this.tilesets.push(friendlyTileset);
        }
        if (isTiledTilesetCollectionOfImages(tileset)) {
          const tileToImage = new Map<TiledTile, ImageSource>();
          if (tileset.tiles) {
            for (let tile of tileset.tiles) {
              if (tile.image) {
                const imagePath = pathRelativeToBase(this.path, tile.image, this.pathMap);
                const image = this._imageLoader.getOrAdd(imagePath);
                tileToImage.set(tile, image);
              }
            }
          }
          const friendlyTileset = new Tileset({
            name: tileset.name,
            tiledTileset: tileset,
            tileToImage,
            firstGid: tileset.firstgid!
          });
          this.tilesets.push(friendlyTileset);
        }
      }
      if (isTiledTilesetExternal(tileset)) {
        const sourcePath = pathRelativeToBase(this.path, tileset.source, this.pathMap);
        this._tilesetLoader.getOrAdd(sourcePath, tileset.firstgid,
          {
            strict: this.strict,
            headless: this.headless,
            parser: this.parser,
            fileLoader: this.fileLoader,
            imageLoader: this._imageLoader,
            pathMap: this.pathMap
          } satisfies TilesetResourceOptions);
      }
    }
  }

  private _collectTemplates() {
    // Scan for template references in object files
    let templates: string[] = [];
    for (const layer of this.map.layers) {
      if (layer.type === 'objectgroup') {
        let templateObjects = layer.objects.filter(o => o.template).map(o => o.template) as string[];
        templates = templates.concat(templateObjects);
      }
    }
    // unique template paths
    const uniqueTemplatePaths = templates.filter((value, index, array) => {
      return array.findIndex(path => path === value) === index;
    });

    // Load Friendly templates
    for (const templatePath of uniqueTemplatePaths) {
      const mappedPath = pathRelativeToBase(this.path, templatePath, this.pathMap);
      this._templateLoader.getOrAdd(mappedPath, {
        strict: this.strict,
        headless: this.headless,
        parser: this.parser,
        fileLoader: this.fileLoader,
        imageLoader: this._imageLoader,
        pathMap: this.pathMap
      } satisfies TemplateResourceOptions)
    }
  }

  addToScene(scene: Scene, options?: TiledAddToSceneOptions) {
    if (!this.isLoaded()) {
      this.logger.warn(`TiledResource ${this.path} is not loaded! Nothing will be wired into excalibur!`);
      return;
    }
    const defaultOptions: TiledAddToSceneOptions = {
      pos: vec(0, 0)
    };
    const { pos } = { ...defaultOptions, ...options };
    for (const layer of this.layers) {
      if (layer instanceof TileLayer) {
        layer.tilemap.pos = layer.tilemap.pos.add(pos);
        scene.add(layer.tilemap);
      }
      if (layer instanceof IsoTileLayer) {
        scene.add(layer.isometricMap);
      }
      if (layer instanceof ObjectLayer) {
        for (const entity of layer.entities) {
          const tx = entity.get(TransformComponent);
          if (tx) {
            tx.pos = tx.pos.add(pos);
          }
          scene.add(entity);
        }
      }
      if (layer instanceof ImageLayer) {
        if (layer.imageActor) {
          layer.imageActor.pos = layer.imageActor.pos.add(pos);
          scene.add(layer.imageActor);
        }
      }
    }

    if (this.useExcaliburWiring) {
      const objects = this.getObjectsByProperty(ExcaliburTiledProperties.Camera.Camera, true);
      if (objects && objects.length) {
        const cameraObject = objects[0];
        let zoom = 1;
        const zoomProp = cameraObject.properties.get(ExcaliburTiledProperties.Camera.Zoom);
        if (zoomProp && typeof zoomProp === 'number') {
          zoom = zoomProp;
        }

        if (this.map.orientation === 'isometric') {
          scene.camera.pos = this.isometricTiledCoordToWorld(cameraObject.x, cameraObject.y);
        } else {
          scene.camera.pos = vec(cameraObject.x, cameraObject.y);
        }
        scene.camera.zoom = zoom;
      }
    }

    if (this.useTilemapCameraStrategy) {
      const firstLayer = this.getTileLayers()[0];
      if (firstLayer) {
        const mapBounds = BoundingBox.fromDimension(
          this.map.width * this.map.tilewidth,
          this.map.height * this.map.tileheight,
          Vector.Zero, pos.add(firstLayer.tilemap.pos));
        scene.camera.strategy.limitCameraBounds(mapBounds);
      }
    }

    if (this.useMapBackgroundColor) {
      if (this.map.backgroundcolor) {
        scene.backgroundColor = Color.fromHex(this.map.backgroundcolor);
      }
    }
  }

  isometricTiledCoordToWorld(x: number, y: number): Vector {
    // Transformation sourced from:
    // https://discourse.mapeditor.org/t/how-to-get-cartesian-coords-of-objects-from-tileds-isometric-map/4623/3
    const originX = 0;
    const tileWidth = this.map.tilewidth;
    const tileHeight = this.map.tileheight;
    const tileY = y / tileHeight;
    const tileX = x / tileHeight;
    return vec(
      (tileX - tileY) * tileWidth / 2 + originX,
      (tileX + tileY) * tileHeight / 2);
  }

  isLoaded(): boolean {
    return !!this.map;
  }
}
