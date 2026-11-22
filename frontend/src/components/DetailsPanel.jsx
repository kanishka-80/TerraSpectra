/**
 * TerraSpectra — DetailsPanel Component (Day 4 Deliverable)
 *
 * Populates agreed scene/tile metadata, predicted class, confidence, uncertainty,
 * and model provenance for the selected map feature.
 *
 * Key Behaviors:
 *   • Identifies feature by stable tile_id / feature_id.
 *   • Handles missing metadata gracefully with explicit "Not provided" or
 *     "Pending scene intake" rather than misleading placeholder data.
 *   • Provides a high-visibility reset/clear selection control.
 *   • Clearly flags mock/sample data to avoid confusing demos with real predictions.
 */

import {
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Layers,
  Calendar,
  Satellite,
  Compass,
  Box,
  Cpu,
  Info,
} from "lucide-react";
import { CLASS_METADATA } from "../types/prediction.js";

export function DetailsPanel({
  selectedFeature,
  onResetSelection,
  isDemo = true,
  sceneSummary = null,
}) {
  if (!selectedFeature) {
    return (
      <div className="details-panel details-panel-empty" aria-label="Feature Details">
        <div className="empty-panel-icon" aria-hidden="true">
          <Layers size={36} />
        </div>
        <h4>No Feature Selected</h4>
        <p className="empty-panel-text">
          Click any polygon tile or sensor point on the map to inspect its spectral
          classification, confidence score, and spatial metadata.
        </p>

        {sceneSummary && (
          <div className="scene-quick-summary">
            <h5>Scene Overview</h5>
            <div className="summary-pills">
              <span className="summary-pill total">
                Total Features: <strong>{sceneSummary.total || 0}</strong>
              </span>
              <span className="summary-pill healthy">
                Healthy: <strong>{sceneSummary.healthy || 0}</strong>
              </span>
              <span className="summary-pill stressed">
                Alerts: <strong>{sceneSummary.stressed || 0}</strong>
              </span>
            </div>
          </div>
        )}

        <div className="empty-panel-hint">
          <Info size={14} />
          <span>Interactive Deck.gl GIS layer active</span>
        </div>
      </div>
    );
  }

  const {
    stableId,
    label,
    className,
    classDisplayName,
    isAlert,
    isProvisional,
    confidence,
    uncertainty,
    metadata,
    _isMock,
    geometry,
  } = selectedFeature;

  const classMeta = CLASS_METADATA[className] || CLASS_METADATA.demo;

  // Format confidence & uncertainty cleanly
  const formattedConfidence =
    typeof confidence === "number"
      ? `${(confidence * 100).toFixed(1)}%`
      : "Not computed";

  const formattedUncertainty =
    typeof uncertainty === "number"
      ? `± ${(uncertainty * 100).toFixed(1)}%`
      : "Not estimated";

  return (
    <div className="details-panel" aria-label="Feature Details">
      {/* Header with Title, Stable ID & Reset Button */}
      <div className="details-header">
        <div className="details-header-title">
          <h4>{label || "Feature Details"}</h4>
          <span className="stable-id-pill" title="Stable Feature Identifier">
            ID: {stableId}
          </span>
        </div>

        {onResetSelection && (
          <button
            type="button"
            className="reset-selection-btn"
            onClick={onResetSelection}
            title="Clear selection (Deselect feature)"
            aria-label="Clear selection"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Mock Notice Banner if feature is sample data */}
      {(_isMock || isDemo) && (
        <div className="details-mock-banner" role="note">
          <Info size={14} />
          <span>Sample data fixture. Not a confirmed field prediction.</span>
        </div>
      )}

      {/* Primary Classification Card */}
      <div className="details-card classification-card">
        <div className="card-top-row">
          <div className="class-identity">
            <span
              className="class-color-indicator"
              style={{ backgroundColor: classMeta.hex }}
              aria-hidden="true"
            />
            <div>
              <strong className="class-name">{classDisplayName}</strong>
              <p className="class-desc">{classMeta.description}</p>
            </div>
          </div>

          <div className="status-badges">
            {isAlert && (
              <span className="badge badge-alert">
                <AlertTriangle size={12} />
                Stress Alert
              </span>
            )}
            {!isAlert && className === "healthy" && (
              <span className="badge badge-healthy">
                <CheckCircle size={12} />
                Healthy
              </span>
            )}
            {isProvisional && (
              <span className="badge badge-provisional">
                <HelpCircle size={12} />
                Provisional
              </span>
            )}
          </div>
        </div>

        <div className="metric-row">
          <div className="metric-box">
            <span className="metric-label">Model Confidence</span>
            <span className="metric-value">{formattedConfidence}</span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Uncertainty</span>
            <span className="metric-value">{formattedUncertainty}</span>
          </div>
        </div>
      </div>

      {/* Geospatial & Scene Metadata */}
      <div className="details-card">
        <h5>Geospatial & Scene Metadata</h5>
        <dl className="metadata-grid">
          <div className="meta-item">
            <dt><Layers size={13} /> Scene ID</dt>
            <dd>{metadata.sceneId || "Not provided"}</dd>
          </div>

          <div className="meta-item">
            <dt><Satellite size={13} /> Sensor</dt>
            <dd>{metadata.sensor || "Pending intake"}</dd>
          </div>

          <div className="meta-item">
            <dt><Calendar size={13} /> Acquisition</dt>
            <dd>{metadata.acquisitionDate || "Not recorded"}</dd>
          </div>

          <div className="meta-item">
            <dt><Compass size={13} /> CRS</dt>
            <dd>{metadata.crs || "EPSG:4326"}</dd>
          </div>

          <div className="meta-item">
            <dt><Box size={13} /> Patch Grid</dt>
            <dd>{metadata.dimensions || "Pending scene intake"}</dd>
          </div>

          <div className="meta-item">
            <dt><Layers size={13} /> Geometry</dt>
            <dd>{geometry?.type || "Unknown geometry"}</dd>
          </div>
        </dl>
      </div>

      {/* Model & Provenance */}
      <div className="details-card">
        <h5>Model Provenance</h5>
        <dl className="metadata-grid">
          <div className="meta-item">
            <dt><Cpu size={13} /> Architecture</dt>
            <dd>{metadata.modelName || "3D-CNN Baseline"}</dd>
          </div>

          <div className="meta-item">
            <dt><Info size={13} /> Checkpoint</dt>
            <dd>{metadata.modelVersion || "v0.1.0-provisional"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default DetailsPanel;
