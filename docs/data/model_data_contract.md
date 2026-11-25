# TerraSpectra Week 3 Model-Data Contract

Date: 25 November 2026
Owner: Khushi Tyagi
Status: PROPOSED - AWAITING HARSH CONFIRMATION

## 1. Current proposed input convention

| Field | Proposed convention | Status |
|---|---|---|
| Input image | Bands, rows, columns | Proposed |
| Batch layout | N, C, H, W | Proposed |
| Data type | float32 | Proposed |
| Patch size | 16 x 16 | Existing config |
| Patch stride | 8 | Existing config |
| Normalization | Standard | Existing config |
| PCA | 10 components, enabled | Existing config |
| NoData | Mask invalid pixels | Existing config |
| Label semantics | UNCONFIRMED | Pending |

## 2. Confirmation required from Harsh

- Exact ViT input tensor layout.
- Exact hybrid-model input layout.
- Required patch dimensions.
- Expected band selection and ordering.
- Wavelength units and metadata requirements.
- Normalization method and expected value range.
- Whether PCA is compatible with both model inputs.
- Label encoding and class mapping.
- Expected batch output and data types.
- Required sample metadata.

## 3. Current configuration observations

Source identifier: UNCONFIRMED
Dataset path: null
Dataset license: UNCONFIRMED
Acquisition date: null
Band indices: null
Wavelength metadata: null
Label semantics: UNCONFIRMED
Harsh confirmation: false

The existing NCHW convention is proposed, not an approved
model integration interface.

## 4. Scientific safeguards

- Do not invent labels or label mappings.
- Preserve source CRS and affine transform.
- Preserve ordered wavelength metadata.
- Fit normalization and PCA on training data only.
- Reuse fitted transformations on validation and test data.
- Do not silently reshape tensors or remove bands.
- Do not claim real-scene validation without a real scene.

## 5. Integration approval

Harsh confirmation: PENDING
Confirmation date: PENDING
ViT input contract: PENDING
Hybrid input contract: PENDING

Update this document only after the model owner confirms
the actual interface.
