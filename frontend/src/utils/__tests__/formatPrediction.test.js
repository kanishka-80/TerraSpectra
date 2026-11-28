/**
 * TerraSpectra — formatPrediction Unit Tests
 *
 * Week 3 Day 4 Deliverable
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  formatModelScore,
  formatUncertainty,
  formatResolution,
  getProvenanceInfo,
  formatFieldValue,
} from "../formatPrediction.js";

import { SCORE_TYPES } from "../../types/prediction.js";

describe("formatPrediction Utility (Day 4)", () => {
  describe("formatModelScore", () => {
    it("should format softmax probability percentage with explicit label", () => {
      const res = formatModelScore(0.884, SCORE_TYPES.SOFTMAX_SCORE);
      assert.equal(res.formatted, "88.4%");
      assert.equal(res.label, "Softmax Score");
      assert.equal(res.isAvailable, true);
    });

    it("should format calibrated confidence percentage", () => {
      const res = formatModelScore(0.925, SCORE_TYPES.CALIBRATED_CONFIDENCE);
      assert.equal(res.formatted, "92.5%");
      assert.equal(res.label, "Calibrated Confidence");
      assert.equal(res.isAvailable, true);
    });

    it("should format raw model logits as numeric string rather than percentage", () => {
      const res = formatModelScore(2.456, SCORE_TYPES.RAW_LOGIT);
      assert.equal(res.formatted, "2.456");
      assert.equal(res.label, "Raw Model Score");
      assert.equal(res.isAvailable, true);
    });

    it("should distinguish 0.0 from unavailable / null", () => {
      const zeroRes = formatModelScore(0, SCORE_TYPES.SOFTMAX_SCORE);
      assert.equal(zeroRes.formatted, "0.0%");
      assert.equal(zeroRes.isAvailable, true);

      const nullRes = formatModelScore(null, SCORE_TYPES.SOFTMAX_SCORE);
      assert.equal(nullRes.formatted, "Unavailable");
      assert.equal(nullRes.isAvailable, false);

      const undefRes = formatModelScore(undefined, SCORE_TYPES.SOFTMAX_SCORE);
      assert.equal(undefRes.formatted, "Unavailable");
      assert.equal(undefRes.isAvailable, false);
    });
  });

  describe("formatUncertainty", () => {
    it("should format numeric uncertainty as plus-minus percentage", () => {
      assert.equal(formatUncertainty(0.045), "± 4.5%");
      assert.equal(formatUncertainty(0.0), "± 0.0%");
    });

    it("should return explicit label when uncertainty is not estimated", () => {
      assert.equal(formatUncertainty(null), "Not estimated");
      assert.equal(formatUncertainty(undefined), "Not estimated");
      assert.equal(formatUncertainty(Number.NaN), "Not estimated");
    });
  });

  describe("formatResolution", () => {
    it("should format valid spatial resolution in meters per pixel", () => {
      assert.equal(formatResolution(4.0), "4.0m / px");
      assert.equal(formatResolution(16.5), "16.5m / px");
    });

    it("should return fallback label for missing or invalid resolution", () => {
      assert.equal(formatResolution(null), "Pending scene intake");
      assert.equal(formatResolution(0), "Pending scene intake");
      assert.equal(formatResolution(-5), "Pending scene intake");
    });
  });

  describe("getProvenanceInfo", () => {
    it("should identify sample test fixtures correctly", () => {
      const info = getProvenanceInfo({ _isSampleFixture: true });
      assert.equal(info.type, "fixture");
      assert.equal(info.label, "Sample Test Fixture");
    });

    it("should identify local mock payloads correctly", () => {
      const info = getProvenanceInfo({ _isMock: true });
      assert.equal(info.type, "mock");
      assert.equal(info.label, "Simulated Mock Data");
    });

    it("should identify demo context as mock data", () => {
      const info = getProvenanceInfo({}, /* isDemo */ true);
      assert.equal(info.type, "mock");
    });

    it("should identify real model predictions with live badge", () => {
      const info = getProvenanceInfo({ _isMock: false }, /* isDemo */ false);
      assert.equal(info.type, "real");
      assert.equal(info.label, "Live Model Output");
    });
  });

  describe("formatFieldValue", () => {
    it("should preserve valid values including boolean false and zero", () => {
      assert.equal(formatFieldValue("AVIRIS_01"), "AVIRIS_01");
      assert.equal(formatFieldValue(0), "0");
      assert.equal(formatFieldValue(false), "false");
    });

    it("should return fallback string for null, undefined, or empty string", () => {
      assert.equal(formatFieldValue(null, "Fallback"), "Fallback");
      assert.equal(formatFieldValue(undefined, "Fallback"), "Fallback");
      assert.equal(formatFieldValue("", "Fallback"), "Fallback");
    });
  });
});
