/**
 * TerraSpectra — Prediction Layer
 *
 * Provides sample GeoJSON data for local visual testing on the Deck.gl map.
 *
 * IMPORTANT
 * ─────────
 * • ALL coordinates and class labels below are DEMO PLACEHOLDERS.
 * • They do NOT represent real disease predictions, real confidence values,
 *   or real geographic locations.
 * • Replace SAMPLE_FEATURES with actual backend response geometry once
 *   Kanishka confirms the prediction endpoint contract.
 * • Coordinate order: [longitude, latitude] (WGS-84) — verify this with
 *   the backend before using real outputs.
 */

import { buildPredictionLayer } from "./layerFactory.js";

// ─── SAMPLE GEOJSON FEATURES (DEMO ONLY) ─────────────────────────────────────
// A small grid of polygon tiles and point markers to visually verify that the
// layer renders correctly on the Deck.gl map.
//
// Located roughly over a generic rice-growing region for visual plausibility.
// These are NOT real field boundaries, NOT real prediction outputs.

export const SAMPLE_FEATURES = [
  // Polygon tile 1 — demo "healthy" label
  {
    type: "Feature",
    properties: { class: "demo", label: "Demo Tile A" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [80.200, 13.080],
        [80.205, 13.080],
        [80.205, 13.085],
        [80.200, 13.085],
        [80.200, 13.080],
      ]],
    },
  },
  // Polygon tile 2 — demo label
  {
    type: "Feature",
    properties: { class: "demo", label: "Demo Tile B" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [80.206, 13.080],
        [80.211, 13.080],
        [80.211, 13.085],
        [80.206, 13.085],
        [80.206, 13.080],
      ]],
    },
  },
  // Polygon tile 3 — demo label
  {
    type: "Feature",
    properties: { class: "demo", label: "Demo Tile C" },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [80.200, 13.086],
        [80.205, 13.086],
        [80.205, 13.091],
        [80.200, 13.091],
        [80.200, 13.086],
      ]],
    },
  },
  // Point marker 1
  {
    type: "Feature",
    properties: { class: "demo", label: "Demo Point 1" },
    geometry: { type: "Point", coordinates: [80.208, 13.088] },
  },
  // Point marker 2
  {
    type: "Feature",
    properties: { class: "demo", label: "Demo Point 2" },
    geometry: { type: "Point", coordinates: [80.203, 13.083] },
  },
];

/**
 * Build the demo prediction layer for visual testing.
 *
 * @param {object[]} [features] — override with real backend features
 * @returns {import("@deck.gl/layers").GeoJsonLayer | null}
 */
export function createPredictionLayer(features) {
  const data = features && features.length > 0 ? features : SAMPLE_FEATURES;
  return buildPredictionLayer("prediction-overlay", data);
}

export default { createPredictionLayer, SAMPLE_FEATURES };
