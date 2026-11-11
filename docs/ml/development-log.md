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
