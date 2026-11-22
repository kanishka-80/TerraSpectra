/**
 * TerraSpectra — useSelectedFeature Hook (Day 4 Deliverable)
 *
 * Manages map feature selection, hover state, and synchronization between
 * Deck.gl map layers and the DetailsPanel.
 *
 * Features:
 *   • Stable ID extraction (props.tile_id || props.feature_id || feature.id).
 *   • Normalizes raw GeoJSON features into typed Feature records.
 *   • Handles click selection, hover inspection, programmatic selection, and reset.
 */

import { useState, useCallback, useMemo } from "react";
import { normalizePredictionFeature } from "../types/prediction.js";

export function useSelectedFeature(initialFeature = null) {
  const [rawSelected, setRawSelected] = useState(initialFeature);
  const [rawHovered, setRawHovered] = useState(null);

  /** Normalized selected feature record. */
  const selectedFeature = useMemo(
    () => (rawSelected ? normalizePredictionFeature(rawSelected) : null),
    [rawSelected]
  );

  /** Normalized hovered feature record. */
  const hoveredFeature = useMemo(
    () => (rawHovered ? normalizePredictionFeature(rawHovered) : null),
    [rawHovered]
  );

  /** Stable identifier of currently selected feature. */
  const selectedFeatureId = useMemo(() => {
    if (!rawSelected) return null;
    return (
      rawSelected.id ||
      rawSelected.properties?.tile_id ||
      rawSelected.properties?.feature_id ||
      null
    );
  }, [rawSelected]);

  /**
   * Handle map click event from Deck.gl onClick handler.
   *
   * @param {object} info - Deck.gl picking info
   */
  const handleFeatureClick = useCallback((info) => {
    if (info && info.object) {
      setRawSelected(info.object);
    } else {
      // Clicking on empty map space deselects
      setRawSelected(null);
    }
  }, []);

  /**
   * Handle map hover event from Deck.gl onHover handler.
   *
   * @param {object} info - Deck.gl picking info
   */
  const handleFeatureHover = useCallback((info) => {
    if (info && info.object) {
      setRawHovered(info.object);
    } else {
      setRawHovered(null);
    }
  }, []);

  /**
   * Programmatically select a feature by its stable ID.
   *
   * @param {string} id
   * @param {object[]} features
   */
  const selectFeatureById = useCallback((id, features = []) => {
    if (!id || !features.length) {
      setRawSelected(null);
      return;
    }

    const match = features.find(
      (f) =>
        f.id === id ||
        f.properties?.tile_id === id ||
        f.properties?.feature_id === id
    );

    setRawSelected(match || null);
  }, []);

  /**
   * Reset selection back to null.
   */
  const resetSelection = useCallback(() => {
    setRawSelected(null);
    setRawHovered(null);
  }, []);

  return {
    selectedFeature,
    rawSelected,
    hoveredFeature,
    selectedFeatureId,
    handleFeatureClick,
    handleFeatureHover,
    selectFeatureById,
    resetSelection,
    hasSelection: selectedFeature !== null,
  };
}

export default useSelectedFeature;
