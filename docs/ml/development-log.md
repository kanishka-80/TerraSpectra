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

## Day 5 — Model Development & Testing Foundation
**Date:** Sunday, 15 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objective
- Establish the initial hybrid 3D-CNN + Vision Transformer (ViT) and reproducible experiment configuration structure (`ml/configs/hybrid_3dcnn_vit.yaml`).
- Extend the 5D tensor input contract (`ml/src/terraspectra_ml/models/input_contract.py`) with explicit device resolution and device validation.
- Build and execute automated tensor-shape, dtype, and device validation unit tests (`ml/tests/test_tensor_shapes.py`).

### 2. Configuration & Validation Work Completed
- **`ml/configs/hybrid_3dcnn_vit.yaml`:** Defined structured sections for Model Information, Input Configuration (`B_C_D_H_W`, `C=1`, `H=W=13`, `float32`), 3D-CNN Blocks (`[8, 16, 32]`), ViT Hybrid settings (`embed_dim=128`, `num_heads=4`, `num_layers=2`), Classification Head reference (`classes.yaml`), Initial Training Hyperparameters (`tuned: false`), and Experiment Reproducibility (`random_seed: 42`, `reproducibility_verified: false`).
- **`ml/src/terraspectra_ml/models/input_contract.py` & `__init__.py`:** Preserved Day 4 dimensional, dtype (`float32`), and `NaN`/`Inf` checks; added `expected_device` validation and `resolve_target_device()` for explicit CPU/CUDA placement without silent fallbacks.

### 3. Tests Executed & Actual Results
- **YAML Validation Command:**
  `python -c "import yaml; cfg = yaml.safe_load(open('ml/configs/hybrid_3dcnn_vit.yaml')); print('Hybrid YAML Valid! Model:', cfg['model']['name'], '| Axis:', cfg['input']['axis_convention'], '| Seed:', cfg['experiment']['random_seed'])"`
  - **Result:** `Hybrid YAML Valid! Model: terraspectra_hybrid_3dcnn_vit | Axis: B_C_D_H_W | Seed: 42`
- **Unit Test Suite Command:**
  `python -m unittest discover -s ml/tests -v`
  - **Result:** `Ran 19 tests in 0.320s` — `OK` (11 tests in `test_input_contract.py` + 8 tests in `test_tensor_shapes.py` passed).

### 4. Files Created / Modified
- **Created:** `ml/configs/hybrid_3dcnn_vit.yaml`
- **Created:** `ml/tests/test_tensor_shapes.py`
- **Modified:** `ml/src/terraspectra_ml/models/input_contract.py`
- **Modified:** `ml/src/terraspectra_ml/models/__init__.py`
- **Modified:** `docs/ml/development-log.md`

### 5. Pending Issues & Next Steps
- Awaiting genuine hyperspectral dataset cube (e.g., EnMAP, PRISMA, AVIRIS, or benchmark `.mat`/`.tif`) from Khushi to populate `spectral_depth` (`D`) and flip `confirmed: true` in `classes.yaml`.
- Next step: Day 6 model foundation / inference contract review upon instruction.

## Day 6 — Research, Model Evaluation & ViT Integration Strategy
**Date:** Monday, 16 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives
- Research and document evaluation metrics appropriate for imbalanced crop stress classification.
- Define a fair baseline-versus-hybrid comparison framework and spatial leakage prevention strategy.
- Design the conceptual 3D-CNN to Vision Transformer (ViT) feature integration, tokenization flow, and attention interpretation guardrails.
- Evaluate predictive uncertainty estimation approaches and select a Week 2 candidate.
- Create `ml/configs/experiment.yaml`, `docs/ml/experiment-plan.md`, and `docs/ml/vit-integration-plan.md`.

