import {
  Camera,
  ImagePlus,
  Video,
  Trash2,
  Eye,
  ShieldCheck,
  History,
} from "lucide-react";

const mockHistory = [
  {
    id: 1,
    plot: "Paddy Plot A · North Corner",
    type: "photo",
    label: "Live Photo Scan",
    result: "Healthy Leaf",
    status: "healthy",
    date: "19 Nov 2026",
  },
  {
    id: 2,
    plot: "Paddy Plot B · Main Canopy",
    type: "image",
    label: "4 Images Uploaded",
    result: "Rice Blast Detected",
    status: "disease",
    date: "15 Nov 2026",
  },
  {
    id: 3,
    plot: "Paddy Plot C · Field Perimeter",
    type: "video",
    label: "Video Recording · 720p",
    result: "Under Review",
    status: "pending",
    date: "12 Nov 2026",
  },
  {
    id: 4,
    plot: "Paddy Plot D · South Row",
    type: "image",
    label: "2 Images Uploaded",
    result: "Bacterial Blight Detected",
    status: "disease",
    date: "08 Nov 2026",
  },
  {
    id: 5,
    plot: "Paddy Plot A · South Corner",
    type: "photo",
    label: "Live Photo Scan",
    result: "Healthy Leaf",
    status: "healthy",
    date: "03 Nov 2026",
  },
];

const typeIcons = { photo: Camera, image: ImagePlus, video: Video };

const statusClass = {
  healthy: "sh-status-green",
  disease: "sh-status-red",
  pending: "sh-status-orange",
};

const totalScans   = mockHistory.length;
const healthyCount = mockHistory.filter((h) => h.status === "healthy").length;
const diseaseCount = mockHistory.filter((h) => h.status === "disease").length;

function ScanHistory() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TERRASPECTRA WORKSPACE</p>
          <h1>Scan History</h1>
          <p className="subtitle">
            View all previous crop inspections and their analysis results.
          </p>
        </div>

        <span className="workspace-badge">
          <span className="status-dot" /> {totalScans} Scans
        </span>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <div className="stat-card green-card">
          <div className="stat-icon">
            <Camera size={22} />
          </div>
          <p>Total Scans</p>
          <h2>{totalScans}</h2>
          <span>All time</span>
        </div>

        <div className="stat-card blue-card">
          <div className="stat-icon">
            <ShieldCheck size={22} />
          </div>
          <p>Healthy Results</p>
          <h2>{healthyCount}</h2>
          <span>No disease found</span>
        </div>

        <div className="stat-card orange-card">
          <div className="stat-icon">
            <History size={22} />
          </div>
          <p>Disease Detected</p>
          <h2>{diseaseCount}</h2>
          <span>Requires attention</span>
        </div>
      </div>

      {/* History Table */}
      <section className="sh-table-card">
        <div className="sh-table-header">
          <h2>Crop Inspection Log</h2>
          <p>Complete history of all plant scans and analysis outcomes</p>
        </div>

        <div className="sh-table-body">
          {mockHistory.map((item) => {
            const TypeIcon = typeIcons[item.type];

            return (
              <div className="sh-row" key={item.id}>
                {/* Type Icon */}
                <div className="sh-type-icon">
                  <TypeIcon size={18} />
                </div>

                {/* Plot & Label */}
                <div className="sh-main-col">
                  <strong>{item.plot}</strong>
                  <span>{item.label}</span>
                </div>

                {/* Status Badge */}
                <div className="sh-result-col">
                  <span className={`sh-status-badge ${statusClass[item.status]}`}>
                    {item.result}
                  </span>
                </div>

                {/* Date */}
                <div className="sh-date-col">{item.date}</div>

                {/* Actions */}
                <div className="sh-actions-col">
                  <button
                    className="sh-action-btn"
                    aria-label={`View scan ${item.id}`}
                    title="View details"
                    onClick={() =>
                      alert(
                        `Scan detail view will be available after backend integration.\nPlot: ${item.plot}\nResult: ${item.result}`
                      )
                    }
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    className="sh-action-btn sh-delete-btn"
                    aria-label={`Delete scan ${item.id}`}
                    title="Delete"
                    onClick={() =>
                      alert("Delete functionality will be enabled after backend integration.")
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sh-footer">
          <ShieldCheck size={14} />
          <span>
            Scan records are mock data. Live history will sync after backend
            integration.
          </span>
        </div>
      </section>
    </>
  );
}

export default ScanHistory;
