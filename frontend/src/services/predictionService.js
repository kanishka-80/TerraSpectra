/**
 * TerraSpectra — Prediction Service (Day 2 Deliverable)
 *
 * Implements full backend integration with Kanishka's FastAPI backend:
 *   • Health check: GET /health
 *   • System status: GET /api/v1/system/status
 *   • Analysis inference: POST /api/v1/analyze (AnalysisRequestSchema)
 *   • Leaf scanner fallback: POST /predict (multipart)
 *
 * Provides a high-fidelity switchable mock adapter for local UI development.
 * All mock responses are clearly stamped with { _isMock: true }.
 */

import { apiGet, apiPost, USE_MOCK } from "./apiClient.js";

// ─── ENDPOINTS ────────────────────────────────────────────────────────────────

export const ENDPOINTS = {
  HEALTH: "/health",
  SYSTEM_STATUS: "/api/v1/system/status",
  ANALYZE: "/api/v1/analyze",
  PREDICT_SCAN: "/predict",
};

// ─── MOCK FIXTURES ────────────────────────────────────────────────────────────

export const MOCK_HEALTH_RESPONSE = {
  _isMock: true,
  status: "healthy",
  service: "TerraSpectra Backend (Local Mock Adapter)",
  version: "0.1.0-mock",
  mockNotice: "Running local mock adapter. Set VITE_API_BASE_URL to connect to the live backend.",
};

export const MOCK_SYSTEM_STATUS_RESPONSE = {
  _isMock: true,
  status: "operational",
  service: "TerraSpectra Intelligence Service",
  version: "v1-mock",
  timestamp: new Date().toISOString(),
  mockNotice: "Running local mock adapter. Set VITE_API_BASE_URL to connect to the live backend.",
};

/**
 * Generate a contract-compliant mock analysis response envelope.
 * Aligned with backend StandardResponseEnvelope and ML class taxonomy.
 *
 * @param {object} [requestData]
 * @returns {object} StandardResponseEnvelope
 */
export function generateMockAnalysisResponse(requestData = {}) {
  const datasetId = requestData.dataset_id || "AVIRIS_NG_SAMPLE_01";
  const sensor = requestData.sensor_name || "AVIRIS-NG";
  const bbox = requestData.bounding_box || [80.200, 13.080, 80.215, 13.095];

  return {
    _isMock: true,
    status: "success",
    timestamp: new Date().toISOString(),
    job_id: `job_mock_${Date.now()}`,
    mockNotice: "SIMULATED RESULT — Demo mock adapter output. Not real crop disease predictions.",
    data: {
      metadata: {
        scene_id: `SCENE_${datasetId}`,
        sensor: sensor,
        crs: "EPSG:4326",
        acquisition_date: "2026-11-15",
        spatial_dimensions: { height: 256, width: 256 },
        patch_dimensions: [32, 32],
        model_name: "3D-CNN Baseline (Mock)",
        model_version: "v0.1.0-mock",
        bounding_box: bbox,
      },
      metrics: {
        dominant_class: "healthy",
        class_distribution: {
          healthy: 0.72,
          stressed: 0.23,
          unclassified_nodata: 0.05,
        },
        mean_confidence: 0.885,
        mean_uncertainty: 0.062,
      },
      artifacts: {
        raster_download_url: `/api/v1/results/mock_${Date.now()}/raster`,
        summary_url: `/api/v1/results/mock_${Date.now()}/summary`,
      },
    },
  };
}

export const MOCK_PREDICTION_SCAN = {
  _isMock: true,
  status: "success",
  mockNotice: "SIMULATED RESULT — Scanner mock adapter output.",
  data: {
    disease: "Early Blight (Sample Output)",
    confidence: 0.912,
    recommendation: "Provisional diagnostic — submit for field verification.",
  },
};

// ─── PUBLIC SERVICE API ───────────────────────────────────────────────────────

/**
 * Check whether the backend service is healthy.
 * @returns {Promise<object>}
 */
export async function checkHealth() {
  if (USE_MOCK) {
    return MOCK_HEALTH_RESPONSE;
  }
  return apiGet(ENDPOINTS.HEALTH);
}

/**
 * Check backend operational status and version.
 * @returns {Promise<object>}
 */
export async function checkSystemStatus() {
  if (USE_MOCK) {
    return MOCK_SYSTEM_STATUS_RESPONSE;
  }
  return apiGet(ENDPOINTS.SYSTEM_STATUS);
}

/**
 * Submit an analysis inference request following AnalysisRequestSchema.
 *
 * @param {object} payload
 * @param {string} [payload.dataset_id]
 * @param {string} [payload.sensor_name]
 * @param {number[]} [payload.bounding_box] - [min_lon, min_lat, max_lon, max_lat]
 * @param {boolean} [payload.include_uncertainty=true]
 * @returns {Promise<object>} StandardResponseEnvelope
 */
export async function submitAnalysis(payload = {}) {
  if (USE_MOCK) {
    // Simulate brief network latency for realistic UI state handling
    await new Promise((resolve) => setTimeout(resolve, 350));
    return generateMockAnalysisResponse(payload);
  }
  return apiPost(ENDPOINTS.ANALYZE, payload);
}

/**
 * Submit plant image(s) to the legacy leaf prediction endpoint.
 *
 * @param {File|File[]} files
 * @returns {Promise<object>}
 */
export async function predictDisease(files) {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return MOCK_PREDICTION_SCAN;
  }

  const fileArray = Array.isArray(files) ? files : Array.from(files);
  const formData = new FormData();
  fileArray.forEach((file) => formData.append("images", file));

  return apiPost(ENDPOINTS.PREDICT_SCAN, formData, /* isFormData */ true);
}

export default {
  ENDPOINTS,
  checkHealth,
  checkSystemStatus,
  submitAnalysis,
  predictDisease,
  generateMockAnalysisResponse,
  MOCK_HEALTH_RESPONSE,
  MOCK_SYSTEM_STATUS_RESPONSE,
  MOCK_PREDICTION_SCAN,
};
