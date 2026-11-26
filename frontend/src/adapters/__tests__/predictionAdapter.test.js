/**
 * TerraSpectra — Prediction Adapter Fixture Tests
 *
 * Week 3 Day 2 Deliverable
 *
 * NOTE ON FIXTURES: All fixtures in this suite are synthetic test samples used
 * strictly to verify data mapping, error resilience, and schema decoupling.
 * They DO NOT represent real agronomic ground truth or model evaluation evidence.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  adaptPredictionResponse,
  adaptFeature,
  createEmptyViewModel,
} from "../predictionAdapter.js";

// ─── APPROVED SAMPLE FIXTURES (Explicitly Labeled) ───────────────────────────

/**
 * Approved sample response from Week 3 backend with real 3D-CNN / ViT model metadata.
 * Stamped as sample data for test fixtures.
 */
const SAMPLE_WEEK3_REAL_RESPONSE = {
  _isSampleFixture: true,
  status: "success",
  timestamp: "2026-11-26T10:00:00Z",
  job_id: "job_w3_real_001",
  data: {
    metadata: {
      scene_id: "AVIRIS_CHENNAI_RICE_01",
      sensor: "AVIRIS-NG",
      crs: "EPSG:4326",
      acquisition_date: "2026-10-15T09:30:00Z",
      spatial_dimensions: { height: 512, width: 512 },
      patch_dimensions: [32, 32],
      spatial_resolution_m: 4.0,
      model_name: "3D-CNN Spatial-Spectral Baseline",
      model_version: "v0.3.0",
      checkpoint: "checkpoints/3dcnn_aviris_w3.pt",
      is_mock: false,
      execution_device: "cuda",
    },
    metrics: {
      dominant_class: "healthy",
      class_distribution: {
        healthy: 0.67,
        stressed: 0.33,
      },
      mean_score: 0.892,
      score_type: "softmax_score",
      mean_uncertainty: 0.045,
    },
    features: [
      {
        type: "Feature",
        id: "tile_001",
        properties: {
          tile_id: "tile_001",
          label: "Field Sector A-1",
          class: "healthy",
          score: 0.941,
          score_type: "softmax_score",
          scores: { healthy: 0.941, stressed: 0.052, unclassified_nodata: 0.007 },
          uncertainty: 0.038,
          metadata: {
            scene_id: "AVIRIS_CHENNAI_RICE_01",
            tile_id: "tile_001",
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
      },
      {
        type: "Feature",
        id: "tile_002",
        properties: {
          tile_id: "tile_002",
          label: "Field Sector A-2 (Alert)",
          class: "stressed",
          score: 0.843,
          score_type: "softmax_score",
          scores: { healthy: 0.124, stressed: 0.843, unclassified_nodata: 0.033 },
          uncertainty: 0.052,
          metadata: {
            scene_id: "AVIRIS_CHENNAI_RICE_01",
            tile_id: "tile_002",
            sensor: "AVIRIS-NG",
            crs: "EPSG:4326",
          },
          _isMock: false,
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [80.205, 13.080],
              [80.210, 13.080],
              [80.210, 13.085],
              [80.205, 13.085],
              [80.205, 13.080],
            ],
          ],
        },
      },
    ],
    artifacts: {
      raster_download_url: "/api/v1/results/job_w3_real_001/raster",
      summary_url: "/api/v1/results/job_w3_real_001/summary",
    },
  },
};

/**
 * Legacy sample response from Week 2 format (`mean_confidence`, legacy properties).
 */
