/**
 * TerraSpectra — usePredictionFilters Hook & Filter Logic
 *
 * Week 3 Day 3 Deliverable
 *
 * Provides reactive filtering across verified API metadata fields:
 *   • Scene ID (scene_id)
 *   • Predicted Class (healthy, stressed, unclassified_nodata, etc.)
 *   • Acquisition Date (acquisition_date)
 *   • Search Query (tile_id, label, stableId)
 *   • Alert Only Toggle (stressed physiological alerts)
 *
 * Architecture:
 *   • Pure filtering and options extraction helpers (extractFilterOptions, applyPredictionFilters)
 *     for robust, headless testability.
 *   • React hook (usePredictionFilters) for reactive UI state synchronization.
 */

import { useState, useMemo, useCallback } from "react";
import { CONFIRMED_CLASSES } from "../types/prediction.js";
import { getFeatureClass, getFeatureId, isAlertFeature } from "../map/layers/layerFactory.js";

/**
 * Helper to extract scene_id from raw GeoJSON or adapted feature.
 *
 * @param {object} feature
 * @returns {string|null}
 */
export function getFeatureScene(feature) {
  if (!feature) return null;
  return (
    feature.metadata?.sceneId ||
    feature.metadata?.scene_id ||
    feature.properties?.metadata?.scene_id ||
    feature.properties?.scene_id ||
    null
  );
}

/**
 * Helper to extract acquisition date string from raw GeoJSON or adapted feature.
 *
 * @param {object} feature
 * @returns {string|null}
 */
export function getFeatureDate(feature) {
  if (!feature) return null;
  const rawDate =
    feature.metadata?.acquisitionDate ||
    feature.metadata?.acquisition_date ||
    feature.properties?.metadata?.acquisition_date ||
    feature.properties?.acquisition_date ||
    null;

  if (!rawDate) return null;
  return String(rawDate).split("T")[0];
}

/**
 * Extract unique filter options present across the feature set.
 *
 * @param {object[]} features
 * @returns {{ scenes: string[], classes: string[], dates: string[] }}
 */
export function extractFilterOptions(features) {
  const safe = Array.isArray(features) ? features : [];
  const scenesSet = new Set();
  const classesSet = new Set();
  const datesSet = new Set();

  for (const f of safe) {
    const s = getFeatureScene(f);
    if (s) scenesSet.add(s);

    const c = getFeatureClass(f);
    if (c) classesSet.add(c.toLowerCase());

    const d = getFeatureDate(f);
    if (d) datesSet.add(d);
  }

  return {
    scenes: Array.from(scenesSet).sort(),
    classes: Array.from(classesSet).sort(),
    dates: Array.from(datesSet).sort(),
  };
}

/**
 * Pure filter function evaluating a feature list against active criteria.
 *
 * @param {object[]} features
 * @param {object} criteria
 * @param {string} [criteria.sceneFilter="all"]
 * @param {string} [criteria.classFilter="all"]
 * @param {string} [criteria.dateFilter="all"]
 * @param {string} [criteria.searchQuery=""]
 * @param {boolean} [criteria.alertsOnly=false]
 * @returns {object[]} Filtered features
 */
export function applyPredictionFilters(features, criteria = {}) {
  const safe = Array.isArray(features) ? features : [];
  const {
    sceneFilter = "all",
    classFilter = "all",
    dateFilter = "all",
    searchQuery = "",
    alertsOnly = false,
  } = criteria;

  const query = searchQuery.trim().toLowerCase();

  return safe.filter((f) => {
    // 1. Alert only toggle
    if (alertsOnly && !isAlertFeature(f)) {
      return false;
    }

    // 2. Class filter
    if (classFilter !== "all") {
      const cls = getFeatureClass(f).toLowerCase();
      if (cls !== classFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Scene filter
    if (sceneFilter !== "all") {
      const sc = getFeatureScene(f);
      if (sc !== sceneFilter) {
        return false;
      }
    }

    // 4. Acquisition date filter
    if (dateFilter !== "all") {
      const dt = getFeatureDate(f);
      if (dt !== dateFilter) {
        return false;
      }
    }

    // 5. Search query (matches tile ID, label, or stableId)
    if (query) {
      const id = getFeatureId(f).toLowerCase();
      const label = String(
        f.label || f.properties?.label || f.properties?.tile_id || ""
      ).toLowerCase();

      if (!id.includes(query) && !label.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Hook for filtering prediction features by confirmed API fields.
 *
 * @param {object[]} [features=[]] - Array of GeoJSON features or adapted view models
 * @returns {object} Filter state, handlers, and filtered feature collection
 */
export function usePredictionFilters(features = []) {
  const [sceneFilter, setSceneFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);

  // Safe memoized feature array
  const safeFeatures = useMemo(
    () => (Array.isArray(features) ? features : []),
    [features]
  );

  // Derive filter options dynamically
  const { scenes: availableScenes, classes: availableClasses, dates: availableDates } =
    useMemo(() => extractFilterOptions(safeFeatures), [safeFeatures]);

  // Apply all active filters
  const filteredFeatures = useMemo(() => {
    return applyPredictionFilters(safeFeatures, {
      sceneFilter,
      classFilter,
      dateFilter,
      searchQuery,
      alertsOnly,
    });
  }, [
    safeFeatures,
    alertsOnly,
    classFilter,
    sceneFilter,
    dateFilter,
    searchQuery,
  ]);

  // Check whether any non-default filter is currently applied
  const isFiltered = useMemo(() => {
    return (
      alertsOnly ||
      classFilter !== "all" ||
      sceneFilter !== "all" ||
      dateFilter !== "all" ||
      searchQuery.trim().length > 0
    );
  }, [alertsOnly, classFilter, sceneFilter, dateFilter, searchQuery]);

  // Quick summary of filtered results
  const counts = useMemo(() => {
    let healthy = 0;
    let stressed = 0;

    for (const f of filteredFeatures) {
      const cls = getFeatureClass(f).toLowerCase();
      if (cls === CONFIRMED_CLASSES.HEALTHY) healthy += 1;
      if (cls === CONFIRMED_CLASSES.STRESSED) stressed += 1;
    }

    return {
      total: safeFeatures.length,
      visible: filteredFeatures.length,
      healthy,
      stressed,
    };
  }, [safeFeatures, filteredFeatures]);

  // Reset all filters back to default
  const resetFilters = useCallback(() => {
    setSceneFilter("all");
    setClassFilter("all");
    setDateFilter("all");
    setSearchQuery("");
    setAlertsOnly(false);
  }, []);

  return {
    // Current filter states
    sceneFilter,
    classFilter,
    dateFilter,
    searchQuery,
    alertsOnly,
    isFiltered,

    // Available dynamic options
    availableScenes,
    availableClasses,
    availableDates,

    // Filter results
    filteredFeatures,
    counts,

    // Setters
    setSceneFilter,
    setClassFilter,
    setDateFilter,
    setSearchQuery,
    setAlertsOnly,
    resetFilters,
  };
}

export default usePredictionFilters;
