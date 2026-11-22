/**
 * TerraSpectra — usePrediction Hook (Day 2 Deliverable)
 *
 * Manages the complete lifecycle of backend prediction requests:
 *   idle → loading → success | empty | error
 *
 * Features:
 *   • Guard against concurrent / duplicate submissions while a request is in flight.
 *   • Surfaces granular loading, success, empty, and error states.
 *   • Supports both Hyperspectral Scene Analysis (submitAnalysis) and Leaf Image Scanner (predict).
 *   • Transparent switch between switchable mock adapter and live backend API.
 *   • Stores error code and detailed error message.
 */

import { useState, useCallback } from "react";
import {
  submitAnalysis,
  predictDisease,
  checkHealth,
  checkSystemStatus,
} from "../services/predictionService.js";
import { USE_MOCK } from "../services/apiClient.js";

/**
 * @typedef {"idle"|"loading"|"success"|"empty"|"error"} RequestStatus
 */

export function usePrediction() {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  /**
   * Submit an analysis inference request (hyperspectral bounding box / dataset).
   *
   * @param {object} payload
   */
  const runAnalysis = useCallback(
    async (payload) => {
      if (status === "loading") return; // Guard: prevent repeated submission

      setStatus("loading");
      setResult(null);
      setErrorMessage(null);
      setErrorCode(null);

      try {
        const data = await submitAnalysis(payload);

        if (!data || (data.status === "success" && !data.data)) {
          setStatus("empty");
          setResult(data);
          return;
        }

        setResult(data);
        setStatus("success");
      } catch (err) {
        setErrorMessage(err?.message || "Failed to complete prediction analysis.");
        setErrorCode(err?.errorCode || "ANALYSIS_FAILED");
        setStatus("error");
      }
    },
    [status]
  );

  /**
   * Submit image files for leaf disease prediction.
   *
   * @param {File[]} files
   */
  const predict = useCallback(
    async (files) => {
      if (status === "loading") return; // Guard: prevent repeated submission

      if (!files || files.length === 0) {
        setErrorMessage("Please select at least one image file before analysing.");
        setErrorCode("NO_INPUT_FILES");
        setStatus("error");
        return;
      }

      setStatus("loading");
      setResult(null);
      setErrorMessage(null);
      setErrorCode(null);

      try {
        const data = await predictDisease(files);

        if (!data) {
          setStatus("empty");
          setResult(null);
          return;
        }

        setResult(data);
        setStatus("success");
      } catch (err) {
        setErrorMessage(err?.message || "Prediction request failed.");
        setErrorCode(err?.errorCode || "PREDICTION_FAILED");
        setStatus("error");
      }
    },
    [status]
  );

  /**
   * Check backend health.
   */
  const checkBackendHealth = useCallback(() => checkHealth(), []);

  /**
   * Check backend system operational status.
   */
  const checkBackendStatus = useCallback(() => checkSystemStatus(), []);

  /**
   * Reset the hook state back to idle.
   */
  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
    setErrorCode(null);
  }, []);

  return {
    status,
    result,
    errorMessage,
    errorCode,
    isMockMode: USE_MOCK,
    isIdle: status === "idle",
    isLoading: status === "loading",
    isSuccess: status === "success",
    isEmpty: status === "empty",
    isError: status === "error",
    hasResult: (status === "success" || status === "empty") && result !== null,
    runAnalysis,
    predict,
    checkBackendHealth,
    checkBackendStatus,
    reset,
  };
}

export default usePrediction;