const SAMPLE_WEEK2_LEGACY_RESPONSE = {
  _isSampleFixture: true,
  status: "success",
  timestamp: "2026-11-20T10:00:00Z",
  job_id: "job_legacy_002",
  data: {
    metadata: {
      scene_id: "SCENE_LEGACY_01",
      sensor: "AVIRIS-NG",
      crs: "EPSG:4326",
      model_name: "3D-CNN Baseline (Mock)",
      model_version: "v0.1.0-mock",
    },
    metrics: {
      dominant_class: "healthy",
      class_distribution: { healthy: 0.8, stressed: 0.2 },
      mean_confidence: 0.885,
      mean_uncertainty: 0.062,
    },
    features: [
      {
        type: "Feature",
        id: "leg_01",
        properties: {
          tile_id: "leg_01",
          label: "Legacy Sector 1",
          class: "healthy",
          confidence: 0.91,
          uncertainty: 0.05,
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
      },
    ],
  },
};

/**
 * Asynchronous job running sample fixture.
 */
const SAMPLE_ASYNC_JOB_RUNNING = {
  _isSampleFixture: true,
  job_id: "job_async_100",
  status: "running",
  created_at: "2026-11-26T10:00:00Z",
  updated_at: "2026-11-26T10:00:05Z",
  progress: 0.65,
  result: null,
  error: null,
};

/**
 * Asynchronous job completed sample fixture.
 */
const SAMPLE_ASYNC_JOB_COMPLETED = {
  _isSampleFixture: true,
  job_id: "job_async_101",
  status: "completed",
  progress: 1.0,
  result: SAMPLE_WEEK3_REAL_RESPONSE,
};

/**
 * Asynchronous job failed sample fixture.
 */
const SAMPLE_ASYNC_JOB_FAILED = {
  _isSampleFixture: true,
  job_id: "job_async_102",
  status: "failed",
  error: {
    code: "GPU_OUT_OF_MEMORY",
    message: "Inference batch exceeded available GPU memory.",
  },
};

/**
 * Empty predictions sample fixture.
 */
const SAMPLE_EMPTY_PREDICTIONS = {
  _isSampleFixture: true,
  status: "success",
  job_id: "job_empty_01",
  data: {
    metadata: { scene_id: "SCENE_EMPTY" },
    metrics: { dominant_class: "unclassified_nodata" },
    features: [],
  },
};

/**
 * Unknown class sample fixture (model returned unmapped label).
 */
const SAMPLE_UNKNOWN_CLASS_FEATURE = {
  type: "Feature",
  id: "tile_unk_99",
  properties: {
    tile_id: "tile_unk_99",
    class: "fungal_sheath_blight_experimental",
    score: 0.772,
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

/**
 * Missing geometry sample fixture (tabular / non-spatial result).
 */
const SAMPLE_MISSING_GEOMETRY_FEATURE = {
  type: "Feature",
  id: "tile_no_geom",
  properties: {
    tile_id: "tile_no_geom",
    class: "healthy",
    score: 0.93,
  },
  geometry: null,
};

// ─── TEST SUITES ─────────────────────────────────────────────────────────────

describe("Model Prediction Response Adapter (Day 2)", () => {
  describe("Week 3 Real Model Response Mapping", () => {
    it("should adapt full Week 3 real model response into stable view model", () => {
      const vm = adaptPredictionResponse(SAMPLE_WEEK3_REAL_RESPONSE);

      assert.equal(vm.status, "success");
      assert.equal(vm.jobId, "job_w3_real_001");
      assert.equal(vm.isMock, false);
      assert.equal(vm.hasSpatialData, true);

      // Metadata verification
      assert.equal(vm.metadata.sceneId, "AVIRIS_CHENNAI_RICE_01");
      assert.equal(vm.metadata.sensor, "AVIRIS-NG");
      assert.equal(vm.metadata.modelName, "3D-CNN Spatial-Spectral Baseline");
      assert.equal(vm.metadata.modelVersion, "v0.3.0");
      assert.equal(vm.metadata.checkpoint, "checkpoints/3dcnn_aviris_w3.pt");
      assert.equal(vm.metadata.executionDevice, "cuda");
      assert.equal(vm.metadata.spatialResolutionM, 4.0);

      // Metrics verification
      assert.equal(vm.metrics.dominantClass, "healthy");
      assert.equal(vm.metrics.dominantClassLabel, "Healthy");
      assert.equal(vm.metrics.meanScore, 0.892);
      assert.equal(vm.metrics.scoreType, "softmax_score");
      assert.equal(vm.metrics.totalFeatures, 2);
      assert.equal(vm.metrics.alertCount, 1);

      // Feature verification
      assert.equal(vm.features.length, 2);
      const [feat1, feat2] = vm.features;

      assert.equal(feat1.id, "tile_001");
      assert.equal(feat1.className, "healthy");
      assert.equal(feat1.isAlert, false);
      assert.equal(feat1.score, 0.941);
      assert.equal(feat1.hasGeometry, true);

      assert.equal(feat2.id, "tile_002");
      assert.equal(feat2.className, "stressed");
      assert.equal(feat2.isAlert, true);
      assert.equal(feat2.score, 0.843);

      // Artifacts verification
      assert.equal(vm.artifacts.rasterDownloadUrl, "/api/v1/results/job_w3_real_001/raster");
    });
  });

  describe("Week 2 Legacy Schema Compatibility", () => {
    it("should map Week 2 response schema (mean_confidence, confidence) transparently", () => {
      const vm = adaptPredictionResponse(SAMPLE_WEEK2_LEGACY_RESPONSE);

      assert.equal(vm.status, "success");
      assert.equal(vm.jobId, "job_legacy_002");
      assert.equal(vm.metrics.meanScore, 0.885); // Mapped from mean_confidence
      assert.equal(vm.features.length, 1);
      assert.equal(vm.features[0].score, 0.91); // Mapped from confidence
      assert.equal(vm.features[0].confidence, 0.91);
      assert.equal(vm.metadata.modelName, "3D-CNN Baseline (Mock)");
    });
  });

  describe("Asynchronous Job Status Handling", () => {
    it("should handle queued or running asynchronous jobs", () => {
      const vm = adaptPredictionResponse(SAMPLE_ASYNC_JOB_RUNNING);

      assert.equal(vm.status, "running");
      assert.equal(vm.jobId, "job_async_100");
      assert.equal(vm.progress, 0.65);
      assert.equal(vm.features.length, 0);
      assert.equal(vm.hasSpatialData, false);
    });

    it("should unwrap completed asynchronous jobs into full view models", () => {
      const vm = adaptPredictionResponse(SAMPLE_ASYNC_JOB_COMPLETED);

      assert.equal(vm.status, "success");
      assert.equal(vm.jobId, "job_w3_real_001");
      assert.equal(vm.features.length, 2);
      assert.equal(vm.hasSpatialData, true);
    });

    it("should map failed asynchronous jobs to structured error view models", () => {
      const vm = adaptPredictionResponse(SAMPLE_ASYNC_JOB_FAILED);

      assert.equal(vm.status, "error");
      assert.equal(vm.jobId, "job_async_102");
      assert.equal(vm.errorCode, "GPU_OUT_OF_MEMORY");
      assert.equal(vm.message, "Inference batch exceeded available GPU memory.");
      assert.equal(vm.features.length, 0);
    });
  });

  describe("Resilience: Empty, Missing, and Unknown Data", () => {
    it("should handle empty prediction results without crashing", () => {
      const vm = adaptPredictionResponse(SAMPLE_EMPTY_PREDICTIONS);

      assert.equal(vm.status, "empty");
      assert.equal(vm.metrics.totalFeatures, 0);
      assert.equal(vm.metrics.alertCount, 0);
      assert.equal(vm.hasSpatialData, false);
      assert.equal(vm.features.length, 0);
    });

    it("should handle unknown class labels safely without throwing", () => {
      const adapted = adaptFeature(SAMPLE_UNKNOWN_CLASS_FEATURE);

      assert.equal(adapted.className, "fungal_sheath_blight_experimental");
      assert.equal(adapted.isUnknown, true);
      assert.equal(adapted.isProvisional, true);
      assert.equal(adapted.isAlert, false);
      assert.equal(adapted.classDisplayName, "fungal_sheath_blight_experimental");
    });

    it("should handle features with missing geometry without crashing", () => {
      const adapted = adaptFeature(SAMPLE_MISSING_GEOMETRY_FEATURE);

      assert.equal(adapted.id, "tile_no_geom");
      assert.equal(adapted.geometry, null);
      assert.equal(adapted.hasGeometry, false);
    });

    it("should handle sparse metadata without inventing fake values", () => {
      const sparsePayload = {
        status: "success",
        data: {
          features: [
            {
              id: "sparse_1",
              properties: { class: "healthy" },
            },
          ],
        },
      };

      const vm = adaptPredictionResponse(sparsePayload);

      assert.equal(vm.status, "success");
      assert.equal(vm.metadata.sceneId, null);
      assert.equal(vm.metadata.acquisitionDate, null);
      assert.equal(vm.metadata.checkpoint, null);
      assert.equal(vm.metadata.sensor, "Pending confirmation");
      assert.equal(vm.metadata.crs, "EPSG:4326");
    });

    it("should handle null or malformed inputs by returning safe empty view model", () => {
      assert.equal(adaptPredictionResponse(null).status, "empty");
      assert.equal(adaptPredictionResponse(undefined).status, "empty");
      assert.equal(adaptPredictionResponse("malformed string").status, "empty");
      assert.equal(adaptPredictionResponse({}).status, "empty");
    });

    it("should map structured error response envelopes into error view models", () => {
      const errorPayload = {
        status: "error",
        error_code: "INVALID_BOUNDING_BOX",
        message: "min_lon must be strictly less than max_lon",
      };

      const vm = adaptPredictionResponse(errorPayload);

      assert.equal(vm.status, "error");
      assert.equal(vm.errorCode, "INVALID_BOUNDING_BOX");
      assert.equal(vm.message, "min_lon must be strictly less than max_lon");
    });
  });

  describe("createEmptyViewModel Helper", () => {
    it("should generate a complete, valid empty view model", () => {
      const empty = createEmptyViewModel("Custom notice");

      assert.equal(empty.status, "empty");
      assert.equal(empty.message, "Custom notice");
      assert.equal(empty.features.length, 0);
      assert.equal(empty.hasSpatialData, false);
      assert.equal(empty.metrics.totalFeatures, 0);
      assert.equal(empty.metrics.alertCount, 0);
    });
  });
});
