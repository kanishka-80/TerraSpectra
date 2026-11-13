# TerraSpectra ML Development Log

## Day 1 — Environment Setup & Project Understanding
**Date:** November 11, 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives
- Establish the ML development workspace and inspect existing repository structure.
- Verify host Python environment, PyTorch availability, and GPU acceleration capabilities.
- Formalize foundational understanding of hyperspectral data cubes versus multispectral/RGB imagery.
- Define Day 1 coordination touchpoints with Khushi (Data & ML Engineering).
- Establish initial baseline repository files (`ml/README.md`, `ml/requirements.txt`, `ml/src/terraspectra_ml/__init__.py`).

### 2. Environment Verification Results
- **OS:** Windows 11 (`10.0.26300-SP0`, AMD64)
- **Python Version:** 3.11.9 (64-bit)
- **GPU Hardware:** NVIDIA GeForce RTX 3050 Laptop GPU (6144 MiB VRAM)
- **Driver / CUDA API:** Driver 551.76 | CUDA 12.4 supported
- **PyTorch Status:** Not installed in base Python environment; dedicated ML virtual environment required.
- **NumPy Version:** 2.4.4 (base); will pin `<2.0.0` in the ML virtual environment for strict PyTorch and Rasterio C-extension binary compatibility.

### 3. Hyperspectral Principles & Architectural Rationale
- **Hyperspectral Cubes:** Unlike RGB (3 broadband channels) or multispectral (10–13 bands), hyperspectral sensors acquire 100–250+ narrow contiguous spectral bands across 400–2500 nm. Each ground pixel represents a continuous spectral signature.
- **Early Crop Stress:** Biophysical signals (chlorophyll degradation in the red-edge 690–730 nm, subtle water stress dips at 970/1200 nm) manifest prior to visible leaf necrosis.
- **3D-CNN Necessity:** Standard 2D-CNNs collapse spectral bands into flat feature maps, breaking inter-band spectral gradients and continuous physical absorption profiles. 3D convolutions convolve across spatial $(H, W)$ and spectral $(D)$ dimensions simultaneously.

### 4. Coordination Touchpoints with Khushi
- **Khushi's Scope:** Dataset audit, sensor calibration, atmospheric correction, band selection/PCA, baseline algorithms (Random Forest, SVM, 2D CNN), and initial SHAP band attributions.
- **ML Lead Contract Handoff:**
  - Standardized preprocessed tensor input format: `[B, C, D, H, W]` where `C=1`, `D=Bands`, `H=W=Patch Size`.
  - Normalization scheme (e.g., L2 or Min-Max per patch / global band mean-std).
  - Spatial cross-validation splits to avoid spatial autocorrelation leakage.

### 5. Tasks Completed
- Verified hardware and system toolchain.
- Inspected repository and validated Git branch workflow.
- Drafted initial ML documentation and module initialization.

### 6. Pending / Next Steps
- Create isolated virtual environment for ML (`ml/.venv`).
- Complete PyTorch CUDA installation.
- Finalize Day 2 task: Tensor input/output contract specification.

## Day 2 — Hyperspectral Data Understanding & ML Input Specification
**Date:** November 12, 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives
- Formalize hyperspectral cube structural representation and wavelength registration.
- Define mathematical rationale for band ordering and 3D convolution spatial-spectral kernel mechanics.
- Finalize the proposed 5D 3D-CNN input tensor contract `[B, C, D, H, W]`.
- Define robust NoData, NaN, Inf, and cloud masking strategies.
- Document backend compatibility requirements for Kanishka's raster inference workers.
- Author `docs/ml/data-model-contract.md` and `ml/configs/data.yaml`.

### 2. Hyperspectral Data & Architectural Findings
- **Data Cube Geometry:** Explored difference between 3-band RGB, 10–13-band multispectral, and 200+ band hyperspectral cubes. Every spatial pixel is a continuous reflectance curve $\rho(\lambda)$.
- **Spectral Locality:** 3D-CNN kernels convolve simultaneously across $(D, H, W)$. Unordered or arbitrarily permuted bands break the physical continuity of the spectral gradient, destroying feature representation.
- **Tensor Layout Decision:** Standardized on `[B, 1, D, H, W]` in `float32`. Setting `C = 1` treats the contiguous spectrum as a 3D volumetric field, fulfilling PyTorch's `nn.Conv3d` input signature.

### 3. Decisions & Coordination Handshakes
- **Khushi (ML & Data Engineering):**
  - Handshake: Preprocessing must deliver normalized `[B, 1, D, H, W]` patches with ascending wavelength sorting and water absorption bands purged.
  - Primary scene selection and label audit remain pending confirmation from Khushi.
- **Kanishka (Backend):**
  - Inference worker must pass tiled scenes with affine transforms intact and respect the 2-pixel spatial overlap to eliminate boundary stitching artifacts.

