/**
 * TerraSpectra — LayerControls Component (Day 5 Deliverable)
 *
 * Controls layer visibility for Deck.gl map visualization:
 *   • Prediction Overlays (Polygons & Points)
 *   • Stress Alerts (Highlighted stress anomalies)
 *   • Tile Boundaries (Grid outlines)
 *
 * Provides accessible keyboard-friendly toggle switches and active layer counts.
 */

import { Layers, Eye, EyeOff, AlertTriangle, Grid } from "lucide-react";

export function LayerControls({
  layerVisibility = {
    predictions: true,
    alerts: true,
    boundaries: true,
  },
  onToggleLayer,
  totalFeatures = 0,
}) {
  const activeCount = Object.values(layerVisibility).filter(Boolean).length;

  return (
    <div className="layer-controls-card" aria-label="Map Layer Visibility Controls">
      <div className="layer-controls-header">
        <div className="layer-controls-title">
          <Layers size={18} />
          <h4>Map Layers</h4>
        </div>
        <span className="active-badge" title="Number of active map layers">
          {activeCount} of {Object.keys(layerVisibility).length} Active
        </span>
      </div>

      <div className="layer-toggle-list" role="group" aria-label="Layer toggles">
        {/* Prediction Overlays */}
        <button
          type="button"
          className={`layer-toggle-btn ${layerVisibility.predictions ? "active" : ""}`}
          onClick={() => onToggleLayer("predictions")}
          aria-pressed={layerVisibility.predictions}
          title="Toggle prediction polygons and observation points"
        >
          <div className="toggle-left">
            {layerVisibility.predictions ? (
              <Eye size={16} className="toggle-icon active-icon" />
            ) : (
              <EyeOff size={16} className="toggle-icon muted-icon" />
            )}
            <div className="toggle-label-group">
              <span className="toggle-label">Prediction Polygons</span>
              <span className="toggle-desc">
                Spectral class tiles ({totalFeatures} features)
              </span>
            </div>
          </div>
          <span className={`toggle-switch-indicator ${layerVisibility.predictions ? "on" : "off"}`} />
        </button>

        {/* Stress Hotspots / Alerts */}
        <button
          type="button"
          className={`layer-toggle-btn ${layerVisibility.alerts ? "active" : ""}`}
          onClick={() => onToggleLayer("alerts")}
          aria-pressed={layerVisibility.alerts}
          title="Toggle high-priority stress alert highlights"
        >
          <div className="toggle-left">
            <AlertTriangle
              size={16}
              className={`toggle-icon ${layerVisibility.alerts ? "alert-icon" : "muted-icon"}`}
            />
            <div className="toggle-label-group">
              <span className="toggle-label">Stress Alerts</span>
              <span className="toggle-desc">Physiological anomaly highlights</span>
            </div>
          </div>
          <span className={`toggle-switch-indicator ${layerVisibility.alerts ? "on" : "off"}`} />
        </button>

        {/* Tile Boundaries */}
        <button
          type="button"
          className={`layer-toggle-btn ${layerVisibility.boundaries ? "active" : ""}`}
          onClick={() => onToggleLayer("boundaries")}
          aria-pressed={layerVisibility.boundaries}
          title="Toggle tile outline boundaries"
        >
          <div className="toggle-left">
            <Grid
              size={16}
              className={`toggle-icon ${layerVisibility.boundaries ? "boundary-icon" : "muted-icon"}`}
            />
            <div className="toggle-label-group">
              <span className="toggle-label">Tile Grid Outlines</span>
              <span className="toggle-desc">Spatial raster patch boundaries</span>
            </div>
          </div>
          <span className={`toggle-switch-indicator ${layerVisibility.boundaries ? "on" : "off"}`} />
        </button>
      </div>
    </div>
  );
}

export default LayerControls;
