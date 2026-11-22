/**
 * TerraSpectra — predictionService Unit Tests
 *
 * Verifies backend endpoint definitions, health and status checks,
 * mock envelope generation, and ML contract compliance.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkHealth,
  checkSystemStatus,
  submitAnalysis,
  generateMockAnalysisResponse,
  ENDPOINTS,
} from "../predictionService.js";

describe("predictionService", () => {
  it("should have confirmed endpoint paths aligned with backend specification", () => {
    assert.equal(ENDPOINTS.HEALTH, "/health");
    assert.equal(ENDPOINTS.SYSTEM_STATUS, "/api/v1/system/status");
    assert.equal(ENDPOINTS.ANALYZE, "/api/v1/analyze");
    assert.equal(ENDPOINTS.PREDICT_SCAN, "/predict");
  });

  it("should return a healthy response envelope when checking health in mock mode", async () => {
    const health = await checkHealth();

    assert.ok(health);
    assert.equal(health.status, "healthy");
    assert.equal(health._isMock, true);
    assert.ok(health.service.includes("TerraSpectra"));
  });

  it("should return an operational response envelope when checking system status in mock mode", async () => {
    const status = await checkSystemStatus();

    assert.ok(status);
    assert.equal(status.status, "operational");
    assert.equal(status._isMock, true);
    assert.ok(status.timestamp);
  });

  it("should generate contract-compliant mock analysis envelopes matching StandardResponseEnvelope", async () => {
    const requestPayload = {
      dataset_id: "TEST_DATASET_01",
      sensor_name: "AVIRIS-NG",
      bounding_box: [80.200, 13.080, 80.215, 13.095],
      include_uncertainty: true,
    };

    const response = await submitAnalysis(requestPayload);

    assert.equal(response.status, "success");
    assert.equal(response._isMock, true);
    assert.ok(response.job_id.startsWith("job_mock_"));
    assert.ok(response.timestamp);
    assert.ok(response.mockNotice.includes("SIMULATED RESULT"));

    // Check payload data structure
    const data = response.data;
    assert.ok(data);
    assert.equal(data.metadata.sensor, "AVIRIS-NG");
    assert.equal(data.metadata.crs, "EPSG:4326");
    assert.deepEqual(data.metadata.bounding_box, [80.200, 13.080, 80.215, 13.095]);

    // Check metrics structure
    assert.ok(data.metrics);
    assert.ok(["healthy", "stressed"].includes(data.metrics.dominant_class));
    assert.ok(typeof data.metrics.mean_confidence === "number");
    assert.ok(typeof data.metrics.mean_uncertainty === "number");
    assert.ok(data.metrics.class_distribution.healthy >= 0);

    // Check artifacts
    assert.ok(data.artifacts.raster_download_url);
    assert.ok(data.artifacts.summary_url);
  });

  it("should generate default mock envelope when payload is omitted", () => {
    const envelope = generateMockAnalysisResponse();

    assert.equal(envelope.status, "success");
    assert.equal(envelope._isMock, true);
    assert.ok(envelope.data.metadata.scene_id);
    assert.equal(envelope.data.metadata.crs, "EPSG:4326");
  });
});
