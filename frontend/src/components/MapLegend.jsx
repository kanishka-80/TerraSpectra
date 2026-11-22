/**
 * TerraSpectra — MapLegend Component (Day 3 / Day 5 Deliverable)
 *
 * Displays color-coded prediction layer categories aligned with the ML contract.
 *
 * Confirmed Categories (Harsh - ml/configs/classes.yaml):
 *   • Healthy: Normal spectral reflectance
 *   • Stressed (Alert): Physiological stress anomaly
 *   • NoData / Masked: Masked background or cloud
 *
 * Clearly marks provisional demo categories with a distinct badge.
 */

import {
  CLASS_METADATA,
  CONFIRMED_CLASSES,
} from "../types/prediction.js";

export function MapLegend({
  isDemo = true,
  visibleCategories = null,
  activeLayerCount = 1,
}) {
  // Primary confirmed classes
  const confirmedList = [
    CONFIRMED_CLASSES.HEALTHY,
    CONFIRMED_CLASSES.STRESSED,
    CONFIRMED_CLASSES.NODATA,
  ];

  // If in demo mode, include provisional categories
  const categoryKeys = isDemo
    ? [...confirmedList, "demo", "uncertain"]
    : confirmedList;

  // Filter if caller provided a subset of visible categories
  const displayKeys = visibleCategories
    ? categoryKeys.filter((k) => visibleCategories.includes(k))
    : categoryKeys;

  return (
    <aside className="map-legend" aria-label="Map Legend">
      <div className="map-legend-header">
        <div className="legend-title-group">
          <h4>Spectral Prediction Legend</h4>
          <span className="legend-badge">
            {isDemo ? "Sample / Demo" : "Model Output"}
          </span>
        </div>
        <span className="legend-layer-count">
          {activeLayerCount} layer{activeLayerCount !== 1 ? "s" : ""} active
        </span>
      </div>

      <div className="map-legend-items" role="list">
        {displayKeys.map((key) => {
          const meta = CLASS_METADATA[key] || CLASS_METADATA.demo;
          return (
            <div key={key} className="legend-item" role="listitem">
              <span
                className="legend-color-box"
                style={{ backgroundColor: meta.hex }}
                aria-hidden="true"
              />

              <div className="legend-item-info">
                <span className="legend-item-label">{meta.name}</span>
                {meta.isAlert && (
                  <span className="alert-pill" title="Early stress alert">
                    Alert
                  </span>
                )}
                {meta.isProvisional && (
                  <span className="provisional-pill" title="Provisional category awaiting ML confirmation">
                    Provisional
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="map-legend-footer" role="note">
        <span className="info-icon" aria-hidden="true">ⓘ</span>
        <p>
          {isDemo
            ? "DEMO: Geometry and categories are sample placeholders. Not real farm crop stress predictions."
            : "EPSG:4326 | Predictions derived from hyperspectral 3D-CNN / ViT pipeline."}
        </p>
      </div>
    </aside>
  );
}

export default MapLegend;
