/**
 * TerraSpectra — Centralized API Client
 *
 * Configuration
 * ─────────────
 * Set VITE_API_BASE_URL in frontend/.env to point to the backend server.
 * Leave it empty (or unset) to activate the built-in mock adapter for
 * local UI development without a running backend.
 *
 * Example .env:
 *   VITE_API_BASE_URL=http://localhost:8000
 *
 * NOTE: Actual endpoint paths and request/response formats are PENDING
 * confirmation from the backend team (Kanishka). Do NOT hardcode
 * assumptions about path names, field names, or response shapes.
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const RAW_BASE = import.meta.env.VITE_API_BASE_URL;

/** True when no backend URL is configured — mock adapter will be used. */
export const USE_MOCK = !RAW_BASE || RAW_BASE.trim() === "";

/** Configured backend base URL with no trailing slash. */
export const BASE_URL = USE_MOCK ? null : RAW_BASE.trim().replace(/\/$/, "");

// ─── RESPONSE HANDLER ────────────────────────────────────────────────────────

/**
 * Parse a fetch Response consistently.
 *   • Returns parsed JSON when Content-Type is application/json.
 *   • Returns raw text otherwise.
 *   • Throws an Error with status + body detail on HTTP error responses.
 *
 * @param {Response} response
 * @returns {Promise<object|string>}
 */
async function handleResponse(response) {
  if (!response.ok) {
    let detail = "";
    try { detail = await response.text(); } catch { /* ignore */ }
    throw new Error(
      `API Error ${response.status} ${response.statusText}${
        detail ? ": " + detail : ""
      }`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
}

// ─── REQUEST HELPERS ─────────────────────────────────────────────────────────

/**
 * HTTP GET request.
 *
 * @param {string} path - e.g. "/health"
 * @returns {Promise<object|string>}
 */
export async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return handleResponse(response);
}

/**
 * HTTP POST request — sends JSON body or FormData (for file uploads).
 *
 * @param {string}            path       - e.g. "/predict"
 * @param {object|FormData}   body
 * @param {boolean}           isFormData - set true for multipart file uploads
 * @returns {Promise<object|string>}
 */
export async function apiPost(path, body, isFormData = false) {
  const headers = { Accept: "application/json" };
  if (!isFormData) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  return handleResponse(response);
}

export default { apiGet, apiPost, USE_MOCK, BASE_URL };
