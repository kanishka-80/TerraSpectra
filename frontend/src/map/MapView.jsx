
import { useMemo, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import Map, { NavigationControl } from "react-map-gl/maplibre";

import "maplibre-gl/dist/maplibre-gl.css";

import { SAMPLE_FEATURES } from "./layers/predictionLayer.js";

import {
  colorForClass,
  CLASS_LABELS,
} from "./layers/layerFactory.js";

import MapLegend from "../components/MapLegend.jsx";

const INITIAL_VIEW_STATE = {
  longitude: 80.205,
  latitude: 13.085,
  zoom: 13,
  pitch: 0,
  bearing: 0,
};

export default function MapView({
  features = SAMPLE_FEATURES,
  isDemo = true,
}) {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const safeFeatures = Array.isArray(features) ? features : [];

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: safeFeatures,
    }),
    [safeFeatures]
  );

  const handleClick = useCallback((info) => {
    if (info?.object) {
      setSelectedFeature(info.object);
    } else {
      setSelectedFeature(null);
    }
  }, []);

  const layers = useMemo(() => {
    if (safeFeatures.length === 0) {
      return [];
    }

    return [
      new GeoJsonLayer({
        id: "prediction-overlay",
        data: geojson,
        pickable: true,
        stroked: true,
        filled: true,

        lineWidthMinPixels: 1,

        getFillColor: (feature) =>
          colorForClass(feature?.properties?.class),

        getLineColor: [24, 59, 42, 220],
        getLineWidth: 2,

        getPointRadius: 80,
        pointRadiusMinPixels: 6,
        pointType: "circle",

        onClick: handleClick,
      }),
    ];
  }, [geojson, safeFeatures.length, handleClick]);

  const properties = selectedFeature?.properties || {};

  return (
    <div className="terra-map-container">

      {isDemo && (
        <div className="terra-map-demo-banner">
          DEMO MAP — Sample geometry and placeholder categories.
          Not real farm locations or disease predictions.
        </div>
      )}

      <div className="terra-map-canvas">
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          onClick={handleClick}
        >
          <Map
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
            reuseMaps
          >
            <NavigationControl position="top-right" />
          </Map>
        </DeckGL>
      </div>

      <div className="terra-map-sidebar">

        <MapLegend isDemo={isDemo} />

        <div className="terra-map-details">
          <h3>Feature Details</h3>

          {selectedFeature ? (
            <>
              <p>
                <strong>Label:</strong>{" "}
                {properties.label || "Unnamed feature"}
              </p>

              <p>
                <strong>Class:</strong>{" "}
                {CLASS_LABELS[
                  String(properties.class || "demo").toLowerCase()
                ] || "Unrecognized class"}
              </p>

              <p>
                <strong>Feature ID:</strong>{" "}
                {selectedFeature.id || "Not available"}
              </p>

              <p className="terra-map-note">
                {isDemo
                  ? "This is a sample feature, not a real prediction."
                  : "Verify this feature against the backend response."}
              </p>
            </>
          ) : (
            <p>Select a map feature to see its details.</p>
          )}
        </div>

      </div>
    </div>
  );
}
