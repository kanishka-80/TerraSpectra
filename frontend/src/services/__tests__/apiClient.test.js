/**
 * TerraSpectra — apiClient Unit Tests
 *
 * Verifies base URL resolution, mock mode detection, error envelope parsing,
 * and ApiError structured error propagation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  USE_MOCK,
  BASE_URL,
  ApiError,
  DEFAULT_TIMEOUT_MS,
} from "../apiClient.js";

describe("apiClient", () => {
  it("should default to Mock Mode when VITE_API_BASE_URL is not set", () => {
    // In local development or test without backend URL, USE_MOCK must be true
    assert.equal(typeof USE_MOCK, "boolean");
    if (!process.env.VITE_API_BASE_URL) {
      assert.equal(USE_MOCK, true);
      assert.equal(BASE_URL, null);
    }
  });

  it("should specify a reasonable default request timeout", () => {
    assert.equal(typeof DEFAULT_TIMEOUT_MS, "number");
    assert.ok(DEFAULT_TIMEOUT_MS >= 5000 && DEFAULT_TIMEOUT_MS <= 30000);
  });

  it("should construct structured ApiError instances with status and error codes", () => {
    const error = new ApiError("Failed to fetch raster", 404, "NOT_FOUND", { sceneId: "test_01" });

    assert.equal(error.name, "ApiError");
    assert.equal(error.message, "Failed to fetch raster");
    assert.equal(error.status, 404);
    assert.equal(error.errorCode, "NOT_FOUND");
    assert.deepEqual(error.details, { sceneId: "test_01" });
    assert.ok(error instanceof Error);
  });

  it("should provide default status and code when not specified in ApiError", () => {
    const error = new ApiError("General internal error");

    assert.equal(error.status, 500);
    assert.equal(error.errorCode, "API_ERROR");
    assert.equal(error.details, null);
  });
});
