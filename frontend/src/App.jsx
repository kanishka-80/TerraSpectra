
import { useState } from "react";
import {
  LayoutDashboard, ScanLine, Sprout, History, Settings,
  Bell, Search, Leaf, Upload, ImagePlus, ArrowRight,
  Activity, Menu, X, ShieldCheck
} from "lucide-react";
import "./App.css";

const navItems = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Crop Scanner", icon: ScanLine },
  { name: "Disease Analysis", icon: Sprout },
  { name: "Scan History", icon: History },
  { name: "Settings", icon: Settings },
];

function App() {
  const [activePage, setActivePage] = useState("Crop Scanner");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10 MB.");
      event.target.value = "";
      return;
    }

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    const previewURL = URL.createObjectURL(file);

    setSelectedImage(previewURL);
    setSelectedFile(file);
    setActivePage("Overview");
    setMobileOpen(false);

    event.target.value = "";
  };

  const removeImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const renderOverview = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WELCOME TO TERRASPECTRA</p>
          <h1>Dashboard Overview</h1>
          <p className="subtitle">
            Your smart crop health workspace.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card green-card">
          <div className="stat-icon"><Leaf /></div>
          <p>Total Scans</p>
          <h2>--</h2>
          <span>Awaiting scan records</span>
        </div>

        <div className="stat-card blue-card">
          <div className="stat-icon"><Activity /></div>
          <p>Healthy Crops</p>
          <h2>--</h2>
          <span>Awaiting model integration</span>
        </div>

        <div className="stat-card orange-card">
          <div className="stat-icon"><Sprout /></div>
          <p>Disease Detected</p>
          <h2>--</h2>
          <span>Awaiting model integration</span>
        </div>
      </div>

      {selectedImage ? (
        <section className="content-card uploaded-card">
          <div className="uploaded-heading">
            <div>
              <p className="eyebrow">CROP SCANNER</p>
              <h2>Image Ready for Analysis</h2>
              <p>Your crop image has been uploaded successfully.</p>
            </div>
            <span className="development-tag">Uploaded</span>
          </div>

          <div className="preview-container">
            <img
              src={selectedImage}
              alt="Uploaded crop"
              className="overview-preview"
            />
          </div>

          <div className="file-information">
            <FileImageIcon />
            <div>
              <strong>{selectedFile?.name}</strong>
              <span>
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                  : ""}
              </span>
            </div>
          </div>

          <div className="upload-actions">
            <button
              className="primary-button"
              onClick={() =>
                alert(
                  "Image upload is successful! Disease analysis will be enabled after backend and ML integration."
                )
              }
            >
              <Activity size={18} />
              Analyse Image
            </button>

            <button
              className="secondary-button"
              onClick={() => setActivePage("Crop Scanner")}
            >
              Change Image
            </button>

            <button
              className="secondary-button"
              onClick={removeImage}
            >
              Remove Image
            </button>
          </div>

          <p className="analysis-note">
            <ShieldCheck size={16} />
            Your image is ready. Disease detection will be available
            after model integration.
          </p>
        </section>
      ) : (
        <section className="content-card get-started-card">
          <div className="upload-icon"><Leaf size={35} /></div>
          <h2>Start Your Crop Analysis</h2>
          <p>
            Upload a rice leaf image to begin your crop health analysis.
          </p>
          <button
            className="primary-button"
            onClick={() => setActivePage("Crop Scanner")}
          >
            Open Crop Scanner <ArrowRight size={17} />
          </button>
        </section>
      )}
    </>
  );

  const renderScanner = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">AGRICULTURE INTELLIGENCE PLATFORM</p>
          <h1>Crop Scanner</h1>
          <p className="subtitle">
            Upload a clear image of your crop for analysis.
          </p>
        </div>

        <span className="workspace-badge">
          <span className="status-dot" /> Workspace
        </span>
      </div>

      <section className="upload-card">
        <div className="upload-icon">
          <Upload size={38} />
        </div>

        <h2>Upload Crop Image</h2>
        <p className="upload-description">
          Select a clear image of a crop leaf to get started.
        </p>

        <label className="drop-area">
          <ImagePlus size={34} />
          <strong>Choose an image</strong>
          <span>JPG, JPEG or PNG · Maximum 10 MB</span>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleImage}
            hidden
          />
        </label>

        <div className="upload-actions">
          <label className="primary-button">
            Browse Image
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImage}
              hidden
            />
          </label>
        </div>

        <span className="development-tag">
          <ShieldCheck size={15} />
          Ready for model integration
        </span>
      </section>
    </>
  );

  const pageDetails = {
    "Disease Analysis": {
      icon: Sprout,
      description:
        "Disease names, confidence scores, symptoms and treatment recommendations will appear here after model integration."
    },
    "Scan History": {
      icon: History,
      description:
        "Your previous crop scans and their analysis results will be displayed here."
    },
    "Settings": {
      icon: Settings,
      description:
        "Manage your profile and application preferences here."
    }
  };

  const renderOtherPage = () => {
    const details = pageDetails[activePage];
    const PageIcon = details.icon;

    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">TERRASPECTRA WORKSPACE</p>
            <h1>{activePage}</h1>
            <p className="subtitle">{details.description}</p>
          </div>
        </div>

        <section className="content-card empty-state">
          <div className="upload-icon">
            <PageIcon size={36} />
          </div>
          <h2>{activePage}</h2>
          <p>{details.description}</p>
          <span className="development-tag">
            Frontend page under development
          </span>
          <button
            className="primary-button"
            onClick={() => setActivePage("Overview")}
          >
            Back to Overview
          </button>
        </section>
      </>
    );
  };

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Leaf size={34} /></div>
          <div>
            <h2>Terra<span>Spectra</span></h2>
            <p>Smart Crop Health Platform</p>
          </div>
          <button
            className="close-menu"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X />
          </button>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav">
          {navItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => {
                setActivePage(name);
                setMobileOpen(false);
              }}
            >
              <Icon size={25} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="footer-icon"><Sprout size={27} /></div>
          <div>
            <strong>Crop Health Workspace</strong>
            <p>Welcome to TerraSpectra</p>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <button className="search-button">
              <Search size={21} />
              <span>Search</span>
            </button>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={24} />
            </button>
            <div className="profile-avatar">R</div>
          </div>
        </header>

        <div className="page-content">
          {activePage === "Overview"
            ? renderOverview()
            : activePage === "Crop Scanner"
              ? renderScanner()
              : renderOtherPage()}
        </div>
      </main>
    </div>
  );
}

function FileImageIcon() {
  return <Upload size={20} />;
}

export default App;
