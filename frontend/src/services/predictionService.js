/**
 * TerraSpectra — Prediction Service
 *
 * All endpoint paths, HTTP methods, field names, and response shapes are
 * PENDING confirmation from the backend team (Kanishka).
 *
 * Constants marked with ─── TODO ─── must be updated before connecting
 * to the real backend. Until then, every call returns a clearly labelled
 * mock response with { _isMock: true }.
 */

import { apiGet, apiPost, USE_MOCK } from "./apiClient.js";

// ─── MOCK RESPONSES ───────────────────────────────────────────────────────────
// Used ONLY when VITE_API_BASE_URL is not configured.
// These are structural placeholders — NOT real predictions or status values.

const MOCK_HEALTH = {
  _isMock: true,
  status: "mock",
  message:
    "Mock adapter active. Set VITE_API_BASE_URL in frontend/.env to connect to the real backend (Kanishka).",
};

const MOCK_PREDICTION = {
  _isMock: true,
  status: "mock",
  message:
    "Mock adapter active. Prediction endpoint, HTTP method, field names, and response format are pending backend confirmation.",
  data: null,
};

// ─── ENDPOINT CONSTANTS ───────────────────────────────────────────────────────
// TODO: Update ALL values below when Kanishka confirms the backend contract.

/** Health / readiness check endpoint path. */
const HEALTH_PATH = "/health"; // TODO: confirm path with Kanishka

/** Disease prediction endpoint path. */
const PREDICT_PATH = "/predict"; // TODO: confirm path and HTTP method with Kanishka

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Check whether the backend is reachable and ready.
 * Returns a mock response when no backend URL is configured.
 *
 * @returns {Promise<object>} Health status object ({ status, message, ... })
 */
export async function checkHealth() {
  if (USE_MOCK) return MOCK_HEALTH;
  return apiGet(HEALTH_PATH);
}

/**
 * Submit plant image(s) to the prediction endpoint.
 *
 * Request body: currently uses multipart/form-data with field name "images".
 * TODO: confirm field name, format (multipart vs. base64 JSON), and any
 *       required additional metadata with Kanishka before going live.
 *
 * @param {File|File[]} files - One or more plant image files
 * @returns {Promise<object>} Raw prediction response (shape TBD by backend)
 */
export async function predictDisease(files) {
  if (USE_MOCK) return MOCK_PREDICTION;

  const fileArray = Array.isArray(files) ? files : Array.from(files);

  // TODO: update FormData field name ("images") after backend confirmation
  const formData = new FormData();
  fileArray.forEach((file) => formData.append("images", file));

  return apiPost(PREDICT_PATH, formData, /* isFormData */ true);
}

export default { checkHealth, predictDisease };
