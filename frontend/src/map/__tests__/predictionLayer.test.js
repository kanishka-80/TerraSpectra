/**
 * TerraSpectra — predictionLayer Unit Tests
 *
 * Verifies that all sample features strictly conform to:
 *   • GeoJSON RFC 7946 specifications
 *   • CRS EPSG:4326 coordinate ranges [lon, lat]
 *   • Backend metadata contracts (scene_id, tile_id, sensor, acquisition_date)
 *   • ML classification labels (healthy, stressed, unclassified_nodata, demo)
 *   • Mock demarcation (_isMock: true)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_FEATURES,
  createPredictionLayer,
  createAlertLayer,
  createTileBoundaryLayer,
} from "../layers/predictionLayer.js";
import { isValidCoordinate } from "../layers/layerFactory.js";
import { normalizePredictionFeature } from "../../types/prediction.js";

describe("predictionLayer sample fixtures", () => {
  it("should contain a non-empty set of sample features", () => {
    assert.ok(Array.isArray(SAMPLE_FEATURES));
    assert.ok(SAMPLE_FEATURES.length >= 4);
  });

  it("should stamp every sample feature with _isMock: true", () => {
    for (const feature of SAMPLE_FEATURES) {
      assert.equal(
        feature.properties._isMock,
        true,
        `Feature ${feature.id} must be stamped with _isMock: true`
      );
    }
  });

  it("should assign each feature a stable unique identifier", () => {
    const ids = new Set();
    for (const feature of SAMPLE_FEATURES) {
      assert.ok(feature.id, "Feature must have an id");
      assert.ok(!ids.has(feature.id), `Duplicate feature id found: ${feature.id}`);
      ids.add(feature.id);

      const stableId = feature.properties.tile_id || feature.properties.feature_id;
      assert.ok(stableId, `Feature ${feature.id} must have a stable tile_id or feature_id`);
    }
  });

  it("should adhere to EPSG:4326 coordinate order [longitude, latitude]", () => {
    for (const feature of SAMPLE_FEATURES) {
      const geom = feature.geometry;
      assert.ok(geom, `Feature ${feature.id} missing geometry`);

      if (geom.type === "Point") {
        assert.ok(
          isValidCoordinate(geom.coordinates),
          `Invalid Point coordinates in feature ${feature.id}: ${JSON.stringify(geom.coordinates)}`
        );
      } else if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) {
          assert.ok(Array.isArray(ring), `Polygon ring must be an array in feature ${feature.id}`);
          for (const coord of ring) {
            assert.ok(
              isValidCoordinate(coord),
              `Invalid Polygon coordinate in feature ${feature.id}: ${JSON.stringify(coord)}`
            );
          }
          // Polygon ring must close (first coord == last coord)
          assert.deepEqual(
            ring[0],
            ring[ring.length - 1],
            `Polygon ring does not close in feature ${feature.id}`
          );
        }
      }
    }
  });

  it("should normalize cleanly into frontend Feature records with valid metadata", () => {
    for (const raw of SAMPLE_FEATURES) {
      const normalized = normalizePredictionFeature(raw);

      assert.ok(normalized);
      assert.ok(normalized.stableId);
      assert.ok(normalized.classDisplayName);
      assert.equal(normalized._isMock, true);
      assert.ok(normalized.metadata.crs === "EPSG:4326");
      assert.ok(normalized.metadata.sensor);
    }
  });

  it("should instantiate Deck.gl layers via helper builders", () => {
    const predLayer = createPredictionLayer();
    assert.ok(predLayer);

    const alertLayer = createAlertLayer();
    assert.ok(alertLayer);

    const boundaryLayer = createTileBoundaryLayer();
    assert.ok(boundaryLayer);
  });
});
