/**
 * TerraSpectra — Model Prediction Response Adapter
 *
 * Week 3 Day 2 Deliverable
 *
 * Decouples raw backend HTTP / async job responses from frontend GIS views:
 *   • Maps API response envelopes (Week 2 legacy, Week 3 real model, and async jobs) into stable view models.
 *   • Resilient handling of optional metadata, empty predictions, unknown classes, and missing geometries.
 *   • Keeps raw API response handling completely separate from Deck.gl map-layer rendering and DetailsPanel.
 *   • Transparently tags sample/mock data so demo layers are never mistaken for validated ML evidence.
 */

import {
  CLASS_METADATA,
  SCORE_TYPES,
  JOB_STATUS,
  formatScore,
} from "../types/prediction.js";

/**
 * Creates an empty/fallback prediction view model.
 *
 * @param {string} [notice]
 * @returns {object} Empty PredictionViewModel
 */
export function createEmptyViewModel(notice = "No prediction data available.") {
  return {
    jobId: null,
    status: "empty",
    timestamp: null,
    isMock: false,
    message: notice,
    metadata: {
      sceneId: null,
      tileId: null,
      sensor: "Pending confirmation",
      acquisitionDate: null,
      crs: "EPSG:4326",
      dimensions: null,
      spatialResolutionM: null,
      modelName: "Standard Model",
      modelVersion: "Unspecified",
      checkpoint: null,
      executionDevice: null,
      isMock: false,
    },
    metrics: {
      dominantClass: "unclassified_nodata",
      dominantClassLabel: "NoData / Masked",
      classDistribution: {},
      meanScore: null,
      scoreType: SCORE_TYPES.SOFTMAX_SCORE,
      meanUncertainty: null,
      totalFeatures: 0,
      alertCount: 0,
    },
    features: [],
    artifacts: {
      rasterDownloadUrl: null,
      summaryUrl: null,
    },
    hasSpatialData: false,
    raw: null,
  };
}

/**
 * Adapt a single raw feature into a normalized PredictionFeatureViewModel.
 *
 * @param {object} rawFeature - Raw GeoJSON Feature or dictionary
 * @param {boolean} [parentIsMock=false] - Whether the parent payload was tagged as mock
 * @returns {object} Normalized PredictionFeatureViewModel
 */
export function adaptFeature(rawFeature, parentIsMock = false) {
  if (!rawFeature || typeof rawFeature !== "object") {
    return null;
  }

  const props = rawFeature.properties || rawFeature;
  const rawClass = String(props.class || props.predicted_class || "demo").toLowerCase();

  // Resilient class resolution with fallback for unknown classes
  const knownMeta = CLASS_METADATA[rawClass];
  const isUnknown = !knownMeta;
  const classMeta = knownMeta || {
    id: 999,
    name: props.class || props.predicted_class || "Unknown Category",
    isAlert: false,
    color: [160, 160, 160, 180],
    hex: "#a0a0a0",
    description: "Unrecognized class category returned by model output.",
    isProvisional: true,
    isUnknown: true,
  };

  const score =
    typeof props.score === "number" && !Number.isNaN(props.score)
      ? props.score
      : typeof props.confidence === "number" && !Number.isNaN(props.confidence)
      ? props.confidence
      : null;

  const scoreType = props.score_type || SCORE_TYPES.SOFTMAX_SCORE;
  const uncertainty =
    typeof props.uncertainty === "number" && !Number.isNaN(props.uncertainty)
      ? props.uncertainty
      : null;

  // Geometry validation: ensure coordinates array exists if geometry is present
  const rawGeom = rawFeature.geometry;
  const isValidGeometry = Boolean(
    rawGeom &&
      typeof rawGeom === "object" &&
      typeof rawGeom.type === "string" &&
      Array.isArray(rawGeom.coordinates) &&
      rawGeom.coordinates.length > 0
  );

  const featureMeta = props.metadata || {};

  return {
    id:
      rawFeature.id ||
      props.tile_id ||
      props.feature_id ||
      `feat-${Math.random().toString(36).substring(2, 9)}`,
    stableId:
      props.tile_id ||
      props.feature_id ||
      rawFeature.id ||
      "Unspecified ID",
    label: props.label || props.tile_id || "Unnamed Feature",
    className: rawClass,
    classDisplayName: classMeta.name,
    isAlert: Boolean(classMeta.isAlert),
    isProvisional: Boolean(classMeta.isProvisional),
    isUnknown,
    score,
    scoreType,
    scoreFormatted: formatScore(score, scoreType),
    confidence: score, // Backward compatibility with Week 2 UI components
    scores: props.scores && typeof props.scores === "object" ? props.scores : null,
    uncertainty,
    metadata: {
      sceneId: featureMeta.scene_id || props.scene_id || null,
      tileId: featureMeta.tile_id || props.tile_id || null,
      sensor: featureMeta.sensor || props.sensor || "Pending confirmation",
      acquisitionDate:
        featureMeta.acquisition_date || props.acquisition_date || null,
      crs: featureMeta.crs || props.crs || "EPSG:4326",
      dimensions: featureMeta.dimensions || props.dimensions || null,
      spatialResolutionM:
        typeof featureMeta.spatial_resolution_m === "number"
          ? featureMeta.spatial_resolution_m
          : typeof props.spatial_resolution_m === "number"
          ? props.spatial_resolution_m
          : null,
      modelName: featureMeta.model_name || props.model_name || null,
      modelVersion: featureMeta.model_version || props.model_version || null,
      checkpoint: featureMeta.checkpoint || props.checkpoint || null,
      executionDevice:
        featureMeta.execution_device || props.execution_device || null,
    },
    geometry: isValidGeometry ? rawGeom : null,
    hasGeometry: isValidGeometry,
    _isMock: Boolean(props._isMock || rawFeature._isMock || parentIsMock),
  };
}

