/**
 * TerraSpectra — ModelMetadata Component
 *
 * Week 3 Day 4 Deliverable
 *
 * Surfaces model architecture, checkpoint version, inference execution device,
 * and data provenance with full transparency.
 */

import { Cpu, Server, Shield, Database, Compass, Layers } from "lucide-react";
import {
  getProvenanceInfo,
  formatResolution,
  formatFieldValue,
} from "../utils/formatPrediction.js";

export default function ModelMetadata({
  metadata = {},
  isDemo = false,
  _isMock = false,
  _isSampleFixture = false,
}) {
  const provenance = getProvenanceInfo(
    { metadata, _isMock, _isSampleFixture },
    isDemo
  );

  const modelName = formatFieldValue(
    metadata.modelName || metadata.model_name,
    "3D-CNN Spatial-Spectral Baseline"
  );

  const checkpoint = formatFieldValue(
    metadata.checkpoint || metadata.modelVersion || metadata.model_version,
    "Standard Checkpoint (v0.3.0)"
  );

  const device = formatFieldValue(
    metadata.executionDevice || metadata.execution_device || metadata.device,
    isDemo || _isMock ? "Mock Engine" : "CPU / Local"
  );

  const gsd = formatResolution(
    metadata.spatialResolutionM || metadata.spatial_resolution_m
  );

  const crs = formatFieldValue(metadata.crs, "EPSG:4326");

  return (
    <div className="details-card model-metadata-card" aria-label="Model Metadata">
      <div className="card-header-with-badge">
        <h5>Model Provenance & Execution</h5>
        <span
          className={`provenance-pill ${provenance.badgeClass}`}
          title={provenance.description}
        >
          {provenance.label}
        </span>
      </div>

      <dl className="metadata-grid">
        <div className="meta-item">
          <dt>
            <Cpu size={13} /> Architecture
          </dt>
          <dd title={modelName}>{modelName}</dd>
        </div>

        <div className="meta-item">
          <dt>
            <Database size={13} /> Checkpoint
          </dt>
          <dd title={checkpoint}>{checkpoint}</dd>
        </div>

        <div className="meta-item">
          <dt>
            <Server size={13} /> Device
          </dt>
          <dd className="device-code">{device.toUpperCase()}</dd>
        </div>

        <div className="meta-item">
          <dt>
            <Layers size={13} /> GSD / Res
          </dt>
          <dd>{gsd}</dd>
        </div>

        <div className="meta-item">
          <dt>
            <Compass size={13} /> Projection
          </dt>
          <dd>{crs}</dd>
        </div>

        <div className="meta-item">
          <dt>
            <Shield size={13} /> Source
          </dt>
          <dd>{provenance.type === "real" ? "Production API" : "Simulated"}</dd>
        </div>
      </dl>
    </div>
  );
}
