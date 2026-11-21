/**
 * TerraSpectra — Layer Factory (Day 3 Deliverable)
 *
 * Converts backend prediction geometry into Deck.gl layer data objects.
 *
 * IMPORTANT: Coordinate order, CRS, geometry format, and class categories
 * are PENDING confirmation from the backend team (Kanishka).
 *
 * This factory supports:
 *   • GeoJSON Polygon features (tile/plot overlays)
 *   • GeoJSON Point features (marker pins)
 *
 * When real backend data arrives, update the CLASS_COLORS map and ensure
 * the GeoJSON coordinate order matches the backend's CRS (default: WGS-84,
 * longitude first → [lng, lat]).
 */

// ─── CLASS DISPLAY CONFIGURATION ──────────────────────────────────────────────
// TODO: Update with actual output classes from the backend model.
// These are PROVISIONAL demo categories used only for visual testing.

export const CLASS_COLORS = {
  healthy:   [56, 167, 72, 180],   // green  (rgba)
  diseased:  [220, 54, 54, 180],   // red
  uncertain: [245, 184, 45, 180],  // amber
  demo:      [64, 145, 108, 180],  // paddy green — clearly provisional
};

export const CLASS_LABELS = {
  healthy:   "Healthy (Demo)",
  diseased:  "Diseased (Demo)",
  uncertain: "Uncertain (Demo)",
  demo:      "Demo — Awaiting backend",
};

/**
 * Resolve a class string to its RGBA colour.
 * Falls back to the "demo" colour for any unrecognized class.
 *
 * @param {string} className
 * @returns {number[]} RGBA array [r, g, b, a]
 */
export function colorForClass(className) {
  const key = (className || "").toLowerCase().trim();
  return CLASS_COLORS[key] ?? CLASS_COLORS.demo;
}

/**
 * Build a Deck.gl GeoJsonLayer configuration from an array of GeoJSON features.
 * 
 * Works with native @deck.gl/layers when installed, and provides a robust
 * layer specification descriptor for Deck.gl rendering engines.
 *
 * @param {string}   id       — unique layer id
 * @param {object[]} features — array of GeoJSON Feature objects
 * @param {object}   [opts]   — optional overrides for the layer
 * @returns {object} Layer instance or specification
 */
export function buildPredictionLayer(id, features, opts = {}) {
  if (!features || features.length === 0) return null;

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const LayerClass = typeof window !== "undefined" && window?.deck?.GeoJsonLayer;
  if (LayerClass) {
    return new LayerClass({
      id,
      data: geojson,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: false,
      lineWidthMinPixels: 1,
      getFillColor: (f) => colorForClass(f.properties?.class),
      getLineColor: [24, 59, 42, 220],
      getLineWidth: 1.5,
      getPointRadius: 80,
      pointRadiusMinPixels: 6,
      pointType: "circle",
      ...opts,
    });
  }

  // Standard Deck.gl GeoJsonLayer specification descriptor
  return {
    id,
    type: "GeoJsonLayer",
    data: geojson,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    lineWidthMinPixels: 1,
    getFillColor: (f) => colorForClass(f.properties?.class),
    getLineColor: [24, 59, 42, 220],
    getLineWidth: 1.5,
    getPointRadius: 80,
    pointRadiusMinPixels: 6,
    pointType: "circle",
    ...opts,
  };
}

export default { buildPredictionLayer, colorForClass, CLASS_COLORS, CLASS_LABELS };
