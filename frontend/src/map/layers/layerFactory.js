/**
 * TerraSpectra — Layer Factory (Day 3 Deliverable)
 *
 * Converts agreed backend prediction geometry into Deck.gl layer objects.
 *
 * Geospatial Specifications:
 *   • CRS: EPSG:4326 (WGS-84)
 *   • Coordinate Order: [longitude, latitude] (GeoJSON standard)
 *   • Layer Types: Tile Polygons, Boundary Outlines, Alert Highlights, Point Markers
 *   • Class Taxonomy: Aligned with Harsh's ML contract (ml/configs/classes.yaml)
 */

import { GeoJsonLayer } from "@deck.gl/layers";
import {
  CLASS_METADATA,
  CONFIRMED_CLASSES,
  isProvisionalClass,
} from "../../types/prediction.js";

// ─── CLASS COLORS & LABELS ────────────────────────────────────────────────────

export const CLASS_COLORS = {
  [CONFIRMED_CLASSES.HEALTHY]: CLASS_METADATA[CONFIRMED_CLASSES.HEALTHY].color,
  [CONFIRMED_CLASSES.STRESSED]: CLASS_METADATA[CONFIRMED_CLASSES.STRESSED].color,
  [CONFIRMED_CLASSES.NODATA]: CLASS_METADATA[CONFIRMED_CLASSES.NODATA].color,
  demo: CLASS_METADATA.demo.color,
  uncertain: CLASS_METADATA.uncertain.color,
};

export const CLASS_LABELS = {
  [CONFIRMED_CLASSES.HEALTHY]: CLASS_METADATA[CONFIRMED_CLASSES.HEALTHY].name,
  [CONFIRMED_CLASSES.STRESSED]: CLASS_METADATA[CONFIRMED_CLASSES.STRESSED].name,
  [CONFIRMED_CLASSES.NODATA]: CLASS_METADATA[CONFIRMED_CLASSES.NODATA].name,
  demo: CLASS_METADATA.demo.name,
  uncertain: CLASS_METADATA.uncertain.name,
};

/**
 * Resolve RGBA color for a given class name.
 *
 * @param {string} className
 * @param {number} [opacity=190]
 * @returns {number[]} [r, g, b, a]
 */
export function colorForClass(className, opacity = null) {
  const key = (className || "").toLowerCase().trim();
  const base = CLASS_COLORS[key] || CLASS_COLORS.demo;
  if (opacity !== null) {
    return [base[0], base[1], base[2], opacity];
  }
  return base;
}

// ─── GEOSPATIAL VALIDATION HELPERS ───────────────────────────────────────────

/**
 * Validate that a coordinate pair conforms to [longitude, latitude] in EPSG:4326.
 *
 * @param {number[]} coord
 * @returns {boolean}
 */
