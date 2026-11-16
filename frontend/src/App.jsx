
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, ScanLine, Sprout, History, Settings,
  Bell, Search, Leaf, Upload, ImagePlus, ArrowRight,
  Activity, Menu, X, ShieldCheck, Camera, Video
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Start the live camera preview
  useEffect(() => {
    const startVideo = async () => {
      if (
        (cameraOpen || videoRecorderOpen) &&
        videoRef.current &&
        streamRef.current
      ) {
        const video = videoRef.current;
        video.srcObject = streamRef.current;

        try {
          await video.play();
        } catch (error) {
          console.error("Video playback error:", error);
        }
      }
    };

    startVideo();
  }, [cameraOpen, videoRecorderOpen]);

  // Stop camera when component is removed
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Handle uploaded image
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

    if (selectedImage) URL.revokeObjectURL(selectedImage);
    if (selectedVideo) URL.revokeObjectURL(selectedVideo);

    setSelectedVideo(null);
    setSelectedVideoFile(null);

    const previewURL = URL.createObjectURL(file);

    setSelectedImage(previewURL);
    setSelectedFile(file);
    setActivePage("Overview");
    setMobileOpen(false);

    event.target.value = "";
  };

  // Handle uploaded video
  const handleVideo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file.");
      event.target.value = "";
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert("Video size must be less than 100 MB.");
      event.target.value = "";
      return;
    }

    if (selectedVideo) URL.revokeObjectURL(selectedVideo);
    if (selectedImage) URL.revokeObjectURL(selectedImage);

    setSelectedVideo(URL.createObjectURL(file));
    setSelectedVideoFile(file);
    setSelectedImage(null);
    setSelectedFile(null);
    setActivePage("Overview");
    setMobileOpen(false);

    event.target.value = "";
  };

  // Open camera for video recording
  const openVideoRecorder = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      alert(
        "Video recording is not supported in this browser. Try the latest Chrome or Edge."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setVideoRecorderOpen(true);
    } catch (error) {
      console.error("Video camera error:", error);
      alert(
        "Unable to open camera. Please allow camera permission and close other apps using the camera."
      );
    }
  };

  // Start or stop recording
  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const stream = streamRef.current;

    if (!stream) {
      alert("Camera is not ready. Please try again.");
      return;
    }

    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    try {
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "video/webm",
        });

        if (!blob.size) {
          alert("No video was recorded. Please try again.");
          return;
        }

        if (blob.size > 100 * 1024 * 1024) {
          alert("Recorded video is larger than 100 MB.");
          return;
        }

        const extension = blob.type.includes("mp4") ? "mp4" : "webm";

        const file = new File(
          [blob],
          `plant-video-${Date.now()}.${extension}`,
          { type: blob.type }
        );

        if (selectedVideo) URL.revokeObjectURL(selectedVideo);
        if (selectedImage) URL.revokeObjectURL(selectedImage);

        setSelectedVideo(URL.createObjectURL(file));
        setSelectedVideoFile(file);
        setSelectedImage(null);
        setSelectedFile(null);
        setActivePage("Overview");
        setMobileOpen(false);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setVideoRecorderOpen(false);
      };

      recorder.onerror = () => {
        alert("Recording failed. Please try again.");
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Could not start video recording in this browser.");
    }
  };

  // Close video recorder
  const closeVideoRecorder = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;

    setIsRecording(false);
    setVideoRecorderOpen(false);
  };

  // Remove selected video
  const removeVideo = () => {
    if (selectedVideo) {
      URL.revokeObjectURL(selectedVideo);
    }

    setSelectedVideo(null);
    setSelectedVideoFile(null);
  };

  // Open laptop or mobile camera
  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        "Camera is not supported. Please use localhost or a secure connection."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error:", error);

      if (error.name === "NotAllowedError") {
        alert(
          "Camera permission denied. Please allow camera access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        alert("No camera was found on this device.");
      } else if (error.name === "NotReadableError") {
        alert(
          "Your camera may already be in use by another application. Close it and try again."
        );
      } else {
        alert(
          "Unable to open camera. Please check your camera connection and permissions."
        );
      }
    }
  };

  // Close camera and stop webcam
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraOpen(false);
  };

  // Capture photo from webcam
  const capturePhoto = () => {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      alert("Camera is not ready. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      alert("Unable to capture photo. Please try again.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          alert("Unable to capture photo. Please try again.");
          return;
        }

        const file = new File(
          [blob],
          `plant-photo-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );

        if (file.size > 10 * 1024 * 1024) {
          alert("Captured image is larger than 10 MB.");
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

        closeCamera();
      },
      "image/jpeg",
      0.9
    );
  };

  // Remove selected image
  const removeImage = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    setSelectedImage(null);
    setSelectedFile(null);
  };

  // Overview page
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

      {selectedImage || selectedVideo ? (
        <section className="content-card uploaded-card">
          <div className="uploaded-heading">
            <div>
              <p className="eyebrow">CROP SCANNER</p>
              <h2>
                {selectedVideo
                  ? "Video Ready for Analysis"
                  : "Image Ready for Analysis"}
              </h2>
              <p>Your crop media is ready for analysis.</p>
            </div>

            <span className="development-tag">
              {selectedVideo ? "Video Ready" : "Image Ready"}
            </span>
          </div>

          <div className="preview-container">
            {selectedVideo ? (
              <video
                src={selectedVideo}
                controls
                className="overview-preview media-video-preview"
              />
            ) : (
              <img
                src={selectedImage}
                alt="Uploaded crop"
                className="overview-preview"
              />
            )}
          </div>

          <div className="file-information">
            <Upload size={20} />
            <div>
              <strong>
                {selectedVideoFile?.name || selectedFile?.name}
              </strong>
              <span>
                {(selectedVideoFile || selectedFile)
                  ? `${(
                      (selectedVideoFile || selectedFile).size /
                      (1024 * 1024)
                    ).toFixed(2)} MB`
                  : ""}
              </span>
            </div>
          </div>

          <div className="upload-actions">
            <button
              className="primary-button"
              onClick={() =>
                alert(
                  `${selectedVideo ? "Video" : "Image"} is ready! Disease analysis will be enabled after backend and ML integration.`
                )
              }
            >
              <Activity size={18} />
              Analyse Media
            </button>

            <button
              className="secondary-button"
              onClick={() => setActivePage("Crop Scanner")}
            >
              Change Media
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                removeImage();
                removeVideo();
              }}
            >
              Remove Media
            </button>
          </div>

          <p className="analysis-note">
            <ShieldCheck size={16} />
            Disease detection will be available after model integration.
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

  // Crop Scanner page
  const renderScanner = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">AGRICULTURE INTELLIGENCE PLATFORM</p>
          <h1>Crop Scanner</h1>
          <p className="subtitle">
            Upload or capture a clear image of your crop for analysis.
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
            <Upload size={18} />
            Browse Image
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImage}
              hidden
            />
          </label>

          <button
            className="secondary-button"
            onClick={openCamera}
          >
            <Camera size={18} />
            Take Photo
          </button>
        </div>

        <div className="video-upload-section">
          <div className="video-section-heading">
            <Video size={22} />
            <div>
              <h3>Video Input</h3>
              <p>Upload a crop video or record one using your camera.</p>
            </div>
          </div>

          <label className="secondary-button video-browse-button">
            <Upload size={18} />
            Upload Video
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={handleVideo}
              hidden
            />
          </label>

          <p className="video-format-note">
            MP4, WEBM or MOV · Maximum 100 MB
          </p>

          <button
            className="secondary-button"
            onClick={openVideoRecorder}
          >
            <Video size={18} />
            Record Video
          </button>
        </div>

        <span className="development-tag">
          <ShieldCheck size={15} />
          Ready for model integration
        </span>
      </section>
    </>
  );

  // Other pages
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

      {/* Live Camera Window */}
      {cameraOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-heading">
              <div>
                <p className="eyebrow">TERRASPECTRA CAMERA</p>
                <h2>Capture Plant Photo</h2>
                <p>Position your plant clearly inside the camera.</p>
              </div>

              <button
                className="icon-button"
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <X />
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview"
            />

            <div className="upload-actions camera-actions">
              <button
                className="primary-button"
                onClick={capturePhoto}
              >
                <Camera size={18} />
                Capture Photo
              </button>

              <button
                className="secondary-button"
                onClick={closeCamera}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Video Recording Window */}
      {videoRecorderOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-heading">
              <div>
                <p className="eyebrow">TERRASPECTRA VIDEO</p>
                <h2>Record Crop Video</h2>
                <p>Keep the plant in view while recording.</p>
              </div>

              <button
                className="icon-button"
                onClick={closeVideoRecorder}
                aria-label="Close video recorder"
              >
                <X />
              </button>
            </div>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview"
            />

            <div className="upload-actions camera-actions">
              <button
                className="primary-button"
                onClick={toggleRecording}
              >
                <Video size={18} />
                {isRecording ? "Stop & Save" : "Start Recording"}
              </button>

              <button
                className="secondary-button"
                onClick={closeVideoRecorder}
              >
                Cancel
              </button>
            </div>

            {isRecording && (
              <p className="recording-indicator">
                ● Recording in progress...
              </p>
            )}
          </div>
        </div>
      )}

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

export default App;
