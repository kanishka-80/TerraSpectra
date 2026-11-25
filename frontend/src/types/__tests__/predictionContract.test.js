import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  CONFIRMED_CLASSES,
  CLASS_METADATA,
  SCORE_TYPES,
  JOB_STATUS,
  ADAPTER_MODE,
  isKnownClass,
  isProvisionalClass,
  isValidBoundingBox,
  formatScore,
  normalizePredictionFeature,
} from "../prediction.js";

describe("Week 3 Model & GIS Prediction Contract", () => {
  describe("Class Taxonomy", () => {
    it("should lock confirmed production classes to healthy, stressed, and nodata", () => {
      assert.equal(CONFIRMED_CLASSES.HEALTHY, "healthy");
      assert.equal(CONFIRMED_CLASSES.STRESSED, "stressed");
      assert.equal(CONFIRMED_CLASSES.NODATA, "unclassified_nodata");
    });

    it("should mark stressed as an alert class and healthy as non-alert", () => {
      assert.equal(CLASS_METADATA.healthy.isAlert, false);
      assert.equal(CLASS_METADATA.stressed.isAlert, true);
      assert.equal(CLASS_METADATA.unclassified_nodata.isAlert, false);
    });

    it("should correctly identify confirmed classes via isKnownClass", () => {
      assert.equal(isKnownClass("healthy"), true);
      assert.equal(isKnownClass("STRESSED"), true);
      assert.equal(isKnownClass("unclassified_nodata"), true);
      assert.equal(isKnownClass("demo"), false);
      assert.equal(isKnownClass("unknown_disease"), false);
      assert.equal(isKnownClass(null), false);
    });

    it("should isolate provisional demo classes from production classes", () => {
      assert.equal(isProvisionalClass("demo"), true);
      assert.equal(isProvisionalClass("uncertain"), true);
      assert.equal(isProvisionalClass("healthy"), false);
      assert.equal(isProvisionalClass("stressed"), false);
      assert.equal(isProvisionalClass("unclassified_nodata"), false);
    });
  });

  describe("Score Semantics and Formatting", () => {
    it("should define valid score types", () => {
      assert.equal(SCORE_TYPES.SOFTMAX_SCORE, "softmax_score");
      assert.equal(SCORE_TYPES.CALIBRATED_CONFIDENCE, "calibrated_confidence");
      assert.equal(SCORE_TYPES.RAW_LOGIT, "raw_logit");
    });

    it("should format softmax scores with explicit descriptor", () => {
      const formatted = formatScore(0.884, SCORE_TYPES.SOFTMAX_SCORE);
      assert.equal(formatted, "88.4% (Softmax Score)");
    });

    it("should format calibrated confidence with confidence descriptor", () => {
      const formatted = formatScore(0.912, SCORE_TYPES.CALIBRATED_CONFIDENCE);
      assert.equal(formatted, "91.2% (Calibrated Confidence)");
    });

    it("should format raw logits as numbers rather than percentages", () => {
      const formatted = formatScore(2.456, SCORE_TYPES.RAW_LOGIT);
      assert.equal(formatted, "2.456 (Raw Model Score)");
    });

    it("should safely handle null or NaN scores without crashing", () => {
      assert.equal(formatScore(null), "Not reported");
      assert.equal(formatScore(Number.NaN), "Not reported");
      assert.equal(formatScore(undefined), "Not reported");
    });
  });

  describe("Job Lifecycle and Adapter Modes", () => {
    it("should define standard asynchronous job states", () => {
      assert.equal(JOB_STATUS.QUEUED, "queued");
      assert.equal(JOB_STATUS.RUNNING, "running");
      assert.equal(JOB_STATUS.COMPLETED, "completed");
      assert.equal(JOB_STATUS.FAILED, "failed");
    });

    it("should define backend adapter execution modes", () => {
      assert.equal(ADAPTER_MODE.REAL, "real");
      assert.equal(ADAPTER_MODE.MOCK, "mock");
      assert.equal(ADAPTER_MODE.NONE, "none");
    });
  });

  describe("Resilient Feature Normalization", () => {
    it("should normalize a complete real-model prediction feature", () => {
      const raw = {
        type: "Feature",
        id: "tile_001_p02",
        properties: {
          tile_id: "tile_001_p02",
          label: "Sector A - Patch 2",
          class: "stressed",
          score: 0.884,
          score_type: "softmax_score",
          scores: { healthy: 0.092, stressed: 0.884, unclassified_nodata: 0.024 },
          uncertainty: 0.041,
          metadata: {
            scene_id: "AVIRIS_CHENNAI_RICE_01",
            tile_id: "tile_001_p02",
            sensor: "AVIRIS-NG",
            acquisition_date: "2026-10-15T09:30:00Z",
            crs: "EPSG:4326",
            dimensions: "32x32 px",
            spatial_resolution_m: 4.0,
            model_name: "3D-CNN Spatial-Spectral Baseline",
            model_version: "v0.3.0",
            checkpoint: "checkpoints/3dcnn_aviris_w3.pt",
            execution_device: "cuda",
          },
          _isMock: false,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [80.200, 13.080],
              [80.205, 13.080],
              [80.205, 13.085],
              [80.200, 13.085],
              [80.200, 13.080],
            ],
          ],
        },
      };

      const normalized = normalizePredictionFeature(raw);

      assert.equal(normalized.id, "tile_001_p02");
      assert.equal(normalized.className, "stressed");
      assert.equal(normalized.isAlert, true);
      assert.equal(normalized.isProvisional, false);
      assert.equal(normalized.score, 0.884);
      assert.equal(normalized.confidence, 0.884); // Backward compatibility
      assert.equal(normalized.scoreType, "softmax_score");
      assert.equal(normalized.uncertainty, 0.041);
      assert.equal(normalized.metadata.sceneId, "AVIRIS_CHENNAI_RICE_01");
      assert.equal(normalized.metadata.sensor, "AVIRIS-NG");
      assert.equal(normalized.metadata.spatialResolutionM, 4.0);
      assert.equal(normalized.metadata.checkpoint, "checkpoints/3dcnn_aviris_w3.pt");
      assert.equal(normalized.metadata.executionDevice, "cuda");
      assert.equal(normalized._isMock, false);
    });

    it("should handle unknown classes gracefully without throwing", () => {
      const raw = {
        properties: {
          tile_id: "tile_unknown_01",
          class: "rust_fungus_experimental",
          score: 0.72,
        },
      };

      const normalized = normalizePredictionFeature(raw);
      assert.equal(normalized.className, "rust_fungus_experimental");
      assert.equal(normalized.isProvisional, true);
      assert.equal(normalized.classDisplayName, "rust_fungus_experimental");
    });

    it("should handle missing optional metadata without inventing fake values", () => {
      const raw = {
        properties: {
          tile_id: "tile_sparse_01",
          class: "healthy",
        },
      };

      const normalized = normalizePredictionFeature(raw);
      assert.equal(normalized.score, null);
      assert.equal(normalized.uncertainty, null);
      assert.equal(normalized.metadata.sceneId, null);
      assert.equal(normalized.metadata.acquisitionDate, null);
      assert.equal(normalized.metadata.spatialResolutionM, null);
      assert.equal(normalized.metadata.checkpoint, null);
    });

    it("should return null when normalizing null or undefined input", () => {
      assert.equal(normalizePredictionFeature(null), null);
      assert.equal(normalizePredictionFeature(undefined), null);
    });
  });

  describe("Geospatial Bounding Box Validator", () => {
    it("should validate valid EPSG:4326 bounding boxes", () => {
      assert.equal(isValidBoundingBox([80.200, 13.080, 80.215, 13.095]), true);
      assert.equal(isValidBoundingBox([-122.5, 37.7, -122.3, 37.8]), true);
    });

    it("should reject inverted coordinates (min >= max)", () => {
      assert.equal(isValidBoundingBox([80.215, 13.080, 80.200, 13.095]), false);
      assert.equal(isValidBoundingBox([80.200, 13.095, 80.215, 13.080]), false);
    });

    it("should reject out-of-bounds coordinates", () => {
      assert.equal(isValidBoundingBox([181.0, 13.0, 182.0, 14.0]), false);
      assert.equal(isValidBoundingBox([80.0, -95.0, 81.0, -91.0]), false);
    });

    it("should reject malformed arrays", () => {
      assert.equal(isValidBoundingBox([80.0, 13.0]), false);
      assert.equal(isValidBoundingBox("80,13,81,14"), false);
      assert.equal(isValidBoundingBox(null), false);
    });
  });
});
