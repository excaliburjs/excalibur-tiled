
/**
 * Special excalibur properties
 */
export const ExcaliburTiledProperties = {
   Camera: {
      /**
       * Boolean property on an object to treat as the excalibur camera if truthy
       * 
       * Warning, the plugin will use the first object it finds with this property!
       */
      Camera: 'camera',
      Zoom: 'zoom'
   },
   Animation: {
      /**
       * String property with any value from the ex.AnimationStrategy enum (case insensitive)
       */
      Strategy: 'animationstrategy'
   },
   Layer: {
      /**
       * Boolean property on a TileLayer, if truthy any tile on the layer will be treated as solid
       * 
       * Boolean property on a ObjectLayer, if truthy any object will be created as an actor, objects
       * will have a default collision type of preventcollision, see the collisiontype property.
       */
      Solid: 'solid'
   },
   Collision: {
      /**
       * String property with any value from the ex.CollisionType enum (case insensitive)
       */
      Type: 'collisiontype'
   }
} as const;