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
