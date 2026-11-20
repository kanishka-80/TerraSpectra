/**
 * TerraSpectra — usePrediction Hook
 *
 * Manages the full lifecycle of a prediction API request:
 *   idle → loading → success | error
 *
 * Features
 * ────────
 * • Prevents duplicate submissions while a request is already in flight.
 * • Surfaces loading, success, empty, and error states for the UI.
 * • Transparently switches between mock adapter and real backend based on
 *   VITE_API_BASE_URL in .env — no code change needed to go live.
 *
 * Usage
 * ─────
 * const { predict, isLoading, isSuccess, isError, result, isMockMode } = usePrediction();
 *
 * // Trigger prediction (call with an array of File objects)
 * await predict(selectedImages.map(img => img.file));
 */

import { useState, useCallback } from "react";
import { predictDisease, checkHealth } from "../services/predictionService.js";
import { USE_MOCK } from "../services/apiClient.js";

/**
 * @typedef {"idle"|"loading"|"success"|"error"} PredictionStatus
 */

/**
 * @returns {{
 *   status: PredictionStatus,
 *   result: object|null,
 *   errorMessage: string|null,
 *   isMockMode: boolean,
 *   isIdle: boolean,
 *   isLoading: boolean,
 *   isSuccess: boolean,
 *   isError: boolean,
 *   hasResult: boolean,
 *   predict: (files: File[]) => Promise<void>,
 *   checkBackendHealth: () => Promise<object>,
 *   reset: () => void,
 * }}
 */
export function usePrediction() {
  const [status, setStatus]           = useState("idle");   // PredictionStatus
  const [result, setResult]           = useState(null);     // raw backend response
  const [errorMessage, setErrorMessage] = useState(null);   // human-readable error

  /**
   * Submit files for disease prediction.
   *
   * • Silently no-ops if a request is already in flight (prevents duplicates).
   * • Validates that at least one file is present before making a network call.
   *
   * @param {File[]} files
   */
  const predict = useCallback(
    async (files) => {
      if (status === "loading") return; // guard: prevent repeated submissions

      if (!files || files.length === 0) {
        setErrorMessage(
          "Please select at least one plant image before analysing."
        );
        setStatus("error");
        return;
      }

      setStatus("loading");
      setResult(null);
      setErrorMessage(null);

      try {
        const data = await predictDisease(files);
        setResult(data);
        setStatus("success");
      } catch (err) {
        setErrorMessage(
          err?.message ?? "An unexpected error occurred. Please try again."
        );
        setStatus("error");
      }
    },
    [status]
  );

  /**
   * Check backend health (useful on page mount or settings panel).
   * @returns {Promise<object>}
   */
  const checkBackendHealth = useCallback(() => checkHealth(), []);

  /** Reset state back to idle (e.g. after removing uploaded media). */
  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return {
    status,
    result,
    errorMessage,
    isMockMode:  USE_MOCK,
    isIdle:      status === "idle",
    isLoading:   status === "loading",
    isSuccess:   status === "success",
    isError:     status === "error",
    hasResult:   status === "success" && result !== null,
    predict,
    checkBackendHealth,
    reset,
  };
}

export default usePrediction;
