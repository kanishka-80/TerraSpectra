/**
 * TerraSpectra — Centralized API Client (Day 2 Deliverable)
 *
 * Configuration
 * ─────────────
 * Set VITE_API_BASE_URL in frontend/.env to point to the backend server.
 * When empty or unset, the built-in switchable mock adapter is automatically active.
 *
 * Example .env:
 *   VITE_API_BASE_URL=http://localhost:8000
 *
 * Features:
 *   • Configurable backend URL with automatic trailing-slash trimming.
 *   • Standardized error parsing for FastAPI/Pydantic validation errors and TerraSpectra error envelopes.
 *   • Request timeout support via AbortController.
 *   • Explicit mock mode detection and labelling.
 */

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

const RAW_BASE = typeof import.meta !== "undefined" && import.meta.env
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof process !== "undefined" && process.env ? process.env.VITE_API_BASE_URL : "");

/** True when no backend URL is configured — switchable mock adapter will be used. */
export const USE_MOCK = !RAW_BASE || RAW_BASE.trim() === "";

/** Configured backend base URL with no trailing slash. */
export const BASE_URL = USE_MOCK ? null : RAW_BASE.trim().replace(/\/$/, "");

/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 15000;

// ─── ERROR PARSER ─────────────────────────────────────────────────────────────

/**
 * Custom error class with structured HTTP and backend details.
 */
export class ApiError extends Error {
  constructor(message, status = 500, errorCode = "API_ERROR", details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

/**
 * Parse an HTTP fetch Response consistently.
 * Extracts JSON error details, Pydantic validation errors, or raw text.
 *
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function handleResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    let errorCode = `HTTP_${response.status}`;
    let details = null;

    if (isJson) {
      try {
        const errorBody = await response.json();
        details = errorBody;

        if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (Array.isArray(errorBody.detail)) {
          // FastAPI / Pydantic validation errors
          errorMessage = errorBody.detail
            .map((err) => `${err.loc ? err.loc.join(".") + ": " : ""}${err.msg}`)
            .join("; ");
          errorCode = "VALIDATION_ERROR";
        } else if (typeof errorBody.detail === "string") {
          errorMessage = errorBody.detail;
        }

        if (errorBody.error_code) {
          errorCode = errorBody.error_code;
        }
      } catch {
        /* fallback to status text */
      }
    } else {
      try {
        const rawText = await response.text();
        if (rawText) errorMessage += `: ${rawText}`;
      } catch {
        /* ignore */
      }
    }

    throw new ApiError(errorMessage, response.status, errorCode, details);
  }

  return isJson ? response.json() : response.text();
}

// ─── HTTP REQUEST HELPERS ─────────────────────────────────────────────────────

/**
 * Execute a fetch request with timeout support.
 *
 * @param {string} path - URL path (e.g. "/health")
 * @param {RequestInit} options
 * @param {number} [timeoutMs]
 * @returns {Promise<any>}
 */
async function fetchWithTimeout(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (USE_MOCK) {
    throw new ApiError("Cannot execute network request in Mock Mode.", 0, "MOCK_MODE_ACTIVE");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return await handleResponse(response);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError(`Request to ${path} timed out after ${timeoutMs}ms`, 408, "TIMEOUT");
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || "Network request failed", 0, "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * HTTP GET request.
 *
 * @param {string} path - e.g. "/health"
 * @param {number} [timeoutMs]
 * @returns {Promise<any>}
 */
export async function apiGet(path, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return fetchWithTimeout(
    path,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
    timeoutMs
  );
}

/**
 * HTTP POST request — supports JSON payload or FormData (multipart).
 *
 * @param {string} path - e.g. "/api/v1/analyze"
 * @param {object|FormData} body
 * @param {boolean} [isFormData=false]
 * @param {number} [timeoutMs]
 * @returns {Promise<any>}
 */
export async function apiPost(path, body, isFormData = false, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers = { Accept: "application/json" };
  if (!isFormData) headers["Content-Type"] = "application/json";

  return fetchWithTimeout(
    path,
    {
      method: "POST",
      headers,
      body: isFormData ? body : JSON.stringify(body),
    },
    timeoutMs
  );
}

export default {
  apiGet,
  apiPost,
  ApiError,
  USE_MOCK,
  BASE_URL,
  DEFAULT_TIMEOUT_MS,
};
