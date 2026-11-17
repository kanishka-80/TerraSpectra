import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, ScanLine, Sprout, History, Settings,
  Bell, Search, Leaf, Upload, ImagePlus, ArrowRight,
  Activity, Menu, X, ShieldCheck, Camera, Video, Square
} from "lucide-react";
import "./App.css";

const navItems = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Crop Scanner", icon: ScanLine },
  { name: "Disease Analysis", icon: Sprout },
  { name: "Scan History", icon: History },
  { name: "Settings", icon: Settings },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

function App() {
  const [activePage, setActivePage] = useState("Crop Scanner");
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
  const setMedia = (file, type, navigateToOverview = true) => {
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

    if (navigateToOverview) {
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
      setActivePage("Overview");
      setMobileOpen(false);
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

    if (cameraMode === "photo" && selectedImages.length > 0) {
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

        <div className="upload-actions">
          <label className="primary-button">
            <Upload size={18} />
            Browse Image

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleImage}
              hidden
            />
          </label>

          <label className="secondary-button">
            <Video size={18} />
            Browse Video

            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              onChange={handleVideo}
              hidden
            />
          </label>
        </div>

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

            <button
              className="icon-button"
              aria-label="Notifications"
            >
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