### 2. Key Technical Decisions
- **Evaluation Metrics:** Selected **Macro F1-Score** and **Per-Class Recall/Precision** alongside **Confusion Matrix** and **ROC-AUC** as primary metrics, avoiding reliance on overall accuracy under class imbalance.
- **Leakage Prevention:** Mandated group-based (field/scene) or buffered spatial-block splitting (minimum 6-pixel buffer for `13 x 13` patches) with training-only normalization fitting.
- **ViT Integration Design:** Defined `AdaptiveAvgPool3d((4, 5, 5))` tokenization (`25` spatial-spectral tokens of dim `128` + `[CLS]` token) feeding a compact 2-layer, 4-head Transformer Encoder (`E = 128`) suited for 6 GB VRAM.
- **Attention Guardrails:** Documented that self-attention maps are diagnostic aids rather than standalone causal explanations, requiring pairing with spectral attribution (SHAP/Grad-CAM).
- **Uncertainty Recommendation:** Selected **MC-Dropout (`T = 10` passes) + Predictive Entropy** with post-hoc **Temperature Scaling** for Week 2/Phase 3 investigation.

### 3. Files Created / Updated
- **Created:** `docs/ml/experiment-plan.md`
- **Created:** `docs/ml/vit-integration-plan.md`
- **Created:** `ml/configs/experiment.yaml`
- **Updated:** `docs/ml/development-log.md`

### 4. Validation & Checks Performed
- Validated `ml/configs/experiment.yaml` syntax and cross-file references against `data.yaml`, `classes.yaml`, and `hybrid_3dcnn_vit.yaml`.
- Verified no neural network training, fake metrics, or backend/frontend modifications were introduced.

### 5. Pending Questions & Week 2 Decisions
- Final dataset structure, band count `D`, and class label confirmation from Khushi.
- Week 2 ablation comparing spatial-spectral tokenization vs. spectral-band tokenization in the ViT encoder.

## Day 7 — Week 1 Review, Validation & Week 2 Preparation
**Date:** Tuesday, 17 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Week 1 Audit Summary (Days 1–6)
| Day | Planned Scope | Completed Deliverables | Status / Notes |
| :--- | :--- | :--- | :--- |
| **Day 1** | Environment setup, GPU check, repo init | Python 3.11.9 & RTX 3050 (6 GB, CUDA 12.4) verified; `ml/README.md`, `ml/requirements.txt`, `terraspectra_ml/__init__.py`, `.gitignore` committed (`a41f9e8`, `35d4f88`). | **Complete** (Dedicated `.venv` PyTorch wheel install queued for Week 2 start). |
| **Day 2** | Hyperspectral cube & input contract | Defined `[B, 1, D, 13, 13]` `float32` tensor spec, ascending band order, and NoData rules in `data-model-contract.md` and `data.yaml` (`21ef46d`). | **Complete** (Sensor name & `D` remain `null` pending dataset lock). |
| **Day 3** | Prediction task & output contract | Audited local RGB `.jpg` Rice Leaf dataset (rejected as HSI cube); defined provisional binary task (`confirmed: false`) and 4-tier output spec in `classes.yaml`, `model_config.yaml`, `model-specification.md` (`cce150c`). | **Complete** (Final class count `K` awaits verified HSI labels). |
| **Day 4** | 3D-CNN design & input validation | Designed `[8, 16, 32]` 3D-CNN architecture (`3dcnn-architecture.md`), implemented `input_contract.py` & `test_input_contract.py` (11/11 passed) (`e37cc58`). | **Complete** (Full `nn.Module` implementation belongs to Week 2). |
| **Day 5** | Hybrid config & tensor/device tests | Created `hybrid_3dcnn_vit.yaml`, added `resolve_target_device` & `expected_device` checks to `input_contract.py`, created `test_tensor_shapes.py` (19/19 total tests passed) (`0ca7932`). | **Complete** |
| **Day 6** | Evaluation, leakage, ViT & uncertainty | Documented Macro F1 metrics, 4-model comparison ladder, 6-px buffered spatial splits, `AdaptiveAvgPool3d` ViT tokenization, and MC-Dropout uncertainty in `experiment-plan.md`, `vit-integration-plan.md`, `experiment.yaml` (`afd063b`). | **Complete** |

