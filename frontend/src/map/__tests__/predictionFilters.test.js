/**
 * TerraSpectra — Prediction Filters & Geometry Tests
 *
 * Week 3 Day 3 Deliverable
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateFeatureBounds,
  filterSpatialFeatures,
  getFeatureClass,
  getFeatureId,
  isAlertFeature,
  buildPredictionLayer,
  buildStressAlertLayer,
  buildTileBoundaryLayer,
} from "../layers/layerFactory.js";

import {
  extractFilterOptions,
  applyPredictionFilters,
  getFeatureScene,
  getFeatureDate,
} from "../../hooks/usePredictionFilters.js";

import { SAMPLE_FEATURES } from "../layers/predictionLayer.js";

describe("Layer Factory Geometry Refinements (Day 3)", () => {
  it("should extract feature class from raw GeoJSON and adapted models", () => {
    assert.equal(getFeatureClass({ properties: { class: "healthy" } }), "healthy");
    assert.equal(getFeatureClass({ className: "stressed" }), "stressed");
    assert.equal(getFeatureClass(null), "demo");
  });

  it("should extract feature ID consistently", () => {
    assert.equal(getFeatureId({ id: "id_1" }), "id_1");
    assert.equal(getFeatureId({ stableId: "stable_1" }), "stable_1");
    assert.equal(getFeatureId({ properties: { tile_id: "tile_p1" } }), "tile_p1");
  });

  it("should detect alert features correctly", () => {
    assert.equal(isAlertFeature({ isAlert: true }), true);
    assert.equal(isAlertFeature({ properties: { class: "stressed" } }), true);
    assert.equal(isAlertFeature({ properties: { class: "healthy" } }), false);
    assert.equal(isAlertFeature(null), false);
  });

  it("should filter out non-spatial features lacking coordinates", () => {
    const mixed = [
      { id: "1", geometry: { type: "Point", coordinates: [80.2, 13.0] } },
      { id: "2", geometry: null },
      { id: "3", geometry: { type: "Polygon", coordinates: [] } },
      { id: "4" },
    ];

    const spatial = filterSpatialFeatures(mixed);
    assert.equal(spatial.length, 1);
    assert.equal(spatial[0].id, "1");
  });

  it("should calculate correct bounding box across Polygon, MultiPolygon, and Point", () => {
    const multiGeomFeatures = [
      {
        geometry: {
          type: "Point",
          coordinates: [80.201, 13.081],
        },
      },
      {
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [80.210, 13.085],
                [80.220, 13.085],
                [80.220, 13.095],
                [80.210, 13.095],
                [80.210, 13.085],
              ],
            ],
          ],
        },
      },
    ];

    const bounds = calculateFeatureBounds(multiGeomFeatures);
    assert.ok(bounds);
    const [minLon, minLat, maxLon, maxLat] = bounds;
    assert.equal(minLon, 80.201);
    assert.equal(minLat, 13.081);
    assert.equal(maxLon, 80.220);
    assert.equal(maxLat, 13.095);
  });

  it("should return null for layer builders when all features are non-spatial", () => {
    const nonSpatial = [{ id: "tab_1", geometry: null, properties: { class: "stressed" } }];
    assert.equal(buildPredictionLayer("test", nonSpatial), null);
    assert.equal(buildStressAlertLayer("test", nonSpatial), null);
    assert.equal(buildTileBoundaryLayer("test", nonSpatial), null);
  });

  it("should construct layers successfully with MultiPolygon sample features", () => {
    const predLayer = buildPredictionLayer("test-multi", SAMPLE_FEATURES);
    const alertLayer = buildStressAlertLayer("test-alert", SAMPLE_FEATURES);
    const boundaryLayer = buildTileBoundaryLayer("test-bound", SAMPLE_FEATURES);

    assert.ok(predLayer);
    assert.ok(alertLayer);
    assert.ok(boundaryLayer);
  });
});

describe("Prediction Filtering Logic (Day 3)", () => {
  it("should extract metadata scene and date accurately", () => {
    const feat = {
      properties: {
        tile_id: "tile_test",
        metadata: {
          scene_id: "SCENE_TEST_01",
          acquisition_date: "2026-10-15T12:00:00Z",
        },
      },
    };

    assert.equal(getFeatureScene(feat), "SCENE_TEST_01");
    assert.equal(getFeatureDate(feat), "2026-10-15");
  });

  it("should extract dynamic filter options from feature collection", () => {
    const options = extractFilterOptions(SAMPLE_FEATURES);

    assert.ok(options.scenes.length >= 2);
    assert.ok(options.scenes.includes("AVIRIS_CHENNAI_RICE_01"));
    assert.ok(options.scenes.includes("AVIRIS_CHENNAI_RICE_02"));

    assert.ok(options.classes.includes("healthy"));
    assert.ok(options.classes.includes("stressed"));
    assert.ok(options.classes.includes("unclassified_nodata"));

    assert.ok(options.dates.includes("2026-10-15"));
    assert.ok(options.dates.includes("2026-10-16"));
  });

  it("should filter features by class", () => {
    const healthyOnly = applyPredictionFilters(SAMPLE_FEATURES, { classFilter: "healthy" });
    assert.ok(healthyOnly.length > 0);
    for (const f of healthyOnly) {
      assert.equal(getFeatureClass(f).toLowerCase(), "healthy");
    }

    const stressedOnly = applyPredictionFilters(SAMPLE_FEATURES, { classFilter: "stressed" });
    assert.ok(stressedOnly.length > 0);
    for (const f of stressedOnly) {
      assert.equal(getFeatureClass(f).toLowerCase(), "stressed");
    }
  });

  it("should filter features by scene", () => {
    const scene2Only = applyPredictionFilters(SAMPLE_FEATURES, {
      sceneFilter: "AVIRIS_CHENNAI_RICE_02",
    });

    assert.equal(scene2Only.length, 1);
    assert.equal(getFeatureScene(scene2Only[0]), "AVIRIS_CHENNAI_RICE_02");
  });

  it("should filter features by acquisition date", () => {
    const dateFiltered = applyPredictionFilters(SAMPLE_FEATURES, {
      dateFilter: "2026-10-16",
    });

    assert.equal(dateFiltered.length, 1);
    assert.equal(getFeatureDate(dateFiltered[0]), "2026-10-16");
  });

  it("should filter features by search keyword query", () => {
    const searchResult = applyPredictionFilters(SAMPLE_FEATURES, {
      searchQuery: "Sector Alpha",
    });

    assert.equal(searchResult.length, 1);
    assert.equal(getFeatureId(searchResult[0]), "tile_sec_001");
  });

  it("should filter features using alerts only toggle", () => {
    const alerts = applyPredictionFilters(SAMPLE_FEATURES, {
      alertsOnly: true,
    });

    assert.ok(alerts.length > 0);
    for (const f of alerts) {
      assert.equal(isAlertFeature(f), true);
    }
  });

  it("should return empty array when filters match no features", () => {
    const emptyResult = applyPredictionFilters(SAMPLE_FEATURES, {
      searchQuery: "Nonexistent Sector 999",
    });

    assert.equal(emptyResult.length, 0);
  });

  it("should combine multiple filters simultaneously", () => {
    const combined = applyPredictionFilters(SAMPLE_FEATURES, {
      sceneFilter: "AVIRIS_CHENNAI_RICE_01",
      classFilter: "stressed",
      alertsOnly: true,
    });

    assert.ok(combined.length >= 1);
    for (const f of combined) {
      assert.equal(getFeatureScene(f), "AVIRIS_CHENNAI_RICE_01");
      assert.equal(getFeatureClass(f).toLowerCase(), "stressed");
    }
  });
});