/**
 * Adapt a full backend prediction response into a standardized PredictionViewModel.
 *
 * Handles:
 *   • Week 3 StandardResponseEnvelope (`status === "success"`, `data: { metadata, metrics, features }`)
 *   • Week 2 legacy response (`data.metrics.mean_confidence`, `features` array)
 *   • Asynchronous Job envelopes (`status: "running" | "queued" | "completed" | "failed"`)
 *   • Direct FeatureCollection or raw array of features
 *   • Error envelopes and malformed / empty payloads
 *
 * @param {object} rawResponse - The backend JSON response
 * @returns {object} PredictionViewModel
 */
export function adaptPredictionResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== "object") {
    return createEmptyViewModel("Empty or invalid response received from server.");
  }

  // 1. Handle Asynchronous Job Envelopes
  if (
    rawResponse.status === JOB_STATUS.QUEUED ||
    rawResponse.status === JOB_STATUS.RUNNING
  ) {
    const emptyVm = createEmptyViewModel(
      `Inference job is ${rawResponse.status}. Polling for results...`
    );
    emptyVm.jobId = rawResponse.job_id || null;
    emptyVm.status = rawResponse.status;
    emptyVm.progress = typeof rawResponse.progress === "number" ? rawResponse.progress : 0;
    emptyVm.raw = rawResponse;
    return emptyVm;
  }

  if (rawResponse.status === JOB_STATUS.FAILED) {
    const errorVm = createEmptyViewModel(
      rawResponse.error?.message || "Inference job failed."
    );
    errorVm.jobId = rawResponse.job_id || null;
    errorVm.status = "error";
    errorVm.errorCode = rawResponse.error?.code || "JOB_FAILED";
    errorVm.raw = rawResponse;
    return errorVm;
  }

  // If completed async job, unwrap the inner result
  let payload = rawResponse;
  if (rawResponse.status === JOB_STATUS.COMPLETED && rawResponse.result) {
    payload = rawResponse.result;
  }

  // 2. Handle Structured Error Envelopes
  if (payload.status === "error") {
    const errorVm = createEmptyViewModel(
      payload.message || "Backend returned an error."
    );
    errorVm.jobId = payload.job_id || null;
    errorVm.status = "error";
    errorVm.errorCode = payload.error_code || "API_ERROR";
    errorVm.raw = rawResponse;
    return errorVm;
  }

  // 3. Extract Core Sections
  const isMock = Boolean(
    payload._isMock ||
      payload.data?.metadata?.is_mock ||
      payload.data?.metadata?.isMock ||
      rawResponse._isMock
  );

  const data = payload.data || payload;
  const rawMetadata = data.metadata || {};
  const rawMetrics = data.metrics || {};
  const rawFeatures = Array.isArray(data.features)
    ? data.features
    : Array.isArray(data)
    ? data
    : [];

  // Adapt features safely
  const adaptedFeatures = rawFeatures
    .map((f) => adaptFeature(f, isMock))
    .filter(Boolean);

  const totalFeatures = adaptedFeatures.length;
  const alertCount = adaptedFeatures.filter((f) => f.isAlert).length;
  const hasSpatialData = adaptedFeatures.some((f) => f.hasGeometry);

  // 4. Compute / Normalize Metrics
  let dominantClass = rawMetrics.dominant_class || null;
  let dominantClassLabel = "Unknown";
  let classDistribution = rawMetrics.class_distribution ? { ...rawMetrics.class_distribution } : {};
  let meanScore =
    typeof rawMetrics.mean_score === "number"
      ? rawMetrics.mean_score
      : typeof rawMetrics.mean_confidence === "number"
      ? rawMetrics.mean_confidence
      : null;
  const scoreType = rawMetrics.score_type || SCORE_TYPES.SOFTMAX_SCORE;
  const meanUncertainty =
    typeof rawMetrics.mean_uncertainty === "number"
      ? rawMetrics.mean_uncertainty
      : null;

  // Auto-calculate metrics from features if backend omitted them
  if (totalFeatures > 0) {
    const counts = {};
    let scoreSum = 0;
    let scoreCount = 0;

    for (const f of adaptedFeatures) {
      counts[f.className] = (counts[f.className] || 0) + 1;
      if (typeof f.score === "number") {
        scoreSum += f.score;
        scoreCount += 1;
      }
    }

    if (!dominantClass) {
      let maxCount = -1;
      for (const [cls, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantClass = cls;
        }
      }
    }

    if (Object.keys(classDistribution).length === 0) {
      for (const [cls, count] of Object.entries(counts)) {
        classDistribution[cls] = Number((count / totalFeatures).toFixed(3));
      }
    }

    if (meanScore === null && scoreCount > 0) {
      meanScore = Number((scoreSum / scoreCount).toFixed(3));
    }
  }

  dominantClassLabel =
    (dominantClass && CLASS_METADATA[dominantClass.toLowerCase()]?.name) ||
    dominantClass ||
    "NoData / Masked";

  // 5. Construct Standardized View Model
  return {
    jobId: payload.job_id || rawResponse.job_id || null,
    status: totalFeatures > 0 ? "success" : "empty",
    timestamp: payload.timestamp || rawResponse.timestamp || null,
    isMock,
    message: payload.message || null,
    metadata: {
      sceneId: rawMetadata.scene_id || rawMetadata.sceneId || null,
      tileId: rawMetadata.tile_id || rawMetadata.tileId || null,
      sensor: rawMetadata.sensor || rawMetadata.sensor_name || "Pending confirmation",
      acquisitionDate:
        rawMetadata.acquisition_date || rawMetadata.acquisitionDate || null,
      crs: rawMetadata.crs || "EPSG:4326",
      dimensions:
        rawMetadata.dimensions ||
        (rawMetadata.spatial_dimensions
          ? `${rawMetadata.spatial_dimensions.width}x${rawMetadata.spatial_dimensions.height}`
          : null),
      spatialResolutionM:
        typeof rawMetadata.spatial_resolution_m === "number"
          ? rawMetadata.spatial_resolution_m
          : typeof rawMetadata.spatialResolutionM === "number"
          ? rawMetadata.spatialResolutionM
          : null,
      modelName:
        rawMetadata.model_name || rawMetadata.modelName || "Standard Model",
      modelVersion:
        rawMetadata.model_version || rawMetadata.modelVersion || "Unspecified",
      checkpoint: rawMetadata.checkpoint || null,
      executionDevice:
        rawMetadata.execution_device || rawMetadata.device || null,
      isMock,
    },
    metrics: {
      dominantClass: dominantClass || "unclassified_nodata",
      dominantClassLabel,
      classDistribution,
      meanScore,
      scoreType,
      meanUncertainty,
      totalFeatures,
      alertCount,
    },
    features: adaptedFeatures,
    artifacts: {
      rasterDownloadUrl: data.artifacts?.raster_download_url || null,
      summaryUrl: data.artifacts?.summary_url || null,
    },
    hasSpatialData,
    raw: rawResponse,
  };
}

export default {
  adaptPredictionResponse,
  adaptFeature,
  createEmptyViewModel,
};