### 2. Consistency & Cross-Team Compatibility Review
- **Internal Consistency:** Verified all 5 YAML configs and 6 markdown specifications share identical tensor axis ordering (`B_C_D_H_W`), channel conventions (`C=1`), patch window (`13x13`), and provisional class schema (`confirmed: false`).
- **Khushi (ML & Data Engineering):** Reviewed Khushi's integration inquiry regarding dataset metadata, licensing, and GIS/tensor alignment. Provided exact `[B, 1, D, 13, 13]` `float32` contract, ascending wavelength requirements, and spatial-block splitting rules.
- **Kanishka (Backend Engineering):** Confirmed 4-tier output handoff (`int16` class map, `float32` confidence/uncertainty rasters, 2-pixel overlap tiling, and preserved affine transform). Awaiting final freeze of `shared/api-schemas/prediction.schema.json`.

### 3. Test Execution Verification (Day 7 Final Run)
- **Command:** `python -m unittest discover -s ml/tests -v`
- **Actual Result:** `Ran 19 tests in 0.579s` — `OK` (0 failures, 0 errors).

### 4. Unresolved Dataset, Architecture & Evaluation Decisions
| Category | Unresolved Question | Why It Matters | Available Info | Missing Info | Owner | Blocks Week 2? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dataset** | Which primary hyperspectral scene/benchmark will be locked? | Determines band count `D`, spatial resolution, and preprocessing parameters. | EnMAP L2A, NASA EMIT, or Indian Pines/Salinas identified as candidates. | Final chosen dataset path, wavelength list, and license entry. | Khushi + Harsh | **Yes** (for real data training; synthetic shape tests unblock Day 8 code). |
| **Labels** | What verified ground-truth labels exist? | Determines output neuron count `K` and whether task is stress vs. land-cover classification. | Provisional 2-class schema (`healthy` vs. `stressed`) in `classes.yaml`. | Verified label mask/CSV and confirmed class count `K`. | Khushi | **Yes** (before final training). |
| **Architecture** | Optimal ViT tokenization (`spatial-spectral` vs. `spectral-band`) & `embed_dim`? | Impacts parameter count, 6 GB VRAM ceiling, and cross-band attention quality. | Candidate `AdaptiveAvgPool3d((4,5,5))` -> `25` tokens of dim `128` designed. | Empirical ablation comparing standalone 3D-CNN vs. ViT hybrid. | Harsh | **No** (Stage 1–4 3D-CNN precedes ViT). |
| **Evaluation** | Exact spatial block coordinates / field group IDs? | Required to enforce zero pixel overlap across train/val/test splits. | 6-pixel minimum spatial buffer rule defined in `experiment.yaml`. | Actual scene dimensions or field boundary polygons. | Khushi + Harsh | **Yes** (before running training splits). |
| **Backend** | Target CRS for Cloud Optimized GeoTIFF (COG) output? | Ensures alignment between ML output rasters, TiTiler, and Deck.gl. | Parent raster CRS + Affine Transform preservation specified. | Agreement on native UTM vs. `EPSG:4326` reprojection. | Kanishka + Ritvik | **No** (for Week 2 model training). |

### 5. Week 2 3D-CNN Implementation Checklist (Do Not Start Today)
- **Stage 1 — Model Foundation:**
  - *Tasks:* Create `ml/.venv` and install PyTorch CUDA 12.4; implement `TerraSpectra3DCNN` base initialization in `ml/src/terraspectra_ml/models/cnn3d.py`; wire `validate_model_input` at forward entry.
  - *Acceptance Criteria:* Instantiates cleanly from `hybrid_3dcnn_vit.yaml` without hardcoded band count `D`.
