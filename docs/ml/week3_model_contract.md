# TerraSpectra — Week 3 Vision Transformer & Hybrid Model Contract (Day 15)

**Version:** 1.0.0  
**Date:** November 24, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Collaborator:** Khushi (ML & Data Engineering, branch `origin/khushi` @ `f032914`)  
**Branch:** `Harsh`

---

## 1. Environment & Week 2 Baseline Verification
- **Environment Verified:** `Python 3.11.9`, `PyTorch` with CUDA enabled on `NVIDIA GeForce RTX 3050 Laptop GPU (4 GB VRAM)`.
- **Week 2 3D-CNN Smoke & Unit Suite:** `python -m unittest discover -s ml/tests -v` $\rightarrow$ **`Ran 41 tests in 8.128s` — `OK`** (0 failures, 0 errors).
- **Week 2 Baseline Summary:**
  - **Model:** `TerraSpectra3DCNN` (`24,682` parameters, `96.41 KB` in `float32`).
  - **Dataset & Labels:** Provisional `classes.yaml` (`{0: "healthy", 1: "stressed"}`, `confirmed: false`); real hyperspectral cube path and usable band indices remain `UNCONFIRMED` in `ml/configs/data.yaml`.
  - **Trained Checkpoints:** None exist yet because real training is blocked on verified hyperspectral data and labels; zero fabricated metrics or accuracy claims are reported.

---

## 2. Verified Hyperspectral Data Contract

| Attribute | Verified Value / Format | Source | Status |
| :--- | :--- | :--- | :---: |
| **Raw DataLoader Output** | Tuple `(patches: torch.float32 [B, D, H, W], labels: torch.int64 [B])` | `origin/khushi:ml/src/terraspectra_ml/data/loaders.py` (`make_dataloader`) | **Verified** |
| **3D-CNN Model Input** | 5D Tensor `[B, C=1, D, H, W]`, `torch.float32`, finite values | `ml/src/terraspectra_ml/models/input_contract.py` (`adapt_4d_patch_batch_to_5d`) | **Verified** |
| **Spectral Band Count (`D`)** | Variable `D >= 8` supported by architecture (`32`, `48`, `64` tested) | `ml/configs/data.yaml` (`bands.indices: null`) | **NEEDS CONFIRMATION (Khushi)** |
| **Spatial Patch Size (`H, W`)** | `9 x 9` (`patch_dataset.py` default) vs. `16 x 16` (`data.yaml` `patch.size: 16`) | `patch_dataset.py` vs. `ml/configs/data.yaml` | **NEEDS CONFIRMATION (Khushi)** |
| **Normalization** | Channel-wise z-score (`StandardNormalizer`) fitted strictly on finite training pixels | `origin/khushi:ml/src/terraspectra_ml/data/preprocessing.py` | **Verified** |
| **NoData Policy** | Non-finite (`NaN`/`Inf`) pixels masked during normalizer fit; rejected before model forward | `preprocessing.py` + `input_contract.py` | **Verified** |
| **Class Mapping** | `{0: "healthy", 1: "stressed"}` (`num_classes: 2`) | `ml/configs/classes.yaml` (`confirmed: false`) | **NEEDS CONFIRMATION (Khushi)** |

---

## 3. Selected ViT Input Strategy & Justification

### 3.1 Selected Strategy: Hybrid 3D-CNN Spatial-Spectral Tokenizer -> Lightweight ViT Encoder
Rather than feeding raw `D`-band hyperspectral cubes directly into a pure ViT patchifier (which would tie input projection weights to an unconfirmed band count `D` and overfit small agricultural datasets), TerraSpectra uses **`SpatialSpectral3DExtractor.extract_vit_tokens(x)`** as the front-end tokenizer:
1. **Spectral-Band Agnostic Front-End:** The 3D-CNN backbone collapses arbitrary spectral depth `D >= 8` via adaptive spectral pooling while preserving a `5 x 5` spatial grid of `128`-dimensional spatial-spectral embeddings, outputting `[B, 25, 128]` (`float32`, LayerNorm-normalized).
2. **Token & Positional Representation:** Prepend a learnable `[CLS]` token (`[B, 26, 128]`) and add learnable 2D spatial positional embeddings (`[1, 26, 128]`).
3. **Hardware Realism (RTX 3050 4 GB VRAM):** A 2-layer, 4-head Transformer encoder at `embed_dim=128` (`mlp_ratio=2.0`) adds ~`265K` parameters (~`1.05 MB` in `float32`) and keeps sequence length fixed at `26` tokens, avoiding quadratic attention memory spikes.

---

## 4. Defined CNN–ViT Hybrid Interface
- **Input Tensor (`x`):** `[B, 1, D, H, W]` (`torch.float32`, finite).
- **CNN Feature Branch (`model.extract_features(x)`):** `[B, 128]` pooled spatial-spectral summary vector.
- **CNN Token Interface (`model.extract_vit_tokens(x)`):** `[B, 25, 128]` spatial-spectral token sequence (`ViTTokenContract`).
- **ViT Encoder Output (`vit(tokens)`):** `[B, 128]` global self-attention context embedding (`[CLS]` token output after final LayerNorm).
- **Planned Week 3 Fusion & Head:** Concatenate or gated-fuse CNN global features (`[B, 128]`) and ViT context features (`[B, 128]`) $\rightarrow$ `Linear(256, 128) + GELU + Dropout + Linear(128, num_classes)` emitting raw logits `[B, K]` compatible with `nn.CrossEntropyLoss` and Day 11 `compute_classification_metrics()`.

---

## 5. Unresolved Questions Requiring Khushi's Confirmation
1. **Exact Hyperspectral Scene & Sensor (`data.yaml`):** What is the confirmed dataset identifier, file path, and radiometric scale?
2. **Final Spectral Band Indices (`D`):** Which exact band indices/wavelengths remain after water-absorption/bad-band removal?
3. **Final Patch Size (`9 x 9` vs. `16 x 16`):** Should we standardize on `patch.size: 16` (`data.yaml`) or `patch_size: 9` (`patch_dataset.py`), and what `buffer_pixels` margin (`>= 8` vs. `>= 4`) is locked for spatial splitting?
4. **Verified Ground-Truth Class Labels (`classes.yaml`):** Are the target classes binary (`healthy` vs. `stressed`) or multi-class stress/disease categories, and when will `confirmed: true` be set?
