/**
 * TerraSpectra — MapLegend Component
 *
 * Displays the colour-coded prediction layer categories.
 *
 * IMPORTANT:
 * Current categories and colours are provisional demo values.
 * Update them after confirmation from the backend and ML teams.
 */

import { CLASS_COLORS, CLASS_LABELS } from "../map/layers/layerFactory.js";

export function MapLegend({ isDemo = true }) {
  const categories = Object.entries(CLASS_LABELS).map(([key, label]) => {
    const rgba = CLASS_COLORS[key] || [120, 120, 120, 180];

    const color = `rgba(
      ${rgba[0]},
      ${rgba[1]},
      ${rgba[2]},
      ${rgba[3] / 255}
    )`;

    return {
      key,
      label,
      color,
      // All current class labels are provisional demo values.
      isProvisional: true,
    };
  });

  return (
    <div className="map-legend-card">
      {/* Header */}
      <div className="map-legend-header">
        <strong>Prediction Layer Legend</strong>

        <span className="legend-tag">
          {isDemo ? "DEMO OVERLAY" : "BACKEND DATA"}
        </span>
      </div>

      {/* Legend categories */}
      <div className="map-legend-items">
        {categories.map((category) => (
          <div key={category.key} className="legend-item">
            <span
              className="legend-color-box"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />

            <span className="legend-item-label">
              {category.label}
            </span>

            {category.isProvisional && (
              <span className="provisional-pill">
                Provisional
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Footer information */}
      <div className="map-legend-footer" role="note">
        <span aria-hidden="true">ⓘ</span>

        <span>
          {isDemo
            ? "DEMO: Geometry, categories and locations are sample placeholders awaiting backend and ML confirmation."
            : "Backend data mode: Verify class labels, geometry and metadata against the confirmed backend contract."}
        </span>
      </div>
    </div>
  );
}

export default MapLegend;