import {
  Activity,
  ShieldCheck,
  Sprout,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Leaf,
} from "lucide-react";

const mockDiseases = [
  {
    id: 1,
    name: "Rice Blast",
    scientific: "Magnaporthe oryzae",
    confidence: 94.2,
    severity: "High",
    severityColor: "red",
    symptoms: [
      "Diamond-shaped lesions on leaves",
      "Gray-white center with brown border",
      "Leaf tip dieback and collar rot",
    ],
    treatments: [
      "Apply Tricyclazole or Isoprothiolane fungicide",
      "Reduce excessive nitrogen fertilization",
      "Improve field drainage and airflow",
    ],
    affected: "Leaf, Neck, Panicle",
  },
  {
    id: 2,
    name: "Bacterial Leaf Blight",
    scientific: "Xanthomonas oryzae pv. oryzae",
    confidence: 67.8,
    severity: "Moderate",
    severityColor: "orange",
    symptoms: [
      "Water-soaked lesions at leaf margins",
      "Yellow to white discoloration and wilting",
      "Milky or opaque ooze on leaf surface",
    ],
    treatments: [
      "Use copper-based bactericides",
      "Avoid excessive flood irrigation",
      "Remove and burn infected plant debris",
    ],
    affected: "Leaf Blade, Vascular System",
  },
];

function DiseaseAnalysis({ selectedMedia, selectedImages, mediaType, onNavigate }) {
  const hasMedia = !!selectedMedia;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERRASPECTRA WORKSPACE</p>
          <h1>Disease Analysis</h1>
          <p className="subtitle">
            {hasMedia
              ? "AI-powered disease detection results for your uploaded crop sample."
              : "Upload or scan a plant first to begin disease analysis."}
          </p>
        </div>

        {hasMedia && (
          <span className="development-tag">
            <ShieldCheck size={15} /> Demo Results
          </span>
        )}
      </div>

      {!hasMedia ? (
        // Empty State
        <section className="content-card empty-state">
          <div className="upload-icon">
            <Sprout size={36} />
          </div>

          <h2>No Sample Selected</h2>

          <p>
            Go to the Crop Scanner to upload plant images or record a video
            first. Disease analysis results will appear here once a sample is
            loaded.
          </p>

          <button
            className="primary-button"
            onClick={() => onNavigate("Crop Scanner")}
          >
            Open Crop Scanner <ArrowRight size={17} />
          </button>
        </section>
      ) : (
        // Analysis Results
        <div className="da-layout">
          {/* Sample Summary Bar */}
          <section className="da-summary-card">
            <div className="da-summary-info">
              <div className="da-summary-icon">
                <Activity size={22} />
              </div>

              <div>
                <strong>
                  {mediaType === "video"
                    ? "Video Sample Loaded"
                    : `${selectedImages.length} Image${selectedImages.length === 1 ? "" : "s"} Loaded`}
                </strong>
                <p>Prototype results shown — ML model integration pending</p>
              </div>
            </div>

            <span className="badge-pending">
              Backend &amp; ML Integration Pending
            </span>
          </section>

          {/* Disease Cards */}
          <div className="da-results-stack">
            {mockDiseases.map((disease, idx) => (
              <div
                className={`da-disease-card ${idx === 0 ? "da-primary" : "da-secondary"}`}
                key={disease.id}
              >
                {/* Card Header */}
                <div className="da-card-header">
                  <div>
                    <span className={`da-severity-badge severity-${disease.severityColor}`}>
                      {disease.severity} Severity
                    </span>
                    <h3>{disease.name}</h3>
                    <p className="da-scientific">{disease.scientific}</p>
                  </div>

                  <div className="da-confidence-box">
                    <span className="da-confidence-value">{disease.confidence}%</span>
                    <span className="da-confidence-label">confidence</span>
                  </div>
                </div>

                {/* Confidence Meter */}
                <div className="da-meter-row">
                  <span>Model Confidence</span>
                  <div className="prediction-meter-bar">
                    <span
                      className="meter-fill"
                      style={{ width: `${disease.confidence}%` }}
                    />
                  </div>
                  <strong>{disease.confidence}%</strong>
                </div>

                {/* Two Columns: Symptoms + Treatments */}
                <div className="da-two-col">
                  <div>
                    <h4>Observed Symptoms</h4>
                    <ul className="da-list">
                      {disease.symptoms.map((symptom, i) => (
                        <li key={i}>
                          <CheckCircle2 size={14} className="da-check-icon" />
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4>Recommended Treatments</h4>
                    <ul className="da-list da-treatment-list">
                      {disease.treatments.map((treatment, i) => (
                        <li key={i}>
                          <AlertTriangle size={14} className="da-warn-icon" />
                          {treatment}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="da-card-footer">
                  <Leaf size={14} />
                  <span>Affected parts: {disease.affected}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="analysis-note">
            <ShieldCheck size={16} />
            These are prototype mock results. Actual AI detection will be
            enabled after ML model and backend API integration by the team.
          </p>
        </div>
      )}
    </>
  );
}

export default DiseaseAnalysis;