- **Stage 2 — Feature Extraction:**
  - *Tasks:* Implement Conv Blocks 1–3 (`[8, 16, 32]` channels, spectral stride `2`, `BatchNorm3d`, `GELU`, `Dropout3d(0.1)`) and `AdaptiveAvgPool3d`.
  - *Acceptance Criteria:* Intermediate tensor shapes match `docs/ml/3dcnn-architecture.md` across arbitrary `D >= 16`.
- **Stage 3 — Classification Head:**
  - *Tasks:* Implement linear classification head (`[B, 128] -> [B, K]`) dynamically sized from `classes.yaml` and inference softmax/logit helper.
  - *Acceptance Criteria:* Output logits shape `[B, K]` and probabilities sum to `1.0`.
- **Stage 4 — Testing:**
  - *Tasks:* Add `ml/tests/test_cnn3d_forward.py` verifying forward pass, gradient flow, invalid shape rejection, and absence of `NaN`/`Inf` outputs.
  - *Acceptance Criteria:* All unit tests pass on CPU and CUDA.
- **Stage 5 — Resource Validation:**
  - *Tasks:* Benchmark peak VRAM and batch throughput (`batch_size=32`, `13x13` patches) on NVIDIA RTX 3050 (6 GB VRAM) and verify CPU fallback.
  - *Acceptance Criteria:* Peak VRAM stays safely below 5.0 GB with recorded latency metrics.
- **Stage 6 — ViT Preparation:**
  - *Tasks:* Verify 3D-CNN pooled token output `[B, 25, 128]` and prepare `vit_spectral.py` interface only after standalone 3D-CNN baseline is validated.
  - *Acceptance Criteria:* Clean tensor handoff verified before hybrid assembly.

## Day 8 (Week 2, Day 1) — Finalize 3D-CNN Architecture and Data Contract
**Date:** Wednesday, 18 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering)  
**Branch:** `Harsh`

### 1. Objectives & Cross-Branch Inspection
- Inspected `origin/khushi` (`patch_dataset.py`, `loaders.py`, `tensor-contract.md`, `label-audit.md`) to align the 3D-CNN input contract with Khushi's actual DataLoader output.
- Calibrated model and training configs for the 4 GB VRAM NVIDIA GeForce RTX 3050 Laptop GPU.
- Finalized `ml/configs/model_config.yaml`, `ml/configs/training.yaml`, `ml/src/terraspectra_ml/models/input_contract.py`, and `docs/ml/week2-model-decisions.md`.

### 2. Key Technical Findings & Decisions
- **4D-to-5D Interface Bridge:** Verified Khushi's `PatchDataset` and `create_torch_loader` emit 4D batches `[B, D, H, W]` with default `patch_size=9` and `batch_size=16`. Implemented `adapt_4d_patch_batch_to_5d()` in `input_contract.py` to promote batches to `[B, 1, D, H, W]` and updated default spatial patch size to `9 x 9`.
- **4 GB VRAM Calibration:** Set conservative `batch_size=16`, `9x9` spatial patch window, and `[8, 16, 32]` channels in `model_config.yaml` and `training.yaml`.
- **Label Blocker Verified:** Confirmed via `origin/khushi:docs/dataset/label-audit.md` that verified labels and final band count `D` remain pending.

### 3. Validation & Tests Executed
- Validated YAML syntax for `model_config.yaml` and `training.yaml`.
- Executed updated ML test suite (`test_input_contract.py` + `test_tensor_shapes.py`) covering `9x9` defaults and `adapt_4d_patch_batch_to_5d()`.

