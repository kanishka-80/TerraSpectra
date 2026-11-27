/**
 * TerraSpectra — Prediction Layer Sample Fixtures (Day 3 Deliverable)
 *
 * Provides contract-compliant GeoJSON fixtures for local Deck.gl map visualization.
 *
 * Geospatial Specifications:
 *   • CRS: EPSG:4326 (WGS-84)
 *   • Coordinate Order: [longitude, latitude]
 *   • Classification: Aligned with Harsh's ML contract (healthy, stressed, unclassified_nodata)
 *   • All sample features are clearly stamped with { _isMock: true }
 */

import {
  buildPredictionLayer,
  buildStressAlertLayer,
  buildTileBoundaryLayer,
} from "./layerFactory.js";

// ─── CONTRACT-COMPLIANT SAMPLE FEATURES (SAMPLE/DEMO ONLY) ───────────────────

export const SAMPLE_FEATURES = [
  // Tile 1: Confirmed "healthy" field sector
  {
    type: "Feature",
    id: "tile_sec_001",
    properties: {
      tile_id: "tile_sec_001",
      label: "Paddy Sector Alpha (North)",
      class: "healthy",
      confidence: 0.942,
      uncertainty: 0.038,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "tile_sec_001",
        sensor: "AVIRIS-NG",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "32x32 px (16m GSD)",
        model_name: "3D-CNN Baseline",
        model_version: "v0.1.0",
      },
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.200, 13.080],
          [80.206, 13.080],
          [80.206, 13.086],
          [80.200, 13.086],
          [80.200, 13.080],
        ],
      ],
    },
  },
  // Tile 2: Confirmed "stressed" field sector (Early physiological alert)
  {
    type: "Feature",
    id: "tile_sec_002",
    properties: {
      tile_id: "tile_sec_002",
      label: "Paddy Sector Beta (Stress Alert)",
      class: "stressed",
      confidence: 0.887,
      uncertainty: 0.082,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "tile_sec_002",
        sensor: "AVIRIS-NG",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "32x32 px (16m GSD)",
        model_name: "3D-CNN Baseline",
        model_version: "v0.1.0",
      },
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.207, 13.080],
          [80.213, 13.080],
          [80.213, 13.086],
          [80.207, 13.086],
          [80.207, 13.080],
        ],
      ],
    },
  },
  // Tile 3: Confirmed "healthy" field sector
  {
    type: "Feature",
    id: "tile_sec_003",
    properties: {
      tile_id: "tile_sec_003",
      label: "Paddy Sector Gamma (East)",
      class: "healthy",
      confidence: 0.915,
      uncertainty: 0.045,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "tile_sec_003",
        sensor: "AVIRIS-NG",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "32x32 px (16m GSD)",
        model_name: "3D-CNN Baseline",
        model_version: "v0.1.0",
      },
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.200, 13.087],
          [80.206, 13.087],
          [80.206, 13.093],
          [80.200, 13.093],
          [80.200, 13.087],
        ],
      ],
    },
  },
  // Tile 4: Unclassified NoData / Canal corridor
  {
    type: "Feature",
    id: "tile_sec_004",
    properties: {
      tile_id: "tile_sec_004",
      label: "Irrigation Canal / Masked NoData",
      class: "unclassified_nodata",
      confidence: 0.99,
      uncertainty: 0.01,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "tile_sec_004",
        sensor: "AVIRIS-NG",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "32x32 px (16m GSD)",
        model_name: "3D-CNN Baseline",
        model_version: "v0.1.0",
      },
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [80.207, 13.087],
          [80.213, 13.087],
          [80.213, 13.093],
          [80.207, 13.093],
          [80.207, 13.087],
        ],
      ],
    },
  },
  // Point observation 1: Ground validation marker (healthy)
  {
    type: "Feature",
    id: "pt_obs_001",
    properties: {
      feature_id: "pt_obs_001",
      label: "Spectral Ground Sensor 01",
      class: "healthy",
      confidence: 0.965,
      uncertainty: 0.021,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "pt_obs_001",
        sensor: "In-Situ ASD FieldSpec",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "Point coordinate",
        model_name: "Field Verification Sensor",
        model_version: "v1.0",
      },
    },
    geometry: {
      type: "Point",
      coordinates: [80.203, 13.083],
    },
  },
  // Point observation 2: Ground validation marker (stressed)
  {
    type: "Feature",
    id: "pt_obs_002",
    properties: {
      feature_id: "pt_obs_002",
      label: "Spectral Ground Sensor 02 (Alert)",
      class: "stressed",
      confidence: 0.892,
      uncertainty: 0.076,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_01",
        tile_id: "pt_obs_002",
        sensor: "In-Situ ASD FieldSpec",
        acquisition_date: "2026-10-15",
        crs: "EPSG:4326",
        dimensions: "Point coordinate",
        model_name: "Field Verification Sensor",
        model_version: "v1.0",
      },
    },
    geometry: {
      type: "Point",
      coordinates: [80.210, 13.083],
    },
  },
  // MultiPolygon Feature: Disjoint Field Plots
  {
    type: "Feature",
    id: "tile_sec_005_multi",
    properties: {
      tile_id: "tile_sec_005_multi",
      label: "Paddy Sector Delta (Disjoint Plots)",
      class: "healthy",
      confidence: 0.925,
      uncertainty: 0.035,
      _isMock: true,
      metadata: {
        scene_id: "AVIRIS_CHENNAI_RICE_02",
        tile_id: "tile_sec_005_multi",
        sensor: "AVIRIS-NG",
        acquisition_date: "2026-10-16",
        crs: "EPSG:4326",
        dimensions: "MultiPolygon (2 plots)",
        model_name: "3D-CNN Baseline",
        model_version: "v0.1.0",
      },
    },
    geometry: {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [80.214, 13.080],
            [80.218, 13.080],
            [80.218, 13.084],
            [80.214, 13.084],
            [80.214, 13.080],
          ],
        ],
        [
          [
            [80.214, 13.085],
            [80.218, 13.085],
            [80.218, 13.089],
            [80.214, 13.089],
            [80.214, 13.085],
          ],
        ],
      ],
    },
  },
];

// ─── REUSABLE BUILDERS ────────────────────────────────────────────────────────

/**
 * Build the prediction overlay layer.
 *
 * @param {object[]} [features]
 * @param {object} [opts]
 * @returns {import("@deck.gl/layers").GeoJsonLayer|null}
 */
export function createPredictionLayer(features, opts = {}) {
  const data = features && features.length > 0 ? features : SAMPLE_FEATURES;
  return buildPredictionLayer("prediction-overlay-layer", data, opts);
}

/**
 * Build the stress alert highlight layer.
 *
 * @param {object[]} [features]
 * @param {object} [opts]
 * @returns {import("@deck.gl/layers").GeoJsonLayer|null}
 */
export function createAlertLayer(features, opts = {}) {
  const data = features && features.length > 0 ? features : SAMPLE_FEATURES;
  return buildStressAlertLayer("stress-alert-layer", data, opts);
}

/**
 * Build the tile boundary outline layer.
 *
 * @param {object[]} [features]
 * @param {object} [opts]
 * @returns {import("@deck.gl/layers").GeoJsonLayer|null}
 */
export function createTileBoundaryLayer(features, opts = {}) {
  const data = features && features.length > 0 ? features : SAMPLE_FEATURES;
  return buildTileBoundaryLayer("tile-boundaries-layer", data, opts);
}

export default {
  SAMPLE_FEATURES,
  createPredictionLayer,
  createAlertLayer,
  createTileBoundaryLayer,
};
