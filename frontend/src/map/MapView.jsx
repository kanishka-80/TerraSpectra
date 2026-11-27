/**
 * TerraSpectra — Interactive Prediction Map View (Week 3 Refined)
 *
 * Full-featured geospatial visualization dashboard incorporating:
 *   • Multi-layer Deck.gl rendering (Polygons, MultiPolygons, Points, Boundaries, Alerts)
 *   • MapLibre GL Carto Positron basemap
 *   • Real-time reactive PredictionFilters (Scene, Class, Date, Keyword Search, Alerts Only)
 *   • Interactive selection and hover tooltips synchronized with DetailsPanel
 *   • LayerControls for granular visibility toggling
 *   • MapLegend reflecting confirmed ML categories vs provisional demo data
 *   • Graceful handling of empty, filtered, loading, and error states
 */

import { useState, useMemo, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import { AlertCircle, RefreshCw, Layers, FilterX } from "lucide-react";

import "maplibre-gl/dist/maplibre-gl.css";

import { SAMPLE_FEATURES } from "./layers/predictionLayer.js";
import {
  buildPredictionLayer,
  buildStressAlertLayer,
  buildTileBoundaryLayer,
} from "./layers/layerFactory.js";

import { useSelectedFeature } from "../hooks/useSelectedFeature.js";
import { usePredictionFilters } from "../hooks/usePredictionFilters.js";
import MapLegend from "../components/MapLegend.jsx";
import DetailsPanel from "../components/DetailsPanel.jsx";
import LayerControls from "../components/LayerControls.jsx";
import PredictionFilters from "../components/PredictionFilters.jsx";

const INITIAL_VIEW_STATE = {
  longitude: 80.207,
  latitude: 13.086,
  zoom: 14,
  pitch: 15,
  bearing: 0,
};

export default function MapView({
  features = SAMPLE_FEATURES,
  isDemo = true,
  isLoading = false,
  errorMessage = null,
  onRetry = null,
}) {
  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState({
    predictions: true,
    alerts: true,
    boundaries: true,
  });

  // Feature selection & hover hook
  const {
    selectedFeature,
    selectedFeatureId,
    hoveredFeature,
    handleFeatureClick,
    handleFeatureHover,
    resetSelection,
  } = useSelectedFeature();

  // Ensure features is a safe memoized array
  const safeFeatures = useMemo(
    () => (Array.isArray(features) ? features : []),
    [features]
  );

  // Spatial & attribute filters hook
  const {
    sceneFilter,
    classFilter,
    dateFilter,
    searchQuery,
    alertsOnly,
    isFiltered,
    availableScenes,
    availableClasses,
    availableDates,
    filteredFeatures,
    counts,
    setSceneFilter,
    setClassFilter,
    setDateFilter,
    setSearchQuery,
    setAlertsOnly,
    resetFilters,
  } = usePredictionFilters(safeFeatures);

  // Toggle layer visibility
  const handleToggleLayer = useCallback((layerKey) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  }, []);

  // Compute scene quick summary from currently visible / filtered features
  const sceneSummary = useMemo(() => {
    return {
      total: counts.visible,
      healthy: counts.healthy,
      stressed: counts.stressed,
    };
  }, [counts]);

  // Compute Deck.gl layers dynamically based on visibility, selection, and filtered features
  const layers = useMemo(() => {
    if (filteredFeatures.length === 0) return [];

    const activeLayers = [];

    // 1. Boundary Grid layer (Bottom)
    if (layerVisibility.boundaries) {
      const boundaryLayer = buildTileBoundaryLayer(
        "tile-boundaries-layer",
        filteredFeatures
      );
      if (boundaryLayer) activeLayers.push(boundaryLayer);
    }

    // 2. Primary Prediction Overlay (Middle)
    if (layerVisibility.predictions) {
      const predLayer = buildPredictionLayer(
        "prediction-overlay-layer",
        filteredFeatures,
        {
          selectedFeatureId,
          onClick: handleFeatureClick,
          onHover: handleFeatureHover,
        }
      );
      if (predLayer) activeLayers.push(predLayer);
    }

    // 3. Stress Alert Highlights (Top)
    if (layerVisibility.alerts) {
      const alertLayer = buildStressAlertLayer(
        "stress-alert-highlight-layer",
        filteredFeatures,
        {
          onClick: handleFeatureClick,
        }
      );
      if (alertLayer) activeLayers.push(alertLayer);
    }

    return activeLayers;
  }, [
    filteredFeatures,
    layerVisibility,
    selectedFeatureId,
    handleFeatureClick,
    handleFeatureHover,
  ]);

  // Check if all layers are hidden
  const allLayersHidden =
    !layerVisibility.predictions &&
    !layerVisibility.alerts &&
    !layerVisibility.boundaries;

  const activeLayerCount = Object.values(layerVisibility).filter(Boolean).length;

  return (
    <div
      className="terra-map-container"
      role="region"
      aria-label="Hyperspectral Prediction Map"
    >
      {/* Top Demo Banner */}
      {isDemo && (
        <div className="terra-map-demo-banner" role="banner">
          <span className="demo-tag">PROVISIONAL DEMO</span>
          <span>
            Sample geometry and mock categories. Not real farm locations or verified disease predictions.
          </span>
        </div>
      )}

      {/* Main Map Viewport */}
      <div className="terra-map-canvas">
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          onClick={handleFeatureClick}
          getCursor={({ isHovering }) => (isHovering ? "pointer" : "default")}
        >
          <Map
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            reuseMaps
          >
            <NavigationControl position="top-right" />
          </Map>
        </DeckGL>

        {/* Hover Tooltip */}
        {hoveredFeature && (
          <div
            className="map-hover-tooltip"
            role="tooltip"
            aria-hidden="true"
          >
            <strong>{hoveredFeature.label}</strong>
            <div className="tooltip-sub">
              <span>{hoveredFeature.classDisplayName}</span>
              {typeof hoveredFeature.score === "number" && (
                <span> | Score: {(hoveredFeature.score * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>
        )}

        {/* Empty State Overlay if no raw features exist */}
        {safeFeatures.length === 0 && !isLoading && (
          <div className="map-overlay-message empty-overlay">
            <Layers size={36} />
            <h4>No Prediction Layers Available</h4>
            <p>
              Submit an analysis request or configure backend endpoints to load
              hyperspectral prediction overlays.
            </p>
            {onRetry && (
              <button type="button" className="retry-btn" onClick={onRetry}>
                <RefreshCw size={14} /> Reload Data
              </button>
            )}
          </div>
        )}

        {/* Filtered Out Empty State: Raw features exist, but active filters matched 0 */}
        {safeFeatures.length > 0 && filteredFeatures.length === 0 && !isLoading && (
          <div className="map-overlay-message empty-overlay">
            <FilterX size={36} />
            <h4>No Features Match Active Filters</h4>
            <p>
              None of the {safeFeatures.length} available features meet the selected filter criteria.
            </p>
            <button type="button" className="retry-btn" onClick={resetFilters}>
              <RefreshCw size={14} /> Reset Filters
            </button>
          </div>
        )}

        {/* All Layers Hidden Overlay */}
        {allLayersHidden && filteredFeatures.length > 0 && (
          <div className="map-overlay-message hidden-layers-overlay">
            <Layers size={32} />
            <h4>All Map Layers Hidden</h4>
            <p>Use the Map Layers panel on the right to toggle visible overlays.</p>
            <button
              type="button"
              className="retry-btn"
              onClick={() =>
                setLayerVisibility({
                  predictions: true,
                  alerts: true,
                  boundaries: true,
                })
              }
            >
              Show All Layers
            </button>
          </div>
        )}

        {/* Loading State Overlay */}
        {isLoading && (
          <div className="map-overlay-message loading-overlay">
            <RefreshCw size={32} className="spin-icon" />
            <h4>Processing Hyperspectral Overlays...</h4>
            <p>Rendering Deck.gl layers and spatial geometries.</p>
          </div>
        )}

        {/* Error State Banner */}
        {errorMessage && (
          <div className="map-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
            {onRetry && (
              <button type="button" className="error-retry-action" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sidebar with Prediction Filters, Layer Controls, Legend, and Feature Details Panel */}
      <div className="terra-map-sidebar">
        <PredictionFilters
          sceneFilter={sceneFilter}
          classFilter={classFilter}
          dateFilter={dateFilter}
          searchQuery={searchQuery}
          alertsOnly={alertsOnly}
          isFiltered={isFiltered}
          availableScenes={availableScenes}
          availableClasses={availableClasses}
          availableDates={availableDates}
          counts={counts}
          onSceneChange={setSceneFilter}
          onClassChange={setClassFilter}
          onDateChange={setDateFilter}
          onSearchChange={setSearchQuery}
          onAlertsOnlyToggle={setAlertsOnly}
          onResetFilters={resetFilters}
        />

        <LayerControls
          layerVisibility={layerVisibility}
          onToggleLayer={handleToggleLayer}
          totalFeatures={counts.visible}
        />

        <MapLegend
          isDemo={isDemo}
          activeLayerCount={activeLayerCount}
        />

        <DetailsPanel
          selectedFeature={selectedFeature}
          onResetSelection={resetSelection}
          isDemo={isDemo}
          sceneSummary={sceneSummary}
        />
      </div>
    </div>
  );
}