## Day 9 (Week 2, Day 2) — Implement Initial 3D-CNN Architecture in PyTorch
**Date:** Thursday, 19 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives & Implementation Completed
- Created isolated virtual environment `ml/.venv` and installed PyTorch `2.6.0+cu124` with verified CUDA support on `NVIDIA GeForce RTX 3050 6GB Laptop GPU`.
- Implemented `Conv3DBlock`, `SpatialSpectral3DExtractor`, `ClassificationHead`, and `TerraSpectra3DCNN` in `ml/src/terraspectra_ml/models/cnn3d.py`.
- Connected `validate_model_input` directly inside `TerraSpectra3DCNN.extract_features()` and exposed `extract_vit_tokens()` (`[B, 25, 128]`) for Week 3 ViT readiness.
- Updated `ml/src/terraspectra_ml/models/__init__.py` and `docs/ml/3dcnn-architecture.md`.

### 2. Automated Tests & GPU Smoke Test Executed
- Created `ml/tests/test_cnn3d.py` covering YAML config loading, `[B, 1, D, 9, 9]` forward pass, 4D->5D DataLoader adapter integration, variable spectral bands (`32, 103, 200`), `[B, 128]` & `[B, 25, 128]` feature outputs, invalid input rejection, and CUDA forward-pass smoke test.
- **Unit Test Command:** `python -m unittest discover -s ml/tests -v`
  - **Actual Result:** `Ran 28 tests in 2.117s` — `OK` (7 tests in `test_cnn3d.py` + 12 in `test_input_contract.py` + 9 in `test_tensor_shapes.py`).
- **CUDA Smoke Command:** `python -c "import sys; sys.path.insert(0, 'ml/src'); import torch; from terraspectra_ml.models import TerraSpectra3DCNN; ..."`
  - **Actual Result:** `Smoke OK | Device: cuda | Params: 24682 | Output: (16, 2) | Peak VRAM: 34.24 MB` on `[16, 1, 128, 9, 9]` `float32` input.

## Day 10 (Week 2, Day 3) — Build a Reproducible PyTorch Training Pipeline
**Date:** Friday, 20 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives & Pipeline Modules Implemented
- **`ml/src/terraspectra_ml/training/engine.py`:** Separated `train_one_epoch()` and `validate_one_epoch()` with strict `model.train()` / `model.eval()` + `@torch.no_grad()` isolation, device transfer, and automatic 4D `[B, D, 9, 9]` to 5D `[B, 1, D, 9, 9]` batch adaptation.
- **`ml/src/terraspectra_ml/training/losses.py`:** Configurable `CrossEntropyLoss` factory (`build_loss_function`) with explicit guardrails against unverified class weights and logits/target shape validation (`compute_classification_loss`).
- **`ml/src/terraspectra_ml/training/train.py` & `__init__.py`:** Implemented `set_reproducibility_seed()`, `build_optimizer()` (`AdamW`/`Adam`), `save_checkpoint()`, `load_checkpoint()`, `run_training()` (saving `resolved_training_config.yaml`, `training_history.json`, best-validation checkpoint, and periodic recovery checkpoints), and `main()` entry point enforcing the dataset blocker until verified `train_loader`/`val_loader` splits are supplied.
- **`ml/configs/training.yaml`:** Structured into `training`, `optimizer`, `loss`, `reproducibility`, `validation`, `checkpointing`, `logging`, and `hardware` sections.

### 2. Automated Tests & Software Smoke Run Executed
- **Unit Test Command:** `python -m unittest discover -s ml/tests -v`
  - **Actual Result:** `Ran 32 tests in 3.167s` — `OK` (4 tests in `test_training.py` + 7 in `test_cnn3d.py` + 12 in `test_input_contract.py` + 9 in `test_tensor_shapes.py` passed).
- **Software Smoke Run (Synthetic Fixtures Only):** Executed 2-epoch training/validation smoke run on synthetic 4D DataLoader batches (`[32, 64, 9, 9]` train, `[16, 64, 9, 9]` val, `batch_size=16`) in an isolated temporary directory.
  - **Actual Result:** `Smoke Run OK | Device: cuda | Epochs: 2 | Best Val Loss: 0.6905 | Peak VRAM MB: 32.97`. (Strictly software verification; makes zero model accuracy claims.)

