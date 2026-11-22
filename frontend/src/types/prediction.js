/**
 * TerraSpectra — Prediction Data Interfaces & Types
 *
 * Aligned with:
 *   • Backend Contract: Kanishka (backend/app/schemas/analysis.py, backend/app/schemas/common.py)
 *   • ML Model Output: Harsh (ml/configs/classes.yaml, 3D-CNN / ViT hybrid)
 *   • GIS Spatial Specs: Khushi (docs/dataset/gis-handoff.md, EPSG:4326)
 *
 * All definitions here represent the single source of truth for the frontend
 * application regarding prediction requests, responses, class labels, and metadata.
 */

// ─── CONFIRMED ML CLASSES (Harsh - ml/configs/classes.yaml) ───────────────────

/**
 * Confirmed taxonomy from the ML team:
 *   • 0: "healthy" — Vegetation exhibiting normal spectral reflectance without early stress indicators.
 *   • 1: "stressed" — Vegetation exhibiting subtle red-edge or water-absorption anomalies (alert class).
 *   • -1: "unclassified_nodata" — Masked background, cloud-contaminated, or NoData pixels.
 */
export const CONFIRMED_CLASSES = {
  HEALTHY: "healthy",
  STRESSED: "stressed",
  NODATA: "unclassified_nodata",
};

/**
 * Class display labels and user-facing semantics.
 */
export const CLASS_METADATA = {
  [CONFIRMED_CLASSES.HEALTHY]: {
    id: 0,
    name: "Healthy",
    isAlert: false,
    color: [56, 167, 72, 190],      // Emerald green
    hex: "#38a748",
    description: "Normal spectral reflectance; no early stress detected.",
    isProvisional: false,
  },
  [CONFIRMED_CLASSES.STRESSED]: {
    id: 1,
    name: "Stressed (Alert)",
    isAlert: true,
    color: [220, 54, 54, 200],      // Coral red / alert
    hex: "#dc3636",
    description: "Red-edge/water absorption anomaly detected; physiological stress alert.",
    isProvisional: false,
  },
  [CONFIRMED_CLASSES.NODATA]: {
    id: -1,
    name: "NoData / Masked",
    isAlert: false,
    color: [140, 150, 160, 140],    // Neutral slate
    hex: "#8c96a0",
    description: "Cloud-masked, water body, or background NoData pixel.",
    isProvisional: false,
  },
  // Provisional demo classes used ONLY when running in local mock/demo mode
  demo: {
    id: 99,
    name: "Demo / Placeholder",
    isAlert: false,
    color: [64, 145, 108, 180],     // Paddy green
    hex: "#40916c",
    description: "Provisional placeholder class awaiting backend model confirmation.",
    isProvisional: true,
  },
  uncertain: {
    id: 98,
    name: "Uncertain (Demo)",
    isAlert: false,
    color: [245, 184, 45, 190],     // Amber
    hex: "#f5b82d",
    description: "Low-confidence prediction requiring field verification.",
    isProvisional: true,
  },
};

// ─── VALIDATION HELPERS ───────────────────────────────────────────────────────

/**
 * Check whether a class name is provisional (not yet finalized in production).
 * @param {string} className
 * @returns {boolean}
 */
export function isProvisionalClass(className) {
  const meta = CLASS_METADATA[className?.toLowerCase()];
  return meta ? meta.isProvisional : true;
}

/**
 * Validate bounding box coordinates in EPSG:4326 format: [min_lon, min_lat, max_lon, max_lat]
 * Aligned with backend Pydantic validator `validate_bounding_box_coordinates`.
 *
 * @param {number[]} bbox
 * @returns {boolean}
 */
export function isValidBoundingBox(bbox) {
  if (!Array.isArray(bbox) || bbox.length !== 4) return false;
  const [minLon, minLat, maxLon, maxLat] = bbox;

  if (typeof minLon !== "number" || typeof minLat !== "number" ||
      typeof maxLon !== "number" || typeof maxLat !== "number") {
    return false;
  }

  if (minLon < -180 || minLon > 180 || maxLon < -180 || maxLon > 180) return false;
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return false;
  if (minLon >= maxLon || minLat >= maxLat) return false;

  return true;
}

/**
 * Normalize raw feature properties into a standardized frontend Feature record.
 * Ensures missing fields are explicitly flagged rather than filled with fake data.
 *
 * @param {object} rawFeature - GeoJSON feature or API feature record
 * @returns {object} Normalized feature object
 */
export function normalizePredictionFeature(rawFeature) {
  if (!rawFeature) return null;

  const props = rawFeature.properties || rawFeature;
  const rawClass = (props.class || props.predicted_class || "demo").toLowerCase();
  const classMeta = CLASS_METADATA[rawClass] || CLASS_METADATA.demo;

  return {
    id: rawFeature.id || props.tile_id || props.feature_id || `feature-${Math.random().toString(36).substring(2, 9)}`,
    stableId: props.tile_id || props.feature_id || rawFeature.id || "Unspecified ID",
    label: props.label || props.tile_id || "Unnamed Feature",
    className: rawClass,
    classDisplayName: classMeta.name,
    isAlert: classMeta.isAlert,
    isProvisional: classMeta.isProvisional,
    confidence: typeof props.confidence === "number" ? props.confidence : (typeof props.score === "number" ? props.score : null),
    uncertainty: typeof props.uncertainty === "number" ? props.uncertainty : null,
    metadata: {
      sceneId: props.metadata?.scene_id || props.scene_id || null,
      tileId: props.metadata?.tile_id || props.tile_id || null,
      sensor: props.metadata?.sensor || props.sensor || "Pending confirmation",
      acquisitionDate: props.metadata?.acquisition_date || props.acquisition_date || null,
      crs: props.metadata?.crs || props.crs || "EPSG:4326",
      dimensions: props.metadata?.dimensions || props.dimensions || null,
      modelName: props.metadata?.model_name || props.model_name || null,
      modelVersion: props.metadata?.model_version || props.model_version || null,
    },
    geometry: rawFeature.geometry || null,
    _isMock: Boolean(props._isMock || rawFeature._isMock),
  };
}

export default {
  CONFIRMED_CLASSES,
  CLASS_METADATA,
  isProvisionalClass,
  isValidBoundingBox,
  normalizePredictionFeature,
};