export function isValidCoordinate(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const [lon, lat] = coord;
  return (
    typeof lon === "number" &&
    typeof lat === "number" &&
    !isNaN(lon) &&
    !isNaN(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/**
 * Calculate the bounding box [minLon, minLat, maxLon, maxLat] from a collection of features.
 *
 * @param {object[]} features
 * @returns {number[]|null}
 */
export function calculateFeatureBounds(features) {
  if (!features || features.length === 0) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  const processCoord = (coord) => {
    if (isValidCoordinate(coord)) {
      const [lon, lat] = coord;
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  };

  for (const feature of features) {
    const geom = feature?.geometry;
    if (!geom) continue;

    if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
      processCoord(geom.coordinates);
    } else if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      for (const ring of geom.coordinates) {
        if (Array.isArray(ring)) {
          ring.forEach(processCoord);
        }
      }
    }
  }

  if (minLon === Infinity || minLat === Infinity) return null;
  return [minLon, minLat, maxLon, maxLat];
}

// ─── DECK.GL LAYER BUILDERS ───────────────────────────────────────────────────

/**
 * Build primary prediction overlay layer (filled polygons and points).
 *
 * @param {string} id - unique layer ID
 * @param {object[]} features - GeoJSON features
 * @param {object} [opts] - Layer options and event handlers
 * @returns {GeoJsonLayer|null}
 */
export function buildPredictionLayer(id, features, opts = {}) {
  if (!features || features.length === 0) return null;

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const {
    onClick,
    onHover,
    selectedFeatureId,
    opacity = 0.85,
    ...extraOpts
  } = opts;

  return new GeoJsonLayer({
    id: id || "prediction-overlay-layer",
    data: geojson,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    opacity,
    lineWidthMinPixels: 1.5,
    getFillColor: (feature) => {
      const isSelected =
        selectedFeatureId &&
        (feature.id === selectedFeatureId ||
          feature.properties?.tile_id === selectedFeatureId ||
          feature.properties?.feature_id === selectedFeatureId);

      const base = colorForClass(feature.properties?.class);
      // Brighten fill slightly when selected
      return isSelected ? [base[0], base[1], base[2], 240] : base;
    },
    getLineColor: (feature) => {
      const isSelected =
        selectedFeatureId &&
        (feature.id === selectedFeatureId ||
          feature.properties?.tile_id === selectedFeatureId ||
          feature.properties?.feature_id === selectedFeatureId);

      // Selected features get high-contrast golden highlight ring
      return isSelected ? [255, 215, 0, 255] : [24, 59, 42, 220];
    },
    getLineWidth: (feature) => {
      const isSelected =
        selectedFeatureId &&
        (feature.id === selectedFeatureId ||
          feature.properties?.tile_id === selectedFeatureId ||
          feature.properties?.feature_id === selectedFeatureId);

      return isSelected ? 4 : 1.5;
    },
    getPointRadius: 80,
    pointRadiusMinPixels: 6,
    pointType: "circle",
    onClick,
    onHover,
    updateTriggers: {
      getFillColor: [selectedFeatureId],
      getLineColor: [selectedFeatureId],
      getLineWidth: [selectedFeatureId],
    },
    ...extraOpts,
  });
}

/**
 * Build stress alert highlight layer (focuses specifically on stressed vegetation).
 *
 * @param {string} id
 * @param {object[]} features
 * @param {object} [opts]
 * @returns {GeoJsonLayer|null}
 */
export function buildStressAlertLayer(id, features, opts = {}) {
  const alertFeatures = (features || []).filter(
    (f) => f.properties?.class?.toLowerCase() === CONFIRMED_CLASSES.STRESSED
  );

  if (alertFeatures.length === 0) return null;

  return new GeoJsonLayer({
    id: id || "stress-alert-highlight-layer",
    data: {
      type: "FeatureCollection",
      features: alertFeatures,
    },
    pickable: true,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 2.5,
    getFillColor: [220, 54, 54, 120],
    getLineColor: [255, 60, 60, 255],
    getLineWidth: 3,
    getPointRadius: 100,
    pointRadiusMinPixels: 8,
    ...opts,
  });
}

/**
 * Build tile outline boundary layer.
 *
 * @param {string} id
 * @param {object[]} features
 * @param {object} [opts]
 * @returns {GeoJsonLayer|null}
 */
export function buildTileBoundaryLayer(id, features, opts = {}) {
  if (!features || features.length === 0) return null;

  return new GeoJsonLayer({
    id: id || "tile-boundaries-layer",
    data: {
      type: "FeatureCollection",
      features,
    },
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1,
    getLineColor: [100, 116, 139, 180],
    getLineWidth: 1,
    ...opts,
  });
}

export default {
  CLASS_COLORS,
  CLASS_LABELS,
  colorForClass,
  isValidCoordinate,
  calculateFeatureBounds,
  buildPredictionLayer,
  buildStressAlertLayer,
  buildTileBoundaryLayer,
  isProvisionalClass,
};