## Day 11 (Week 2, Day 4) — Model Evaluation, Metrics & Baseline Reporting
**Date:** Saturday, 21 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Branch:** `Harsh`

### 1. Objectives & Modules Implemented
- **`ml/src/terraspectra_ml/evaluation/metrics.py` & `__init__.py`:** Implemented `compute_classification_metrics()` and `analyze_class_distribution()` computing overall Accuracy, Macro/Weighted/Micro Precision, Recall, and F1-score, explicit `(actual_class x predicted_class)` confusion matrices ordered by class ID, per-class metrics with zero-support/zero-prediction warnings, and class imbalance diagnostics.
- **`ml/src/terraspectra_ml/evaluation/reports.py`:** Implemented `build_evaluation_report()`, `render_markdown_report()`, and `export_evaluation_report()` exporting reproducible JSON and Markdown evaluation reports with full experiment metadata and scientific limitations.
- **`ml/scripts/evaluate.py`:** Built CLI and programmatic evaluation entry point (`evaluate_model_on_loader()`, `main()`) enforcing `model.eval()`, `@torch.no_grad()`, and explicit dataset/checkpoint blocker checks until verified labels and trained checkpoints exist.
- **`docs/ml/baseline-evaluation.md`:** Documented the `TerraSpectra3DCNN` baseline comparison invariants and spatial block separation rules ($\ge 4$-pixel buffer margin) to prevent spatial leakage.

### 2. Automated Tests & Real-Evaluation Blocker Check
- **Unit Test Command:** `python -m unittest discover -s ml/tests -v`
  - **Actual Result:** `Ran 38 tests in 9.047s` — `OK` (6 new tests in `test_metrics.py` + 32 existing tests passed).
- **Real Evaluation Status:** Blocked pending verified hyperspectral dataset splits, confirmed labels (`confirmed: true` in `ml/configs/classes.yaml`), and a trained model checkpoint; no fabricated baseline accuracy was generated.

## Day 12 (Week 2, Day 5) — Integrate the Hyperspectral Data Pipeline with the 3D-CNN
**Date:** Sunday, 22 November 2026  
**Engineer:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering)  
**Branch:** `Harsh`

### 1. Objectives & Integration Performed
- Fetched and inspected Khushi's latest Week 2 data pipeline commits on `origin/khushi` (`f032914`: `preprocessing.py`, `patch_dataset.py`, `loaders.py`, `spatial_split.py`, and `ml/configs/data.yaml`).
- Built `ml/tests/test_data_model_integration.py` executing Khushi's actual `extract_patches()`, `spatial_group_split()`, `StandardNormalizer`, `PatchDataset`, and `make_dataloader()` end-to-end into `adapt_4d_patch_batch_to_5d()`, `TerraSpectra3DCNN`, `CrossEntropyLoss`, `AdamW`, `train_one_epoch()`, `validate_one_epoch()`, and `evaluate_model_on_loader()`.
- Verified compatibility for both `9 x 9` patches and `16 x 16` patches (`data.yaml` `patch.size: 16`).
- Authored `docs/ml/week2-integration-report.md` documenting verified integration stages, data contract findings, and pending real-dataset blockers.

### 2. Automated Tests & GPU Smoke Results
- **Test Command:** `python -m unittest discover -s ml/tests -v`
  - **Actual Result:** `Ran 40 tests in 25.281s` — `OK` (all unit and end-to-end integration tests passed).
- **GPU Integration Smoke Check:**
  - **Actual Result:** `Integration GPU Smoke OK | Device: cuda | Train Loss: 0.6916 | Peak VRAM MB: 27.69` on `NVIDIA GeForce RTX 3050 Laptop GPU`.
- **Blocker:** Real hyperspectral dataset cube and confirmed ground-truth labels remain `UNCONFIRMED` in `data.yaml` / `classes.yaml`; synthetic cubes were used strictly to validate software integration.