### 4. Files Created / Updated
- `docs/ml/data-model-contract.md`: Comprehensive technical specification contract.
- `ml/configs/data.yaml`: Parameterized data configuration with explicit placeholders for unconfirmed fields.
- `docs/ml/development-log.md`: Appended Day 2 milestone records.

### 5. Verification & Syntax Validation
- Validated YAML parsing for `ml/configs/data.yaml`.
- Verified file paths against the repository structure.

### 6. Pending Confirmation (Phase 1 Decision Gates)
- Confirmation of primary dataset sensor (EnMAP vs PRISMA vs AVIRIS) from Khushi.
- Finalization of verified label availability (land-cover vs crop stress vs disease).

## Day 3 — ML Prediction Task & Model Output Specification
**Date:** November 12, 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives
- Define the initial ML prediction task grounded in verified dataset and label availability.
- Distinguish crop stress detection from specific disease identification and multi-date forecasting.
- Specify the 3D-CNN + ViT classification head, logits, softmax probabilities, and separate uncertainty representation.
- Establish the 4-tier output contract (Model -> Patch -> Spatial Tile -> Backend API) for Kanishka's FastAPI integration.
- Create `ml/configs/classes.yaml`, `ml/configs/model_config.yaml`, and `docs/ml/model-specification.md`.

### 2. Key Technical Decisions
- **Provisional Task Scope:** Scoped initial model to single-date **crop stress detection** (`healthy` vs. `stressed` provisional binary mapping in `classes.yaml`) rather than unverified pathogen identification or multi-week forecasting.
- **Dynamic Class Binding:** Number of output neurons `K` is driven dynamically from `classes.yaml` rather than hardcoded in model configs.
- **Decoupled Output Tiers:** Separated PyTorch tensor outputs (`[B, K]` logits) from patch JSON structures, georeferenced 2D spatial arrays (`int16` class map + `float32` confidence map), and backend persistence metadata (`prediction_id`, `job_id`, `scene_id`, COG URIs).
- **Uncertainty Isolation:** Separated predictive uncertainty (MC-Dropout planned for Phase 3) from softmax class probabilities.

### 3. Coordination & Integration Findings
- **Khushi (Data & ML):** `classes.yaml` explicitly flags `confirmed: false` until the dataset and ground-truth label audit are finalized.
- **Kanishka (Backend):** Documented exact division of responsibilities between `terraspectra_ml.inference` (georeferenced arrays + model metadata) and FastAPI workers (async job tracking, COG packaging, and API serialization).

### 4. Files Created / Updated
- `ml/configs/classes.yaml`: Provisional class mapping and NoData background code (`-1`).
- `ml/configs/model_config.yaml`: Architectural and classification head specification with explicit `null` placeholders for Week 2 dimensions.
- `docs/ml/model-specification.md`: Complete Day 3 prediction task and output contract specification.
- `docs/ml/development-log.md`: Appended Day 3 milestone log.

### 5. Validation & Checks
- Verified YAML syntax and cross-file schema consistency across `data.yaml`, `classes.yaml`, and `model_config.yaml`.

### 6. Pending Questions & Open Decisions
- Confirmation of final dataset and ground-truth label schema to flip `confirmed: true` in `classes.yaml`.
- Finalization of exact `feature_dim` and ViT `embed_dim` in Week 2 based on selected band count `D` and 6 GB VRAM budget.

## Day 4 — 3D-CNN Architecture Design & Input Contract Implementation
**Date:** November 13, 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives
- Formulate the 3-stage 3D-CNN architecture (`[8, 16, 32]` channels) with spectral striding and spatial preservation.
- Document symbolic tensor transformations (`[B, 1, D, H, W]` -> `[B, F]`) and future ViT tokenization interface.
- Implement `ml/src/terraspectra_ml/models/input_contract.py` and `ml/src/terraspectra_ml/models/__init__.py`.
- Implement and execute unit tests in `ml/tests/test_input_contract.py`.

### 2. Implementation & Test Verification
- Implemented `InputContractSpec` and `validate_model_input` supporting both NumPy arrays and PyTorch tensors.
- Enforced 5D layout `[B, C=1, D, H, W]`, minimum spectral depth (`D >= 4`, rejecting 3-band RGB `.jpg` inputs), odd spatial patch dimensions, `float32` dtype, and `NaN`/`Inf` rejection.
- Executed unit test suite (`ml/tests/test_input_contract.py`): 11/11 unit tests passed.

### 3. Files Created / Updated
- `ml/src/terraspectra_ml/models/input_contract.py`
- `ml/src/terraspectra_ml/models/__init__.py`
- `ml/tests/test_input_contract.py`
- `docs/ml/3dcnn-architecture.md`
- `docs/ml/development-log.md`
