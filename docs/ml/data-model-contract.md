# TerraSpectra — ML Data & Model Input Specification Contract

**Version:** 1.0.0  
**Date:** November 12, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Stakeholders:** Khushi (ML & Data Engineering), Kanishka (Backend Engineering)

---

## 1. Executive Summary & Purpose
This document establishes the technical contract between the **Geospatial Preprocessing Pipeline** (Khushi), the **Machine Learning Core** (Harsh), and the **Backend Inference Service** (Kanishka). It specifies the tensor layouts, geospatial constraints, band ordering, and validation rules required to process hyperspectral imagery through the 3D-CNN + ViT hybrid model without silent geospatial misalignment or feature distortion.

---

## 2. Hyperspectral Cube Representation
A hyperspectral scene is represented as a contiguous volumetric array:
- **Raw Spatial Grid:** `[Height, Width]` corresponding to geographic coordinates via an Affine Transform matrix.
- **Spectral Depth:** `[Bands]` contiguous narrow spectral intervals (typically 400 nm to 2500 nm).
- **Physical Signature:** Each spatial coordinate `(x, y)` forms a continuous spectral reflectance vector $\rho(\lambda) \in [0.0, 1.0]$.

---

## 3. Band Ordering & Wavelength Registration
- **Ascending Wavelength Invariant:** Bands must be strictly ordered by ascending central wavelength ($\lambda_1 < \lambda_2 < \dots < \lambda_D$).
- **Spectral Resolution:** FWHM (Full Width at Half Maximum) metadata must accompany band definitions where available.
- **Atmospheric Absorption Exclusion:** Preprocessing must purge standard zero-transmittance water-vapor absorption bands (approx. 1350–1420 nm and 1800–1950 nm) consistently before passing arrays to the model.
- **Impact of Reordering:** Because 3D-CNN kernels convolve across adjacent spectral layers, any permutation or inconsistent band dropping destroys the continuous physical spectral derivative $\frac{\partial \rho}{\partial \lambda}$ and invalidates learned kernel weights.

---

## 4. Proposed 3D-CNN Input Tensor Specification

### 5D Tensor Layout: `[Batch, Channels, Depth, Height, Width]` (`[B, C, D, H, W]`)
PyTorch's `nn.Conv3d` requires five-dimensional inputs `(N, C_{in}, D, H, W)`:

| Dimension | Symbol | Type | Description |
| :--- | :---: | :---: | :--- |
| **Batch** | `B` | `int` | Number of spatial patches processed simultaneously (default: 32 or 64). |
| **Channels** | `C` | `int` | Scalar field dimension. Strictly **`C = 1`** (reflectance magnitude). |
| **Depth** | `D` | `int` | Number of active, clean spectral bands (e.g., 200–224 bands depending on sensor). |
| **Height** | `H` | `int` | Spatial patch height (e.g., 11, 13, or 15 pixels). |
| **Width** | `W` | `int` | Spatial patch width (equal to `H`). |

- **Data Type:** `torch.float32`.
- **Value Range:** Normalized surface reflectance in $[0.0, 1.0]$.
- **Patch Extraction:** Centered around the target prediction pixel $(H/2, W/2)$ to provide spatial context without cross-boundary leakage.

---

## 5. Normalization Standards
- **Reflectance Scaling:** Raw Digital Numbers (DN) must be converted to Top-of-Canopy (TOC) Surface Reflectance $\in [0.0, 1.0]$ using sensor-specific scale factors (e.g., scale factor $0.0001$).
- **Per-Patch vs Global Normalization:**
  - Standard training pipeline utilizes min-max or global band-wise mean/standard deviation normalization calculated strictly across training splits.
  - Patch-wise normalization must preserve relative band amplitudes to avoid flattening diagnostic absorption valleys (e.g., chlorophyll red-edge and water dips).

---

## 6. NoData, Invalid Pixels & Masking Strategy

1. **Raster NoData Values (e.g., -9999, 65535):**
   - Must be flagged into a binary valid-pixel mask (`valid_mask = (raw != nodata)`).
   - Patches containing NoData at the center pixel must be excluded from training and inference.
2. **NaN and Infinite Values:**
   - Any patch containing `NaN` or `Inf` within the spatial extent is rejected during training.
   - For inference tiling, background NaN areas must have model inference bypassed, setting prediction class to `0` (Unclassified/Background) and uncertainty to `1.0`.
3. **Cloud & Shadow Contamination:**
   - QA flags (e.g., cloud mask bands) must suppress stress predictions. Cloud-covered pixels must not generate false stress alarms.

---

## 7. Geospatial Metadata Preservation
To enable seamless raster reconstruction:
- Every processed patch or tiled batch must maintain its parent scene's:
  - **CRS (Coordinate Reference System):** e.g., `EPSG:4326` or UTM zone.
  - **Affine Transform:** Mapping pixel `(row, col)` to geographic coordinates.
  - **Original Dimensions:** `(Height, Width)` for full-scene stitching.

---

## 8. Coordination Handshakes

### Khushi (ML & Data Engineering)
- Preprocessing scripts must emit arrays directly conforming to `[B, 1, D, H, W]` in `float32`.
- Store band wavelength arrays alongside preprocessed tensors.
- Document training/validation splits with spatial separation (field-level or tile-level) to prevent spatial autocorrelation leakage.

### Kanishka (Backend Engineering)
- Backend inference workers will slice incoming rasters into overlapping spatial tiles `(H_{tile}, W_{tile})` with a 2-pixel margin.
- Backend passes tiled arrays to `terraspectra_ml.inference.predict()`.
- ML model returns `[H_{tile}, W_{tile}]` prediction class logits and uncertainty maps.
- Backend handles final georeferenced Cloud Optimized GeoTIFF (COG) assembly using the preserved affine transform.
