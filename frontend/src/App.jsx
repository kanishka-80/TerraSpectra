
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, ScanLine, Sprout, History, Settings,
  Bell, Search, Leaf, Upload, ImagePlus, ArrowRight,
  Activity, Menu, X, ShieldCheck, Camera, Video, Square,
  Info, Sparkles, CheckCircle2, ChevronDown, ChevronRight,
  Play, Eye
} from "lucide-react";
import "./App.css";
import DiseaseAnalysis from "./pages/DiseaseAnalysis.jsx";
import ScanHistory from "./pages/ScanHistory.jsx";
import SettingsPage from "./pages/Settings.jsx";

const navItems = [
  { name: "About", icon: Info },
  { name: "Overview", icon: LayoutDashboard },
  { name: "Crop Scanner", icon: ScanLine },
  { name: "Disease Analysis", icon: Sprout },
  { name: "Scan History", icon: History },
  { name: "Settings", icon: Settings },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

function App() {
  const [activePage, setActivePage] = useState("About");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [videoQuality, setVideoQuality] = useState(null);
  const [enhancingVideo, setEnhancingVideo] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo");
  const [recording, setRecording] = useState(false);

  const cameraVideoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const discardRecordingRef = useRef(false);

  // Attach the live camera stream to the preview.
  useEffect(() => {
    const startVideo = async () => {
      if (cameraOpen && cameraVideoRef.current && streamRef.current) {
        cameraVideoRef.current.srcObject = streamRef.current;

        try {
          await cameraVideoRef.current.play();
        } catch (error) {
          console.error("Camera preview error:", error);
        }
      }
    };

    startVideo();
  }, [cameraOpen]);

  // Stop camera when the component unmounts.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Add one or more images, or select a video.
  const setMedia = (file, type, navigateToOverview = false) => {
    const previewURL = URL.createObjectURL(file);

    if (type === "image") {
      if (mediaType === "video" && selectedMedia) {
        URL.revokeObjectURL(selectedMedia);
        setSelectedImages([]);
      }

      setSelectedImages((current) => [
        ...current,
        {
          id: `${Date.now()}-${Math.random()}`,
          file,
          url: previewURL,
        },
      ]);

      setSelectedMedia(previewURL);
      setSelectedFile(file);
      setMediaType("image");
    } else {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.url));

      if (selectedMedia) {
        URL.revokeObjectURL(selectedMedia);
      }

      setSelectedImages([]);
      setSelectedMedia(previewURL);
      setSelectedFile(file);
      setMediaType("video");
      setVideoQuality(null);
    }

    if (navigateToOverview && activePage !== "About") {
      setActivePage("Overview");
      setMobileOpen(false);
    }
  };

  // Handle multiple image uploads.
  const handleImage = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    const validFiles = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not a valid image.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        alert(`${file.name} is larger than 10 MB and was skipped.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length) {
      if (mediaType === "video" && selectedMedia) {
        URL.revokeObjectURL(selectedMedia);
      }

      const newImages = validFiles.map((file) => ({
        id: `${Date.now()}-${Math.random()}-${file.name}`,
        file,
        url: URL.createObjectURL(file),
      }));

      setSelectedImages((current) => [...current, ...newImages]);
      setSelectedMedia(newImages[0].url);
      setSelectedFile(newImages[0].file);
      setMediaType("image");

      if (activePage !== "About") {
        setActivePage("Overview");
        setMobileOpen(false);
      } else {
        setTimeout(() => {
          const section = document.getElementById("section-upload");
          if (section) {
            section.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      }
    }

    event.target.value = "";
  };

  // Remove one image from the selected batch.
  const removeImage = (imageId) => {
    const imageToRemove = selectedImages.find(
      (image) => image.id === imageId
    );

    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    const remaining = selectedImages.filter(
      (image) => image.id !== imageId
    );

    setSelectedImages(remaining);

    if (remaining.length) {
      setSelectedMedia(remaining[0].url);
      setSelectedFile(remaining[0].file);
      setMediaType("image");
    } else {
      setSelectedMedia(null);
      setSelectedFile(null);
      setMediaType(null);
    }
  };

  // Handle video upload.
  const handleVideo = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      alert("Video size must be less than 100 MB.");
      event.target.value = "";
      return;
    }

    setMedia(file, "video");
    inspectVideoQuality(file);

    if (activePage === "About") {
      setTimeout(() => {
        const section = document.getElementById("section-upload");
        if (section) {
          section.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }

    event.target.value = "";
  };

  // Read video dimensions and detect low resolution.
  const inspectVideoQuality = (file) => {
    const probe = document.createElement("video");
    const url = URL.createObjectURL(file);

    probe.preload = "metadata";

    probe.onloadedmetadata = () => {
      const width = probe.videoWidth;
      const height = probe.videoHeight;

      setVideoQuality({
        width,
        height,
        lowQuality: width < 720 || height < 480,
      });

      URL.revokeObjectURL(url);
    };

    probe.onerror = () => {
      setVideoQuality({
        width: 0,
        height: 0,
        lowQuality: null,
      });

      URL.revokeObjectURL(url);
    };

    probe.src = url;
  };

  // Upscale a low-resolution video to at least 720p.
  // This increases output dimensions but cannot restore missing details.
  const enhanceVideo = async () => {
    if (!selectedFile || mediaType !== "video" || enhancingVideo) return;

    if (
      !window.MediaRecorder ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      alert(
        "Video upscaling is not supported in this browser. Please use the latest Chrome or Edge."
      );
      return;
    }

    setEnhancingVideo(true);

    const sourceUrl = URL.createObjectURL(selectedFile);
    const video = document.createElement("video");

    video.src = sourceUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    let canvasStream = null;
    let animationId = null;

    try {
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () =>
          reject(new Error("Could not read this video file."));
      });

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;

      if (!sourceWidth || !sourceHeight) {
        throw new Error("Video dimensions could not be detected.");
      }

      if (video.duration > 120) {
        throw new Error(
          "Please use a video shorter than 2 minutes for browser-based upscaling."
        );
      }

      const scale = Math.max(
        1,
        1280 / sourceWidth,
        720 / sourceHeight
      );

      const outputWidth = Math.round(sourceWidth * scale);
      const outputHeight = Math.round(sourceHeight * scale);

      const canvas = document.createElement("canvas");

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not prepare the video processor.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      canvasStream = canvas.captureStream(30);

      const mimeOptions = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];

      const outputMime = mimeOptions.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = outputMime
        ? new MediaRecorder(canvasStream, { mimeType: outputMime })
        : new MediaRecorder(canvasStream);

      const chunks = [];

      const recordingFinished = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = () => {
          reject(new Error("Video conversion failed."));
        };

        recorder.onstop = resolve;
      });

      const drawFrame = () => {
        if (video.ended || video.paused) return;

        context.drawImage(
          video,
          0,
          0,
          outputWidth,
          outputHeight
        );

        animationId = requestAnimationFrame(drawFrame);
      };

      video.currentTime = 0;

      await video.play();

      context.drawImage(
        video,
        0,
        0,
        outputWidth,
        outputHeight
      );

      recorder.start(250);
      drawFrame();

      await new Promise((resolve) => {
        video.onended = resolve;
      });

      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      recorder.stop();

      await recordingFinished;

      const outputBlob = new Blob(chunks, {
        type: recorder.mimeType || "video/webm",
      });

      if (!outputBlob.size) {
        throw new Error("The converted video is empty.");
      }

      if (outputBlob.size > MAX_VIDEO_SIZE) {
        throw new Error(
          "The enhanced video is larger than 100 MB. Try a shorter video."
        );
      }

      const enhancedFile = new File(
        [outputBlob],
        `terraspectra-upscaled-${Date.now()}.webm`,
        { type: outputBlob.type }
      );

      setMedia(enhancedFile, "video");
      inspectVideoQuality(enhancedFile);

      alert(
        `Video upscaled to ${outputWidth} × ${outputHeight}. The new WebM copy is silent. Upscaling does not restore details lost in the original video.`
      );
    } catch (error) {
      console.error("Video upscaling error:", error);

      alert(
        error.message ||
          "Unable to upscale this video. Please try another file."
      );
    } finally {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      canvasStream?.getTracks().forEach((track) => track.stop());

      video.pause();
      video.removeAttribute("src");
      video.load();

      URL.revokeObjectURL(sourceUrl);
      setEnhancingVideo(false);
    }
  };

  // Open the webcam for taking a photo or recording a video.
  const openCamera = async (mode = "photo") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert(
        "Camera is not supported. Please use localhost or a secure connection."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: mode === "record",
      });

      streamRef.current = stream;

      setCameraMode(mode);
      setRecording(false);
      discardRecordingRef.current = false;
      setCameraOpen(true);
    } catch (error) {
      console.error("Camera error:", error);

      if (error.name === "NotAllowedError") {
        alert(
          "Camera or microphone permission denied. Please allow access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        alert("No camera or microphone was found on this device.");
      } else if (error.name === "NotReadableError") {
        alert(
          "Your camera may already be in use. Close other camera applications and try again."
        );
      } else {
        alert(
          "Unable to open the camera. Please check device permissions and try again."
        );
      }
    }
  };

  // Stop the camera stream.
  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Close camera after scanning.
  const closeCamera = () => {
    discardRecordingRef.current = true;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    stopCameraStream();

    setRecording(false);
    setCameraOpen(false);

    if (activePage !== "About" && cameraMode === "photo" && selectedImages.length > 0) {
      setActivePage("Overview");
    }
  };

  // Capture a still photo from the webcam.
  const capturePhoto = () => {
    const videoElement = cameraVideoRef.current;

    if (!videoElement || !videoElement.videoWidth) {
      alert("Camera is not ready. Please try again.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      alert("Unable to capture photo. Please try again.");
      return;
    }

    context.drawImage(
      videoElement,
      0,
      0,
      canvas.width,
      canvas.height
    );

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

        if (file.size > MAX_IMAGE_SIZE) {
          alert("Captured image is larger than 10 MB.");
          return;
        }

        // Keep the camera open so the user can capture more photos.
        setMedia(file, "image", false);
      },
      "image/jpeg",
      0.9
    );
  };

  // Start recording from the webcam.
  const startRecording = () => {
    const stream = streamRef.current;

    if (!stream) {
      alert("Camera is not ready. Please reopen the camera.");
      return;
    }

    if (!window.MediaRecorder) {
      alert(
        "Video recording is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    const supportedTypes = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];

    const mimeType = supportedTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    );

    try {
      recordedChunksRef.current = [];
      discardRecordingRef.current = false;

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error("Recording error:", event.error);
        alert("Video recording failed. Please try again.");
        setRecording(false);
      };

      recorder.onstop = () => {
        if (discardRecordingRef.current) return;

        const finalType = recorder.mimeType || "video/webm";

        const videoBlob = new Blob(recordedChunksRef.current, {
          type: finalType,
        });

        if (!videoBlob.size) {
          alert("No video was recorded. Please try again.");
          return;
        }

        if (videoBlob.size > MAX_VIDEO_SIZE) {
          alert(
            "Recorded video is larger than 100 MB. Please record a shorter video."
          );
          return;
        }

        const extension = finalType.includes("mp4") ? "mp4" : "webm";

        const file = new File(
          [videoBlob],
          `plant-video-${Date.now()}.${extension}`,
          { type: finalType }
        );

        stopCameraStream();
        setCameraOpen(false);
        setRecording(false);

        setMedia(file, "video");
        inspectVideoQuality(file);
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Unable to start recording:", error);
      alert("Unable to start video recording. Please try again.");
    }
  };

  // Stop and save the current recording.
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Remove all selected media.
  const removeMedia = () => {
    selectedImages.forEach((image) => {
      URL.revokeObjectURL(image.url);
    });

    if (selectedMedia && mediaType === "video") {
      URL.revokeObjectURL(selectedMedia);
    }

    setSelectedImages([]);
    setSelectedMedia(null);
    setSelectedFile(null);
    setMediaType(null);
    setVideoQuality(null);
    setEnhancingVideo(false);
  };

  // Overview page.
  const renderOverview = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WELCOME TO TERRASPECTRA</p>
          <h1>Dashboard Overview</h1>
          <p className="subtitle">Your smart crop health workspace.</p>
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

      {selectedMedia ? (
        <section className="content-card uploaded-card">
          <div className="uploaded-heading">
            <div>
              <p className="eyebrow">CROP SCANNER</p>

              <h2>
                {mediaType === "video"
                  ? "Video Ready for Analysis"
                  : `${selectedImages.length} Plant Image${
                      selectedImages.length === 1 ? "" : "s"
                    } Ready`}
              </h2>

              <p>
                {mediaType === "video"
                  ? "Your video is ready for the next step."
                  : "Review your plant images before analysis."}
              </p>
            </div>

            <span className="development-tag">
              {mediaType === "video" ? "Video Ready" : "Image Ready"}
            </span>
          </div>

          <div className="preview-container">
            {mediaType === "video" ? (
              <video
                src={selectedMedia}
                controls
                playsInline
                className="overview-preview media-video-preview"
              />
            ) : (
              <div className="plant-image-gallery">
                {selectedImages.map((image, index) => (
                  <div className="plant-image-item" key={image.id}>
                    <img
                      src={image.url}
                      alt={`Plant sample ${index + 1}`}
                    />

                    <span>Image {index + 1}</span>

                    <button
                      type="button"
                      className="remove-image-button"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="file-information">
            {mediaType === "video" ? (
              <Video size={20} />
            ) : (
              <Upload size={20} />
            )}

            <div>
              <strong>
                {mediaType === "video"
                  ? selectedFile?.name
                  : `${selectedImages.length} image(s) selected`}
              </strong>

              <span>
                {mediaType === "video"
                  ? `${(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB`
                  : `${(
                      selectedImages.reduce(
                        (total, image) => total + image.file.size,
                        0
                      ) /
                      (1024 * 1024)
                    ).toFixed(2)} MB total`}
              </span>
            </div>
          </div>

          {mediaType === "video" && videoQuality && (
            <div
              className={`video-quality-notice ${
                videoQuality.lowQuality
                  ? "quality-warning"
                  : "quality-good"
              }`}
            >
              <strong>
                {videoQuality.width} × {videoQuality.height} video
                {videoQuality.lowQuality
                  ? " — Low resolution detected"
                  : " — Resolution looks suitable"}
              </strong>

              <p>
                {videoQuality.lowQuality
                  ? "This video has low resolution. You can upscale its dimensions to at least 720p. This browser conversion creates a silent video and cannot recover details missing from the original."
                  : "Keep the plant in focus and use good lighting for the best analysis."}
              </p>

              {videoQuality.lowQuality && (
                <button
                  className="secondary-button"
                  onClick={enhanceVideo}
                  disabled={enhancingVideo}
                  type="button"
                >
                  {enhancingVideo
                    ? "Upscaling video..."
                    : "Upscale Video to 720p"}
                </button>
              )}
            </div>
          )}

          <div className="upload-actions">
            <button
              className="primary-button"
              onClick={() =>
                alert(
                  `${
                    mediaType === "video"
                      ? "Video"
                      : `${selectedImages.length} image(s)`
                  } selected successfully! Disease analysis will be enabled after backend and ML integration.`
                )
              }
            >
              <Activity size={18} />
              Analyse {mediaType === "video" ? "Video" : "Images"}
            </button>

            <button
              className="secondary-button"
              onClick={() => setActivePage("Crop Scanner")}
            >
              Add / Change Media
            </button>

            <button
              className="secondary-button"
              onClick={removeMedia}
            >
              Remove All
            </button>
          </div>

          <p className="analysis-note">
            <ShieldCheck size={16} />
            Disease detection will be available after backend and model integration.
          </p>
        </section>
      ) : (
        <section className="content-card get-started-card">
          <div className="upload-icon"><Leaf size={35} /></div>

          <h2>Start Your Crop Analysis</h2>

          <p>
            Upload plant images or video, or scan your plant directly using the camera.
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

  // Crop Scanner page.
  const renderScanner = () => (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">AGRICULTURE INTELLIGENCE PLATFORM</p>
          <h1>Crop Scanner</h1>

          <p className="subtitle">
            Scan a plant with your camera, or upload multiple plant images and a video.
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

        <h2>Upload Crop Media</h2>

        <p className="upload-description">
          Add several clear plant images, record a video, or scan the plant directly with your camera.
        </p>

        <div className="media-upload-options">
          <label className="drop-area">
            <ImagePlus size={34} />

            <strong>Choose plant images</strong>

            <span>
              JPG, JPEG or PNG · Up to 10 MB each · Select multiple images
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleImage}
              hidden
            />
          </label>

          <label className="drop-area">
            <Video size={34} />

            <strong>Choose a video</strong>

            <span>MP4, MOV or WebM · Maximum 100 MB</span>

            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              onChange={handleVideo}
              hidden
            />
          </label>
        </div>

        {/* Duplicate Browse Image and Browse Video buttons removed. */}

        <div className="upload-actions camera-options">
          <button
            className="primary-button"
            onClick={() => openCamera("photo")}
          >
            <ScanLine size={18} />
            Scan Plant Live
          </button>

          <button
            className="secondary-button"
            onClick={() => openCamera("record")}
          >
            <Video size={18} />
            Record Video
          </button>
        </div>

        <p className="scanner-help-text">
          Capture different plant angles in one camera session. Close the camera when you have finished, then review your photos.
        </p>

        <span className="development-tag">
          <ShieldCheck size={15} />
          Ready for backend and model integration
        </span>
      </section>
    </>
  );

  // Scroll helper to smoothly scroll to any feature section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // About page (Full-screen agricultural hero inspired by FARMLAND INDIA with exact 1st About, 2nd Upload Data, 3rd Remaining order)
  const renderAbout = () => (
    <div className="about-container">
      {/* Floating Side Dot Navigation */}
      <nav className="about-side-nav" aria-label="Feature navigation">
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("about-hero")}
          title="Top: Hero Banner"
        >
          <span className="dot-label">Top: Hero</span>
        </button>
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("section-about")}
          title="01: About TerraSpectra"
        >
          <span className="dot-label">01. About</span>
        </button>
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("section-upload")}
          title="02: Upload Data (Scanner)"
        >
          <span className="dot-label">02. Upload Data</span>
        </button>
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("section-ai")}
          title="03: AI Disease Detection"
        >
          <span className="dot-label">03. AI Detection</span>
        </button>
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("section-insights")}
          title="04: Plant Health Insights"
        >
          <span className="dot-label">04. Health Insights</span>
        </button>
        <button
          type="button"
          className="side-nav-dot"
          onClick={() => scrollToSection("section-history")}
          title="05: Scan History"
        >
          <span className="dot-label">05. Scan History</span>
        </button>
      </nav>

      {/* TOP PART: FARMLAND INDIA-INSPIRED HERO & HEADER */}
      <section className="about-hero about-snap-section" id="about-hero">
        <div className="about-hero-overlay" />

        {/* Farmland India Style Top Navigation Bar */}
        <header className="about-topbar">
          <div className="about-brand">
            <div className="about-brand-logo">
              <Leaf size={22} />
            </div>
            <span className="about-brand-name">
              TERRASPECTRA <span className="about-brand-tag">RICE AI</span>
            </span>
          </div>

          <nav className="about-top-links">
            <button type="button" onClick={() => scrollToSection("section-about")}>
              About
            </button>
            <button type="button" onClick={() => scrollToSection("section-upload")}>
              Upload Data
            </button>
            <button type="button" onClick={() => scrollToSection("section-ai")}>
              AI Detection
            </button>
            <button type="button" onClick={() => scrollToSection("section-insights")}>
              Health Advisory
            </button>
            <button type="button" onClick={() => scrollToSection("section-history")}>
              History
            </button>
          </nav>

          <div className="about-topbar-actions">
            <button
              type="button"
              className="about-primary-btn"
              onClick={() => openCamera("photo")}
            >
              Scan Plant Live
            </button>
          </div>
        </header>

        {/* Hero Content Area */}
        <div className="about-hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>INDIA'S AI-POWERED RICE CROP MONITORING</span>
          </div>

          <h1 className="hero-title">
            Smarter <span className="hero-highlight">Crop Monitoring</span> with AI
          </h1>

          <p className="hero-description">
            Discover a smarter way to monitor your crops. Upload rice plant images, scan leaves,
            or record videos to check plant health using AI-powered technology.
          </p>

          {/* Interactive Search / Action Bar (Farmland India Style) */}
          <div className="hero-action-box">
            <div className="hero-tabs">
              <button
                type="button"
                className="hero-tab active"
                onClick={() => scrollToSection("section-about")}
              >
                1. ABOUT TERRASPECTRA
              </button>
              <button
                type="button"
                className="hero-tab"
                onClick={() => scrollToSection("section-upload")}
              >
                2. UPLOAD DATA
              </button>
              <button
                type="button"
                className="hero-tab"
                onClick={() => scrollToSection("section-ai")}
              >
                3. AI DISEASE DETECTION
              </button>
            </div>

            <div className="hero-interactive-bar">
              <div className="hero-crop-selector">
                <Leaf size={18} className="hero-leaf-icon" />
                <span>Rice Plant (Oryza sativa)</span>
              </div>
              <div className="hero-bar-divider" />
              <div className="hero-bar-info">
                <span>Upload plant images, scan live leaves, or record crop video...</span>
              </div>
              <button
                type="button"
                className="hero-cta-button"
                onClick={() => scrollToSection("section-upload")}
              >
                Start Uploading <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Feature Category Pills */}
          <div className="hero-pills">
            <button
              type="button"
              className="hero-pill"
              onClick={() => scrollToSection("section-about")}
            >
              📖 01. About TerraSpectra
            </button>
            <button
              type="button"
              className="hero-pill"
              onClick={() => scrollToSection("section-upload")}
            >
              📤 02. Upload Plant Data
            </button>
            <button
              type="button"
              className="hero-pill"
              onClick={() => openCamera("photo")}
            >
              📷 Live Camera Scan
            </button>
            <button
              type="button"
              className="hero-pill"
              onClick={() => scrollToSection("section-ai")}
            >
              🤖 03. AI Disease Detection
            </button>
            <button
              type="button"
              className="hero-pill"
              onClick={() => scrollToSection("section-insights")}
            >
              🌱 04. Health Advisory
            </button>
            <button
              type="button"
              className="hero-pill"
              onClick={() => scrollToSection("section-history")}
            >
              📊 05. Scan History
            </button>
          </div>

          {/* Scroll Down Prompt to 1st Section: About */}
          <button
            type="button"
            className="scroll-down-indicator"
            onClick={() => scrollToSection("section-about")}
          >
            <span>Scroll down to 1st: About Section</span>
            <ChevronDown size={18} className="bounce-arrow" />
          </button>
        </div>
      </section>

      {/* ========================================================
          1ST: ABOUT TERRASPECTRA SECTION
          ======================================================== */}
      <section className="about-feature-section about-snap-section bg-light" id="section-about">
        <div className="about-story-container">
          <div className="section-header-centered">
            <div className="feature-step-pill">1ST SECTION · PROJECT INTRODUCTION</div>
            <h2>About TerraSpectra</h2>
            <p className="subtitle">
              A smart crop monitoring application designed to help farmers and agricultural researchers
              protect rice yields with artificial intelligence.
            </p>
          </div>

          <div className="about-main-card">
            <div className="about-card-banner">
              <div className="stat-icon leaf-bg">
                <Leaf size={32} />
              </div>
              <div>
                <h3>What is TerraSpectra?</h3>
                <p>Simple, accessible crop health diagnostics explained for everyone.</p>
              </div>
            </div>

            <div className="about-story-body">
              <p className="lead-paragraph">
                <strong>TerraSpectra</strong> is a smart crop monitoring application that helps users check
                the health of their plants. It uses image scanning and AI-based technology to help identify
                possible crop diseases and plant health problems before they cause severe damage.
              </p>
              <p>
                Users can <strong>upload plant images</strong>, <strong>upload crop videos</strong>, or
                <strong> scan plants directly using their device camera</strong>. Our goal is to make crop
                monitoring easier and help users understand when their plants need immediate agricultural attention.
              </p>
            </div>

            <div className="about-pillars-grid">
              <div className="about-pillar-item">
                <div className="pillar-icon">🌾</div>
                <h4>Focused on Rice Plants</h4>
                <p>
                  Built specifically around rice plant datasets: evaluating healthy paddy fields,
                  rice leaf lesions, stem sheaths, and vegetative canopies.
                </p>
              </div>
              <div className="about-pillar-item">
                <div className="pillar-icon">📷</div>
                <h4>Multiple Ways to Inspect</h4>
                <p>
                  From single leaf snapshots to batch multi-image uploads and wide-angle field videos,
                  TerraSpectra gives you flexible inspection tools.
                </p>
              </div>
              <div className="about-pillar-item">
                <div className="pillar-icon">💡</div>
                <h4>Actionable Advice</h4>
                <p>
                  Converts technical machine learning detection into simple, practical steps that any farmer
                  or field agronomist can execute easily.
                </p>
              </div>
            </div>

            <div className="about-cta-footer">
              <div className="about-badge-tag">
                <ShieldCheck size={18} />
                <span>Dataset: Authentic Agricultural Rice Plant Dataset</span>
              </div>
              <button
                type="button"
                className="primary-button"
                onClick={() => scrollToSection("section-upload")}
              >
                Proceed to 2nd: Upload Data <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2ND: UPLOAD DATA (INTERACTIVE WORKSPACE ON THE PRESENT SITE)
          ======================================================== */}
      <section className="about-feature-section about-snap-section bg-white" id="section-upload">
        <div className="about-story-container">
          <div className="section-header-centered">
            <div className="feature-step-pill">2ND SECTION · CROP DATA INGESTION</div>
            <h2>Upload & Capture Crop Data</h2>
            <p className="subtitle">
              Collect and inspect your rice plant samples directly on this page using the 4 main tools.
            </p>
          </div>

          {/* ACTIVE UPLOADED MEDIA PREVIEW (WORKS DIRECTLY ON THIS PRESENT PAGE) */}
          {selectedMedia ? (
            <div className="landing-uploaded-workspace">
              <div className="uploaded-heading">
                <div>
                  <p className="eyebrow">UPLOADED TO PRESENT SITE</p>
                  <h3>
                    {mediaType === "video"
                      ? "Rice Crop Video Ready for Analysis"
                      : `${selectedImages.length} Rice Leaf Image${
                          selectedImages.length === 1 ? "" : "s"
                        } Ready for Analysis`}
                  </h3>
                  <p>
                    {mediaType === "video"
                      ? "Your video has been loaded directly on the present page."
                      : "Review your selected rice plant images below."}
                  </p>
                </div>
                <span className="development-tag">
                  {mediaType === "video" ? "Video Loaded" : "Images Loaded"}
                </span>
              </div>

              <div className="preview-container">
                {mediaType === "video" ? (
                  <video
                    src={selectedMedia}
                    controls
                    playsInline
                    className="overview-preview media-video-preview"
                  />
                ) : (
                  <div className="plant-image-gallery">
                    {selectedImages.map((image, index) => (
                      <div className="plant-image-item" key={image.id}>
                        <img
                          src={image.url}
                          alt={`Rice leaf sample ${index + 1}`}
                        />
                        <span>Sample {index + 1}</span>
                        <button
                          type="button"
                          className="remove-image-button"
                          onClick={() => removeImage(image.id)}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="file-information">
                {mediaType === "video" ? (
                  <Video size={20} />
                ) : (
                  <Upload size={20} />
                )}
                <div>
                  <strong>
                    {mediaType === "video"
                      ? selectedFile?.name
                      : `${selectedImages.length} image(s) selected`}
                  </strong>
                  <span>
                    {mediaType === "video"
                      ? `${(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(
                          selectedImages.reduce(
                            (total, image) => total + image.file.size,
                            0
                          ) /
                          (1024 * 1024)
                        ).toFixed(2)} MB total`}
                  </span>
                </div>
              </div>

              {mediaType === "video" && videoQuality && (
                <div
                  className={`video-quality-notice ${
                    videoQuality.lowQuality
                      ? "quality-warning"
                      : "quality-good"
                  }`}
                >
                  <strong>
                    {videoQuality.width} × {videoQuality.height} video
                    {videoQuality.lowQuality
                      ? " — Low resolution detected"
                      : " — Resolution looks suitable"}
                  </strong>
                  <p>
                    {videoQuality.lowQuality
                      ? "This video has low resolution. You can upscale its dimensions to at least 720p directly in your browser."
                      : "Keep the plant in focus and use good lighting for the best analysis."}
                  </p>
                  {videoQuality.lowQuality && (
                    <button
                      className="secondary-button"
                      onClick={enhanceVideo}
                      disabled={enhancingVideo}
                      type="button"
                    >
                      {enhancingVideo
                        ? "Upscaling video..."
                        : "Upscale Video to 720p"}
                    </button>
                  )}
                </div>
              )}

              <div className="upload-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    alert(
                      `${
                        mediaType === "video"
                          ? "Video"
                          : `${selectedImages.length} image(s)`
                      } ready! AI disease detection model will be integrated by the ML team.`
                    )
                  }
                >
                  <Activity size={18} />
                  Analyse {mediaType === "video" ? "Video" : "Images"}
                </button>

                {mediaType === "image" ? (
                  <>
                    <label className="secondary-button upload-btn-label">
                      <ImagePlus size={16} />
                      <span>Add More Images</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={handleImage}
                        hidden
                      />
                    </label>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openCamera("photo")}
                    >
                      <Camera size={16} />
                      Scan with Camera
                    </button>
                  </>
                ) : (
                  <>
                    <label className="secondary-button upload-btn-label">
                      <Video size={16} />
                      <span>Choose Another Video</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/*"
                        onChange={handleVideo}
                        hidden
                      />
                    </label>

                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openCamera("record")}
                    >
                      <Video size={16} />
                      Record Video
                    </button>
                  </>
                )}

                <button
                  className="secondary-button"
                  type="button"
                  onClick={removeMedia}
                >
                  Remove All
                </button>
              </div>
            </div>
          ) : (
            /* 4 INTERACTIVE UPLOAD ACTIONS (WORKING ON PRESENT PAGE) */
            <div className="upload-methods-grid">
              {/* Card 1: Choose Plant Images */}
              <div className="upload-method-card">
                <div className="method-icon-box">
                  <ImagePlus size={30} />
                </div>
                <span className="method-pill-badge">Multi-Image Batch</span>
                <h3>Choose Plant Images</h3>
                <p>
                  Select multiple plant photos at once. Compare different
                  leaf angles, upper blades, and lower stem sheaths.
                </p>
                <ul className="method-specs-list">
                  <li>• Accepts JPG, JPEG, PNG, and WebP</li>
                  <li>• Up to 10 MB per individual image</li>
                  <li>• Instant preview directly on this page</li>
                </ul>
                <label className="primary-button upload-btn-label">
                  <ImagePlus size={16} />
                  <span>Choose Plant Images</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleImage}
                    hidden
                  />
                </label>
              </div>

              {/* Card 2: Choose a Video */}
              <div className="upload-method-card">
                <div className="method-icon-box">
                  <Video size={30} />
                </div>
                <span className="method-pill-badge">Field Video File</span>
                <h3>Choose a Video</h3>
                <p>
                  Upload recorded field footage to survey entire crop rows, canopy movement, and
                  detect localized disease patches.
                </p>
                <ul className="method-specs-list">
                  <li>• Supports MP4, MOV, and WebM formats</li>
                  <li>• Generous file size limit up to 100 MB</li>
                  <li>• Client-side 720p HD video upscaling tool</li>
                </ul>
                <label className="secondary-button upload-btn-label">
                  <Video size={16} />
                  <span>Choose a Video</span>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/*"
                    onChange={handleVideo}
                    hidden
                  />
                </label>
              </div>

              {/* Card 3: Scan Plant Live */}
              <div className="upload-method-card highlight-card">
                <div className="method-icon-box highlight-icon">
                  <Camera size={30} />
                </div>
                <span className="method-pill-badge active-tag">Tested & Ready</span>
                <h3>Scan Plant Live</h3>
                <p>
                  Directly open your device camera to snap photos of suspicious rice leaves on the spot.
                  Opens right over this page.
                </p>
                <ul className="method-specs-list">
                  <li>• Fast camera viewfinder with daylight focus</li>
                  <li>• In-browser camera capture without extra apps</li>
                  <li>• Take multiple photos in one active session</li>
                </ul>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => openCamera("photo")}
                >
                  <Camera size={16} />
                  Scan Plant Live
                </button>
              </div>

              {/* Card 4: Record Video */}
              <div className="upload-method-card">
                <div className="method-icon-box">
                  <Video size={30} />
                </div>
                <span className="method-pill-badge">Live Cam Recording</span>
                <h3>Record Video</h3>
                <p>
                  Launch your camera in recording mode to capture real-time video walks through
                  your rice paddy, saving the video right here.
                </p>
                <ul className="method-specs-list">
                  <li>• Real-time webcam and mobile camera recording</li>
                  <li>• Built-in timer and safe stop-and-save logic</li>
                  <li>• Preview video right on this page</li>
                </ul>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openCamera("record")}
                >
                  <Video size={16} />
                  Record Video
                </button>
              </div>
            </div>
          )}

          <div className="upload-footer-actions">
            <button
              type="button"
              className="feature-next-btn"
              onClick={() => scrollToSection("section-ai")}
            >
              Continue to Remaining Things: AI Disease Detection <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          3RD: REMAINING THINGS (AI DETECTION, INSIGHTS, HISTORY)
          ======================================================== */}
      
      {/* 3A: AI DISEASE DETECTION */}
      <section className="about-feature-section about-snap-section bg-light" id="section-ai">
        <div className="feature-section-inner reverse">
          <div className="feature-visual-col">
            <div className="visual-card ai-mock-card">
              <div className="ai-mock-header">
                <div className="ai-status-indicator">
                  <Activity size={18} />
                  <span>AI Detection Prototype</span>
                </div>
                <span className="badge-pending">Backend & ML Integration</span>
              </div>
              <div className="ai-prediction-box">
                <div className="prediction-label">Identified Rice Disease Pattern:</div>
                <div className="prediction-name">Rice Blast (Magnaporthe oryzae)</div>
                <div className="prediction-meter-wrapper">
                  <div className="meter-label-row">
                    <span>Model Confidence</span>
                    <strong>94.2%</strong>
                  </div>
                  <div className="prediction-meter-bar">
                    <span className="meter-fill" style={{ width: "94.2%" }} />
                  </div>
                </div>
                <div className="detection-target-tag">
                  <ShieldCheck size={16} />
                  <span>Dataset: Specialized Rice Leaf Disease Collection</span>
                </div>
              </div>
              <div className="ai-mock-footer">
                <p>Awaiting model deployment and API integration by team members</p>
              </div>
            </div>
          </div>

          <div className="feature-text-col">
            <div className="feature-step-pill">3RD SECTION (PART A) · AI DISEASE DETECTION</div>
            <h2>AI-Powered Crop Disease Identification</h2>
            <p className="feature-lead-text">
              Utilize machine learning computer vision models trained specifically on rice crops to
              distinguish between common fungal, bacterial, and viral infections.
            </p>
            <ul className="feature-points-list">
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Detection of Rice Blast, Bacterial Leaf Blight, and Brown Spot</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Automated region highlight on affected rice foliage</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Designed for high accuracy on authentic agricultural datasets</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Frontend will connect smoothly to team backend API endpoints</span>
              </li>
            </ul>
            <div className="feature-button-group">
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  alert("AI Disease Detection will be connected once the ML model and backend endpoints are integrated.")
                }
              >
                <Activity size={18} />
                Run AI Detection Test
              </button>
              <button
                type="button"
                className="feature-next-btn"
                onClick={() => scrollToSection("section-insights")}
              >
                Next: Plant Health Insights <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3B: PLANT HEALTH INSIGHTS & ADVISORY */}
      <section className="about-feature-section about-snap-section bg-white" id="section-insights">
        <div className="feature-section-inner">
          <div className="feature-text-col">
            <div className="feature-step-pill">3RD SECTION (PART B) · HEALTH INSIGHTS</div>
            <h2>Actionable Plant Health Insights for Farmers</h2>
            <p className="feature-lead-text">
              Transform technical AI predictions into clear, understandable advisories so farmers
              can take immediate preventive measures to save their harvests.
            </p>
            <ul className="feature-points-list">
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Plain-language symptom summaries and infection severity rankings</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Water management guidance (drainage or irrigation control)</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Recommended agricultural spray and treatment options</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Helps prevent rapid disease spread across adjacent rice paddies</span>
              </li>
            </ul>
            <div className="feature-button-group">
              <button
                type="button"
                className="primary-button"
                onClick={() => scrollToSection("section-history")}
              >
                <Sprout size={18} />
                Explore Health Advisory
              </button>
              <button
                type="button"
                className="feature-next-btn"
                onClick={() => scrollToSection("section-history")}
              >
                Next: Scan History <ChevronDown size={16} />
              </button>
            </div>
          </div>

          <div className="feature-visual-col">
            <div className="visual-card advisory-mock-card">
              <div className="advisory-card-header">
                <div className="advisory-badge-warning">
                  <span>Moderate Disease Severity</span>
                </div>
                <small>Rice Health Advisory #410</small>
              </div>
              <div className="advisory-content">
                <strong>Recommended Farmer Actions:</strong>
                <ol className="advisory-steps">
                  <li>Isolate affected plot rows to prevent fungal spores from spreading</li>
                  <li>Reduce excessive nitrogen application during peak vegetative stages</li>
                  <li>Maintain 2–3 inches of standing water in the paddy basin</li>
                </ol>
              </div>
              <div className="advisory-mock-footer">
                <ShieldCheck size={16} />
                <span>Agronomic rules calibrated for Indian rice cultivation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3C: SCAN HISTORY & MONITORING TIMELINE */}
      <section className="about-feature-section about-snap-section bg-light" id="section-history">
        <div className="feature-section-inner reverse">
          <div className="feature-visual-col">
            <div className="visual-card history-mock-card">
              <div className="history-mock-header">
                <strong>Crop Inspection Log</strong>
                <span className="history-count">3 Scans Recorded</span>
              </div>
              <div className="history-timeline-list">
                <div className="timeline-item">
                  <div className="timeline-icon-box">
                    <Camera size={16} />
                  </div>
                  <div className="timeline-info">
                    <strong>Paddy Plot A · North Corner</strong>
                    <span>Live Photo Scan · Healthy Leaf</span>
                  </div>
                  <span className="timeline-date">18 Nov 2026</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon-box">
                    <ImagePlus size={16} />
                  </div>
                  <div className="timeline-info">
                    <strong>Paddy Plot B · Main Canopy</strong>
                    <span>4 Images Uploaded · Under Review</span>
                  </div>
                  <span className="timeline-date">15 Nov 2026</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-icon-box">
                    <Video size={16} />
                  </div>
                  <div className="timeline-info">
                    <strong>Paddy Plot C · Field Perimeter</strong>
                    <span>Video Recording · Upscaled to 720p</span>
                  </div>
                  <span className="timeline-date">12 Nov 2026</span>
                </div>
              </div>
              <div className="history-mock-footer">
                <p>Digital harvest journal stored locally & synchronized with cloud</p>
              </div>
            </div>
          </div>

          <div className="feature-text-col">
            <div className="feature-step-pill">3RD SECTION (PART C) · SCAN HISTORY</div>
            <h2>Track Previous Crop Scans & Growth History</h2>
            <p className="feature-lead-text">
              Maintain an organized historical archive of all your field inspections, camera captures,
              and plant health evaluations across every planting cycle.
            </p>
            <ul className="feature-points-list">
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Review past scan dates, images, and corresponding diagnosis records</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Monitor recovery progress after applying agricultural treatments</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Compare seasonal disease trends across different harvest years</span>
              </li>
              <li>
                <CheckCircle2 size={18} className="check-icon" />
                <span>Export logs for agricultural extension officers and farm consultations</span>
              </li>
            </ul>
            <div className="feature-button-group">
              <button
                type="button"
                className="feature-top-btn"
                onClick={() => scrollToSection("about-hero")}
              >
                Back to Top Hero ↑
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM FOOTER SUMMARY & TRANSPARENCY NOTICE */}
      <footer className="about-footer-banner">
        <div className="footer-banner-inner">
          <div className="footer-brand-summary">
            <div className="stat-icon leaf-bg">
              <Leaf size={28} />
            </div>
            <div>
              <h3>TerraSpectra Smart Agriculture</h3>
              <p>
                Collaborative research and development platform for rice crop health monitoring.
                Disease detection models and backend endpoints are under active development.
              </p>
            </div>
          </div>
          <div className="footer-cta-buttons">
            <button
              type="button"
              className="primary-button"
              onClick={() => scrollToSection("section-upload")}
            >
              Upload Plant Data
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => scrollToSection("about-hero")}
            >
              Back to Top
            </button>
          </div>
        </div>
      </footer>
    </div>
  );

  // Other pages.
  const pageDetails = {
    "Disease Analysis": {
      icon: Sprout,
      description:
        "Disease names, confidence scores, symptoms and treatment recommendations will appear here after model integration.",
    },

    "Scan History": {
      icon: History,
      description:
        "Your previous crop scans and their analysis results will be displayed here.",
    },

    "Settings": {
      icon: Settings,
      description:
        "Manage your profile and application preferences here.",
    },
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
      {/* Live camera and video recording modal. */}
      {cameraOpen && (
        <div className="camera-overlay">
          <div className="camera-modal">
            <div className="camera-heading">
              <div>
                <p className="eyebrow">TERRASPECTRA CAMERA</p>

                <h2>
                  {cameraMode === "record"
                    ? "Record Plant Video"
                    : "Capture Plant Photo"}
                </h2>

                <p>
                  {cameraMode === "record"
                    ? "Keep the plant in view and record a short video."
                    : "Position the plant clearly, capture different angles, and close the camera when finished."}
                </p>
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
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview"
            />

            <div className="upload-actions camera-actions">
              {cameraMode === "photo" ? (
                <button
                  className="primary-button"
                  onClick={capturePhoto}
                >
                  <Camera size={18} />
                  Capture Photo
                </button>
              ) : (
                <button
                  className={
                    recording ? "recording-button" : "primary-button"
                  }
                  onClick={
                    recording ? stopRecording : startRecording
                  }
                >
                  {recording ? (
                    <Square size={17} />
                  ) : (
                    <Video size={18} />
                  )}

                  {recording
                    ? "Stop & Save Video"
                    : "Start Recording"}
                </button>
              )}

              <button
                className="secondary-button"
                onClick={closeCamera}
              >
                Cancel
              </button>
            </div>

            {recording && (
              <p className="recording-status">
                <span className="recording-dot" />
                Recording in progress...
              </p>
            )}
          </div>
        </div>
      )}

      {/* When on About, display the full-width Farmland India experience. When on other pages, display the workspace sidebar and topbar. */}
      {activePage !== "About" && (
        <>
          {mobileOpen && (
            <button
              className="mobile-overlay"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
          )}

          <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
            <div className="brand">
              <div className="brand-icon">
                <Leaf size={34} />
              </div>

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
                  className={`nav-item ${
                    activePage === name ? "active" : ""
                  }`}
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
              <div className="footer-icon">
                <Sprout size={27} />
              </div>

              <div>
                <strong>Crop Health Workspace</strong>
                <p>Welcome to TerraSpectra</p>
              </div>
            </div>
          </aside>
        </>
      )}

      <main className={`main-area ${activePage === "About" ? "landing-main-full" : ""}`}>
        {activePage !== "About" && (
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

              <button
                className="icon-button"
                aria-label="Notifications"
              >
                <Bell size={24} />
              </button>

              <div className="profile-avatar">R</div>
            </div>
          </header>
        )}

        <div className={`page-content ${activePage === "About" ? "about-full-bleed" : ""}`}>
          {activePage === "Overview"
            ? renderOverview()
            : activePage === "Crop Scanner"
              ? renderScanner()
              : activePage === "About"
                ? renderAbout()
                : activePage === "Disease Analysis"
                  ? (
                    <DiseaseAnalysis
                      selectedMedia={selectedMedia}
                      selectedImages={selectedImages}
                      mediaType={mediaType}
                      onNavigate={setActivePage}
                    />
                  )
                  : activePage === "Scan History"
                    ? <ScanHistory />
                    : activePage === "Settings"
                      ? <SettingsPage />
                      : renderOtherPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
