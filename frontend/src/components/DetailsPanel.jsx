/**
 * TerraSpectra — DetailsPanel Component (Week 3 Refined)
 *
 * Week 3 Day 4 Deliverable
 *
 * Displays detailed prediction metadata, exact score semantics, and model
 * provenance for the selected map feature.
 *
 * Guardrails enforced:
 *   • Never automatically conflates numeric scores with disease probabilities or confidence.
 *   • Displays explicit score types (Softmax Score, Calibrated Confidence, or Raw Logit).
 *   • Distinguishes unavailable values from zero or negative results.
 *   • Clearly tags data provenance: Real Model Output, Test Fixture, or Simulated Mock Data.
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
  Info,
} from "lucide-react";

import { CLASS_METADATA } from "../types/prediction.js";
import ModelMetadata from "./ModelMetadata.jsx";
import {
  formatModelScore,
  formatUncertainty,
  getProvenanceInfo,
  formatFieldValue,
} from "../utils/formatPrediction.js";

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
          classification, model score semantics, and provenance metadata.
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
    isUnknown,
    score,
    scoreType,
    scores,
    uncertainty,
    metadata = {},
    _isMock,
    _isSampleFixture,
    geometry,
    hasGeometry = Boolean(geometry),
  } = selectedFeature;

  const classMeta = CLASS_METADATA[className] || {
    id: 999,
    name: classDisplayName || "Unknown Category",
    hex: "#8c96a0",
    description: "Unrecognized class category returned by model output.",
  };

  const scoreInfo = formatModelScore(score, scoreType);
  const formattedUncertainty = formatUncertainty(uncertainty);
  const provenance = getProvenanceInfo(
    { metadata, _isMock, _isSampleFixture },
    isDemo
  );

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

      {/* Provenance Notice Banner */}
      <div className={`details-mock-banner ${provenance.badgeClass}`} role="note">
        <Info size={14} />
        <span>{provenance.description}</span>
      </div>

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
                {isUnknown ? "Unknown Category" : "Provisional"}
              </span>
            )}
          </div>
        </div>

        {/* Metric Row with Explicit Score Semantics */}
        <div className="metric-row">
          <div className="metric-box">
            <div className="metric-header-row">
              <span className="metric-label">{scoreInfo.label}</span>
              <span className="metric-type-chip">{scoreInfo.type}</span>
            </div>
            <span className="metric-value">{scoreInfo.formatted}</span>
          </div>

          <div className="metric-box">
            <div className="metric-header-row">
              <span className="metric-label">Uncertainty</span>
            </div>
            <span className="metric-value">{formattedUncertainty}</span>
          </div>
        </div>

        {/* Multi-Class Score Breakdown (if available) */}
        {scores && typeof scores === "object" && Object.keys(scores).length > 0 && (
          <div className="class-scores-breakdown">
            <span className="breakdown-title">Class Distribution Probabilities</span>
            <div className="scores-list">
              {Object.entries(scores).map(([cls, val]) => {
                const meta = CLASS_METADATA[cls.toLowerCase()];
                const pct = typeof val === "number" ? (val * 100).toFixed(1) : 0;
                return (
                  <div key={cls} className="score-item">
                    <span className="score-cls-name">{meta ? meta.name : cls}</span>
                    <div className="score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: meta ? meta.hex : "#94a3b8",
                        }}
                      />
                    </div>
                    <span className="score-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Geospatial & Scene Metadata Card */}
      <div className="details-card">
        <h5>Geospatial & Scene Metadata</h5>
        <dl className="metadata-grid">
          <div className="meta-item">
            <dt>
              <Layers size={13} /> Scene ID
            </dt>
            <dd>{formatFieldValue(metadata.sceneId, "Pending intake")}</dd>
          </div>

          <div className="meta-item">
            <dt>
              <Satellite size={13} /> Sensor
            </dt>
            <dd>{formatFieldValue(metadata.sensor, "Pending confirmation")}</dd>
          </div>

          <div className="meta-item">
            <dt>
              <Calendar size={13} /> Acquisition
            </dt>
            <dd>{formatFieldValue(metadata.acquisitionDate, "Not recorded")}</dd>
          </div>

          <div className="meta-item">
            <dt>
              <Compass size={13} /> CRS
            </dt>
            <dd>{formatFieldValue(metadata.crs, "EPSG:4326")}</dd>
          </div>

          <div className="meta-item">
            <dt>
              <Box size={13} /> Patch Grid
            </dt>
            <dd>{formatFieldValue(metadata.dimensions, "32x32 px")}</dd>
          </div>

          <div className="meta-item">
            <dt>
              <Layers size={13} /> Geometry
            </dt>
            <dd>
              {hasGeometry
                ? geometry?.type || "Vector Geometry"
                : "Non-Spatial / Tabular"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Transparent Model Metadata & Provenance Component */}
      <ModelMetadata
        metadata={metadata}
        isDemo={isDemo}
        _isMock={_isMock}
        _isSampleFixture={_isSampleFixture}
      />
    </div>
  );
}

export default DetailsPanel;
