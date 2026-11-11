# TerraSpectra — Backend Integration Open Questions & Decisions Register

**Module:** Backend Integration  
**Owner:** Kanishka (Backend Engineering)  
**Stakeholders:** Harsh (ML Lead), Khushi (ML & Data Engineering), Ritik (Frontend Lead)  
**Status:** Active Working Document  
**Version:** 0.1.0  

---

## 1. Overview & Purpose

This document tracks unresolved technical questions, data contract ambiguities, and architectural decisions between the Backend Service, the Machine Learning Engine (Harsh and Khushi), and the Frontend Application (Ritik).

Resolving these questions is necessary to ensure seamless integration between the API layer, ML models, and user dashboard. All items with unconfirmed parameters are explicitly marked as **TBD (To Be Determined)**.

---

## 2. Questions for ML Team (Harsh & Khushi)

### 2.1 Model Input Specifications
1. **Input Delivery Format:**
   - How should the backend pass input data into the ML inference module?
   - *Options:* A file path on disk (e.g., GeoTIFF/raster file), an in-memory NumPy array (`np.ndarray`), or a pre-allocated PyTorch tensor (`torch.Tensor`)?
2. **Tensor Dimensions:**
   - The proposed 3D-CNN input tensor layout is 5D: `[Batch, Channels, Depth, Height, Width]` where `Channels = 1`.
   - What is the exact spectral band count ($Depth$ / $D$)? **(Status: TBD — pending dataset selection)**.
   - What are the spatial patch dimensions ($Height \times Width$ / $H \times W$)? Proposed values are $11 \times 11$, $13 \times 13$, or $15 \times 15$. **(Status: TBD — pending baseline experiments)**.
3. **Spectral Band Selection & Filtering:**
   - Hyperspectral imagery contains atmospheric water absorption bands (approx. 1350–1420 nm and 1800–1950 nm) and requires ascending wavelength ordering.
   - Does the backend need to filter and reorder bands, or will `terraspectra_ml.data.preprocessing` handle all band selection and filtering internally?
4. **Supported Input File Formats:**
   - Which raster formats must the backend accept during ingestion? (e.g., GeoTIFF `.tif`, ENVI `.hdr`/`.bil`, NetCDF `.nc`, HDF5 `.h5`? Specific list is **TBD**).

### 2.2 Model Output Specifications
1. **Output Structure & Geometry:**
   - What exact data structure does `terraspectra_ml.inference.predict()` return?
   - Does it return a 2D spatial grid of class predictions matching the input raster dimensions $(H_{scene}, W_{scene})$, a patch-level classification vector, or raw unstitched tile predictions? **(Status: TBD)**.
2. **Logits vs Probabilities:**
   - Does the inference module return unnormalized logits, or normalized softmax probabilities across classes?

### 2.3 Prediction Classes & Taxonomy
1. **Target Classification Categories:**
   - What are the confirmed target classes for the model? **(Status: TBD)**.
   - Will the initial model classify broad land-cover categories, general vegetation stress levels (e.g., Healthy, Moderate Stress, Severe Stress), or specific verified crop diseases?
   - *Note:* Subject to dataset label audit by Khushi. No unverified disease classes will be assumed.
2. **Background / Invalid Class Representation:**
   - What numeric value or class index represents non-vegetation, background, or invalid/NoData pixels? (e.g., Class `0` = Unclassified/Background).

### 2.4 Confidence Scores & Uncertainty Estimation
1. **Uncertainty Metric Calculation:**
   - How will prediction confidence and uncertainty be quantified? (e.g., maximum softmax probability, Monte Carlo Dropout variance, or entropy).
2. **Range and Interpretation:**
   - What is the numerical range of the uncertainty metric (e.g., $[0.0, 1.0]$)?
   - Does a higher value represent higher uncertainty or higher confidence?
3. **Filtering Thresholds:**
   - Are there recommended threshold values below which predictions should be flagged as "low confidence" or "unreliable" in the API response? **(Status: TBD)**.

### 2.5 Inference Interface & Execution Environment
1. **Python Function Signature:**
   - What is the exact callable signature for running model inference?
   - *Draft proposal:* `predict(cube: np.ndarray, metadata: dict) -> Dict[str, Any]` — requires confirmation from Harsh.
2. **Model Checkpoint Format:**
   - How will model checkpoints be packaged, stored, and loaded? (e.g., PyTorch state dict `.pt`, TorchScript, or ONNX? **Status: TBD**).
3. **Hardware Execution Constraints:**
   - Can inference execute in a CPU-only environment for development, or is an NVIDIA CUDA GPU strictly required?
   - What are the minimum system memory (RAM) and GPU VRAM requirements?
4. **Tiling & Stitching Responsibilities:**
   - Who holds primary responsibility for slicing full scenes into overlapping patches and reassembling prediction masks?
   - Does the backend slice the raster and call inference per tile, or does the backend pass the full scene raster to `terraspectra_ml.inference.tiling` and `stitch.py`? **(Status: TBD)**.

---

## 3. Questions for Frontend Team (Ritik)

### 3.1 Dashboard Data Requirements
1. **Key Display Metrics:**
   - What specific summary metrics does the dashboard need to display for each analysis run?
   - *Examples:* Overall crop stress index, class distribution percentages, dominant predicted category, average confidence score, total area analyzed (hectares/acres).
2. **Temporal & Historical Analysis:**
   - Does the frontend require time-series comparisons or historical trend tracking during Phase 1, or is the focus strictly on single-scene inspection?

