# TerraSpectra Week 3 - Day 1 Audit

Date: 25 November 2026
Owner: Khushi Tyagi
Branch: khushi

## 1. Git and repository status

- Active branch: khushi
- Remote tracking branch: origin/khushi
- Previous latest commit: cc33817
- Existing Week 2 backup directories were preserved.
- No unrelated files were staged.

## 2. Week 2 pipeline implementation audit

The repository contains:

- Raster metadata inspection and windowed reading.
- Band-first patch extraction.
- Invalid-patch filtering.
- Standard and spectral normalization interfaces.
- PCA implementation.
- Optional PyTorch DataLoader interface.
- Tiled raster preparation and patch shards.
- CSV patch manifest generation.
- Spatial row-band splitting.
- CSV label completeness and duplicate-ID audit.

Relevant implementation files:

- ml/scripts/inspect_scene.py
- ml/scripts/prepare_dataset.py
- ml/scripts/audit_labels.py
- ml/configs/data.yaml
- ml/configs/preprocessing.yaml
- ml/configs/baseline.yaml

## 3. Configuration audit

Data source: UNCONFIRMED
Dataset path: null
License: UNCONFIRMED
Acquisition date: null
Band indices: null
Wavelengths: null
Patch size: 16
Patch stride: 8
Invalid fraction threshold: 0.20
NoData policy: mask
Proposed tensor layout: NCHW
Data type: float32
Label semantics: UNCONFIRMED
Harsh approval: false

Preprocessing configuration:

- Standard normalization.
- Training-only fitting.
- Saved normalization parameters.
- PCA enabled with 10 components.
- PCA fitting restricted to training data.

The preprocessing settings require validation against
the selected real dataset and the confirmed model contract.

## 4. Dataset and scene inspection

The repository data directory contained no dataset files
in the audited inventory.

Consequently, the following could not be measured:

- Actual scene dimensions.
- Actual sensor and acquisition metadata.
- Band count and wavelength values.
- Spatial resolution.
- Coordinate reference system.
- NoData distribution.

Real-scene inspection remains pending data access.

## 5. Label audit

The existing label audit checks:

- Missing labels.
- Unique classes.
- Class distribution.
- Duplicate sample IDs.

Label provenance, licensing, class meaning and geographic
alignment remain external verification requirements.

No labels have been invented or certified.

## 6. Model-data integration

The tensor contract currently proposes NCHW and float32.

Harsh has not yet confirmed:

- ViT input dimensions.
- Hybrid-model input dimensions.
- Band ordering.
- Patch requirements.
- Normalization requirements.
- Label mapping.
- Metadata requirements.

Therefore, the contract remains proposed.

## 7. Previous Week 2 validation evidence

The existing Week 2 report records:

- 43 tests passed.
- 1 test skipped.
- The skipped test concerns the missing-PyTorch error path.

This is historical Week 2 evidence, not a new Day 1 test result.

## 8. Day 1 pending items

1. Obtain the selected licensed hyperspectral scene.
2. Confirm sensor and acquisition metadata.
3. Confirm model input contract with Harsh.
4. Run inspection against the real scene.
5. Execute the pipeline using the agreed configuration.
6. Record any unresolved assumptions.

## 9. Day 1 conclusion

The Week 2 software pipeline and documentation are present.

However, real-scene validation and model-data contract
approval remain pending.

No scientific readiness or model performance claim
is made from this repository audit alone.
