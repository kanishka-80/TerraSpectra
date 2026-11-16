# TerraSpectra — Machine Learning Module (`ml/`)

**Lead Engineer:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering)  
**Repository Branch:** `Harsh`  
**Current Phase:** Week 1 Complete — ML Foundation, Contracts & Evaluation Architecture

---

## 1. Purpose & Architecture Overview
The `ml/` subsystem powers early crop stress detection and disease-risk intelligence for TerraSpectra by analyzing contiguous narrow-band hyperspectral imagery.

### Planned Hybrid Architecture

    Hyperspectral Patch [B, 1, D, 13, 13] (float32, ascending wavelengths)
           |
           v
    3D-CNN Feature Extractor (Local volumetric spectral-spatial convolutions)
           |
           v
    Vision Transformer (ViT) (Global self-attention across spatial-spectral tokens)
           |
           v
    Classification Head & Uncertainty (Logits [B, K] -> Softmax + MC-Dropout Entropy)

---

## 2. Implementation Status (Week 1 Audit)

### Implemented & Verified (Week 1)
- **Package Structure:** `terraspectra_ml` (`v0.1.0`) initialized with `terraspectra_ml.models` subpackage.
- **Input Tensor Contract (`ml/src/terraspectra_ml/models/input_contract.py`):** Enforces 5D `[B, C=1, D, H=13, W=13]` shape, `float32` dtype, minimum spectral depth (`D >= 4`), odd spatial dimensions, `NaN`/`Inf` rejection, and explicit CPU/CUDA device resolution (`resolve_target_device`).
- **Automated Unit Tests (`ml/tests/`):** 19 unit tests across `test_input_contract.py` and `test_tensor_shapes.py` verified passing (`19/19 OK`).
- **Configuration Foundation (`ml/configs/`):** Structured YAML schemas for data (`data.yaml`), class mappings (`classes.yaml`), model specs (`model_config.yaml`, `hybrid_3dcnn_vit.yaml`), and experiment evaluation (`experiment.yaml`).
- **Technical Specifications (`docs/ml/`):** Complete documentation covering data contracts, model output tiers, 3D-CNN design, ViT integration, evaluation metrics, leakage prevention, and uncertainty estimation.

### Planned for Week 2 (Not Yet Implemented)
- Dedicated Python virtual environment (`ml/.venv`) with CUDA 12.4 PyTorch installation.
- Implementation of `cnn3d.py` (3-stage volumetric 3D-CNN backbone) and forward-pass unit tests.
- Integration with Khushi's finalized hyperspectral dataset and preprocessing pipeline.
- Integration of Vision Transformer encoder (`vit_spectral.py`) and hybrid assembly (`hybrid_model.py`) after 3D-CNN baseline validation.

---

## 3. Repository Structure (`ml/`)

    ml/
    ├── README.md                              # Module overview, setup, and status
    ├── requirements.txt                       # Core Python dependencies (NumPy <2.0, Rasterio, PyYAML, etc.)
    ├── configs/
    │   ├── data.yaml                          # Sensor, wavelength filtering, normalization, and patch settings
    │   ├── classes.yaml                       # Provisional class definitions (confirmed: false)
    │   ├── model_config.yaml                  # Base model and classification head contract
    │   ├── hybrid_3dcnn_vit.yaml              # Full 3D-CNN + ViT architecture & training hyperparameters
    │   └── experiment.yaml                    # Evaluation metrics, spatial splitting, and uncertainty config
    ├── src/
    │   └── terraspectra_ml/
    │       ├── __init__.py                    # Package initialization (v0.1.0)
    │       └── models/
    │           ├── __init__.py                # Exports input validation & device utilities
    │           └── input_contract.py          # 5D tensor shape, dtype, NaN/Inf, and device validator
    └── tests/
        ├── test_input_contract.py             # Input contract edge-case tests (11 tests)
        └── test_tensor_shapes.py              # Shape, dtype, and device resolution tests (8 tests)

---

## 4. Reference Specifications
- **Input & Geospatial Contract:** `docs/ml/data-model-contract.md`
- **Prediction Task & Output Tiers:** `docs/ml/model-specification.md`
- **3D-CNN Backbone Design:** `docs/ml/3dcnn-architecture.md`
- **ViT Integration & Attention Plan:** `docs/ml/vit-integration-plan.md`
- **Evaluation, Splitting & Uncertainty:** `docs/ml/experiment-plan.md`
- **Daily Engineering Log:** `docs/ml/development-log.md`

---

## 5. Environment Setup & Running Tests

### Setup Isolated Environment (Windows PowerShell)

    python -m venv ml\.venv
    .\ml\.venv\Scripts\Activate.ps1
    pip install -r ml\requirements.txt
    pip install torch torchvision --index-url [https://download.pytorch.org/whl/cu124](https://download.pytorch.org/whl/cu124)

### Run Automated ML Tests

    python -m unittest discover -s ml/tests -v
