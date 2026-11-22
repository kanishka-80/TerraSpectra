/**
 * TerraSpectra — layerFactory Unit Tests
 *
 * Verifies class color resolution, EPSG:4326 coordinate validation,
 * bounding box calculations, and Deck.gl layer constructors.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  colorForClass,
  isValidCoordinate,
  calculateFeatureBounds,
  buildPredictionLayer,
  buildStressAlertLayer,
  buildTileBoundaryLayer,
  CLASS_COLORS,
} from "../layers/layerFactory.js";
import { CONFIRMED_CLASSES } from "../../types/prediction.js";

describe("layerFactory", () => {
  describe("colorForClass", () => {
    it("should resolve emerald green for healthy vegetation", () => {
      const color = colorForClass(CONFIRMED_CLASSES.HEALTHY);
      assert.deepEqual(color, CLASS_COLORS.healthy);
    });

    it("should resolve red alert color for stressed vegetation", () => {
      const color = colorForClass(CONFIRMED_CLASSES.STRESSED);
      assert.deepEqual(color, CLASS_COLORS.stressed);
    });

    it("should resolve slate color for unclassified nodata", () => {
      const color = colorForClass(CONFIRMED_CLASSES.NODATA);
      assert.deepEqual(color, CLASS_COLORS.unclassified_nodata);
    });

    it("should fallback to demo color for unknown or unspecified classes", () => {
      const fallbackColor = colorForClass("unknown_crop_disease");
      assert.deepEqual(fallbackColor, CLASS_COLORS.demo);
    });

    it("should respect custom opacity override when supplied", () => {
      const color = colorForClass(CONFIRMED_CLASSES.HEALTHY, 255);
      assert.equal(color[3], 255);
    });
  });

  describe("isValidCoordinate", () => {
    it("should accept valid [lon, lat] coordinates within WGS-84 limits", () => {
      assert.equal(isValidCoordinate([80.205, 13.085]), true);
      assert.equal(isValidCoordinate([-122.4, 37.7]), true);
      assert.equal(isValidCoordinate([0, 0]), true);
      assert.equal(isValidCoordinate([180, 90]), true);
      assert.equal(isValidCoordinate([-180, -90]), true);
    });

    it("should reject out-of-range latitude (> 90 or < -90)", () => {
      assert.equal(isValidCoordinate([80.205, 95.0]), false);
      assert.equal(isValidCoordinate([80.205, -95.0]), false);
    });

    it("should reject out-of-range longitude (> 180 or < -180)", () => {
      assert.equal(isValidCoordinate([185.0, 13.085]), false);
      assert.equal(isValidCoordinate([-185.0, 13.085]), false);
    });

    it("should reject malformed non-numeric or short coordinates", () => {
      assert.equal(isValidCoordinate([]), false);
      assert.equal(isValidCoordinate([80.205]), false);
      assert.equal(isValidCoordinate(["80.205", "13.085"]), false);
      assert.equal(isValidCoordinate([NaN, 13.085]), false);
      assert.equal(isValidCoordinate(null), false);
    });
  });

  describe("calculateFeatureBounds", () => {
    it("should calculate correct bounding box [minLon, minLat, maxLon, maxLat] from polygon features", () => {
      const testFeatures = [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [80.200, 13.080],
                [80.210, 13.080],
                [80.210, 13.090],
                [80.200, 13.090],
                [80.200, 13.080],
              ],
            ],
          },
        },
      ];

      const bounds = calculateFeatureBounds(testFeatures);
      assert.deepEqual(bounds, [80.200, 13.080, 80.210, 13.090]);
    });

    it("should return null for empty or invalid feature lists", () => {
      assert.equal(calculateFeatureBounds([]), null);
      assert.equal(calculateFeatureBounds(null), null);
      assert.equal(calculateFeatureBounds([{ type: "Feature", geometry: null }]), null);
    });
  });

  describe("Deck.gl layer builders", () => {
    const mockFeatures = [
      {
        type: "Feature",
        id: "test_f1",
        properties: { class: "healthy", tile_id: "tile_1" },
        geometry: { type: "Point", coordinates: [80.205, 13.085] },
      },
      {
        type: "Feature",
        id: "test_f2",
        properties: { class: "stressed", tile_id: "tile_2" },
        geometry: { type: "Point", coordinates: [80.208, 13.088] },
      },
    ];

    it("should return null when building layer with empty features", () => {
      assert.equal(buildPredictionLayer("test", []), null);
      assert.equal(buildTileBoundaryLayer("test", []), null);
    });

    it("should construct a valid GeoJsonLayer for prediction features", () => {
      const layer = buildPredictionLayer("pred-test", mockFeatures);
      assert.ok(layer);
      assert.equal(layer.id, "pred-test");
      assert.ok(layer.props.data.features.length === 2);
    });

    it("should filter only stressed features in buildStressAlertLayer", () => {
      const alertLayer = buildStressAlertLayer("alert-test", mockFeatures);
      assert.ok(alertLayer);
      assert.equal(alertLayer.props.data.features.length, 1);
      assert.equal(alertLayer.props.data.features[0].id, "test_f2");
    });
  });
});