### 3.2 API Response Structure & Format Preferences
1. **JSON Payload Structure:**
   - Does the frontend prefer a flat JSON structure or a nested hierarchical object for summary metrics?
2. **Spatial Prediction Visualization:**
   - How does the frontend plan to visualize prediction maps on the client dashboard?
   - *Options:*
     - A. Direct GeoTIFF download / rendering via client-side libraries (e.g., GeoTIFF.js).
     - B. Pre-rendered raster overlay images (PNG/WebP with transparency) georeferenced via bounding box coordinates.
     - C. Vector polygons (GeoJSON) representing identified stress boundaries.
   - Which option should the backend prioritize for Phase 1? **(Status: TBD)**.

### 3.3 Geospatial Metadata & Coordinate Conventions
1. **Coordinate Reference System (CRS):**
   - Which CRS does the frontend map component expect? (e.g., WGS84 `EPSG:4326` latitude/longitude vs Web Mercator `EPSG:3857`).
2. **Coordinate Ordering:**
   - What coordinate ordering convention does the frontend use for bounding box arrays?
   - Does the frontend expect `[longitude, latitude]` (GeoJSON standard) or `[latitude, longitude]`?
3. **Region of Interest Selection:**
   - Will users define an analysis area by drawing a bounding box / polygon on an interactive map, or by selecting a pre-loaded satellite scene?

### 3.4 File Upload & Async Workflow UX
1. **Upload Method:**
   - Will users upload large hyperspectral raster files directly through the web UI, or will the system analyze pre-cataloged dataset scenes?
2. **Handling Job Latency:**
   - Machine learning inference on large hyperspectral cubes may take significant processing time (e.g., 30–120+ seconds).
   - How should the frontend handle this waiting period?
   - *Proposal:* Backend returns an immediate `202 Accepted` with a `job_id`; frontend polls `GET /api/v1/inference/jobs/{job_id}` until complete. Does this meet frontend requirements?
3. **Error Feedback:**
   - How should data validation errors (e.g., unreadable raster, missing coordinate system, invalid file format) be surfaced to the user?

---

## 4. Shared Integration Questions

### 4.1 Latency Targets & Timeout Limits
- What is the maximum acceptable latency for end-to-end inference?
- What should be the hard HTTP timeout limit before a running request is marked as timed out or aborted?

### 4.2 Handling Invalid Pixels, Clouds, and NoData
- Hyperspectral imagery frequently contains cloud cover, shadows, and NoData boundary pixels (e.g., `-9999` or `NaN`).
- How should these pixels be represented across the entire stack?
  - Should the backend pre-filter NoData pixels?
  - Should the ML model output a dedicated "Background / Cloud / Invalid" category (e.g., Class 0)?
  - Should the frontend hide or mask these pixels during map rendering?

### 4.3 Deployment & Integration Environment
- What is the target runtime environment for cross-module integration?
  - Local workstation development with shared Git branches?
  - Containerized deployment using Docker / Docker Compose?
  - Shared cloud virtual machine?
- How will large model checkpoints and test datasets be shared among team members without committing massive binary files to Git?

### 4.4 Authentication & API Access Control
- Is user authentication (e.g., JWT bearer tokens, API keys, or session cookies) required for Phase 1 / Week 1, or should endpoints remain open and unauthenticated for local development?

### 4.5 Storage of Uploaded Scenes & Prediction Artifacts
- Where will uploaded hyperspectral rasters and generated prediction rasters (GeoTIFFs) be stored?
  - Local backend filesystem directory?
  - Cloud object storage (e.g., AWS S3 or Google Cloud Storage)? **(Status: TBD)**.

---

## 5. Decisions Pending Confirmation

The following table summarizes open integration decisions across TerraSpectra modules:

| Decision Item | Proposed / Candidate Options | Responsible Owner(s) | Impacted Modules | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Hyperspectral Dataset & Sensor** | EnMAP, PRISMA, AVIRIS, NASA EMIT | Khushi, Harsh | ML, Data, Backend | **Pending Confirmation** (Dataset audit underway) |
| **Classification Label Taxonomy** | Land-cover classes vs Stress levels vs Disease classes | Harsh, Khushi | ML, Backend, Frontend | **Pending Confirmation** (Subject to verified labels) |
| **Model Input Tensor Dimensions** | Proposed: `[B, 1, D, H, W]` ($D$ bands, $H \times W$ patch size) | Harsh | ML, Backend | **Pending Confirmation** ($D, H, W$ are TBD) |
| **Tiling & Stitching Ownership** | Backend worker orchestration vs `terraspectra_ml.inference` module | Harsh, Kanishka | Backend, ML | **Under Discussion** |
| **Spatial Map Output Format** | Cloud Optimized GeoTIFF (COG), Pre-rendered PNG overlay, or GeoJSON | Ritik, Kanishka | Backend, Frontend | **Under Discussion** |
| **Coordinate Ordering Standard** | GeoJSON standard `[lon, lat]` vs Leaflet `[lat, lon]` | Ritik, Kanishka | Backend, Frontend | **Under Discussion** |
| **Inference Hardware Target** | NVIDIA CUDA GPU mandatory vs CPU fallback supported | Harsh, Kanishka | ML, Backend | **Under Discussion** |
| **Storage Strategy for Rasters** | Local filesystem vs Cloud object store (S3/GCS) | Kanishka | Backend, ML | **TBD** |
| **Authentication Scope for Phase 1** | Open unauthenticated endpoints vs Basic API token | Kanishka, Ritik | Backend, Frontend | **TBD** |

