/**
 * Type augmentation for leaflet.heat
 * https://github.com/Leaflet/Leaflet.heat
 *
 * leaflet.heat adds L.heatLayer() to the Leaflet namespace as a side-effect import.
 * There is no official @types package, so we declare the module and augment L here.
 */

// Tell TypeScript this is a side-effect module (no exports)
declare module "leaflet.heat" {
  const _: undefined;
  export default _;
}

// Augment the leaflet module to expose heatLayer
declare module "leaflet" {
  interface HeatLayerOptions {
    /** Minimum point opacity (0–1). Default 0.05 */
    minOpacity?: number;
    /** Maximum zoom level at which a single point has max radius. Default 18. */
    maxZoom?: number;
    /** Maximum point intensity. Default 1.0. */
    max?: number;
    /** Radius of each point (pixels). Default 25. */
    radius?: number;
    /** Amount of blur. Default 15. */
    blur?: number;
    /** Color gradient mapping 0–1 float → CSS color string. */
    gradient?: Record<number, string>;
  }

  /** A heatmap layer produced by L.heatLayer(). */
  interface HeatLayer extends Layer {
    setLatLngs(latlngs: Array<[number, number] | [number, number, number]>): this;
    addLatLng(latlng: [number, number] | [number, number, number]): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  /** Create a heatmap layer from an array of [lat, lng] or [lat, lng, intensity] tuples. */
  function heatLayer(
    latlngs: Array<[number, number] | [number, number, number]>,
    options?: HeatLayerOptions,
  ): HeatLayer;
}
