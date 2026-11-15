# TerraSpectra — Week 1 Final Audit

## 1. Repository

- Current branch: khushi

## 2. Dataset inventory

- Raster files found: 0
- CSV files found: 0
- REAL RASTER VALIDATION: BLOCKED — no supported raster file found.

## 3. Raster quality validation

- Pending: obtain an authentic rice hyperspectral raster and its source/license details.

## 4. CSV and label inventory

- No CSV dataset found. Label verification remains pending.

## 5. Documentation files

- FOUND: docs/dataset/tensor-contract.md (31 lines)
- FOUND: docs/dataset/gis-handoff.md (37 lines)
- FOUND: docs/dataset/label-audit.md (26 lines)
- FOUND: docs/dataset/preprocessing-spec.md (12 lines)
- FOUND: ml/README.md (86 lines)
- Tensor contract and GIS handoff still require team confirmation.
- Dataset provenance and label correctness require source-level verification.

## 6. ML script command interfaces


### ml/scripts/inspect_scene.py
- Help command exit code: 0
```text
usage: inspect_scene.py [-h] [--output OUTPUT] [--window-size WINDOW_SIZE]
                        scene

positional arguments:
  scene                 Path to raster scene

options:
  -h, --help            show this help message and exit
  --output OUTPUT
  --window-size WINDOW_SIZE
```

### ml/scripts/prepare_dataset.py
- Help command exit code: 0
```text
usage: prepare_dataset.py [-h] [--output OUTPUT] [--window-size WINDOW_SIZE]
                          scene

positional arguments:
  scene

options:
  -h, --help            show this help message and exit
  --output OUTPUT
  --window-size WINDOW_SIZE
```

## 7. ML test suite

- Test command exit code: 0
```text

test_dataset_metadata_access (test_patch_dataset.TestPatchDataset.test_dataset_metadata_access) ... ok
test_dataset_with_labels (test_patch_dataset.TestPatchDataset.test_dataset_with_labels) ... ok
test_dataset_without_labels (test_patch_dataset.TestPatchDataset.test_dataset_without_labels) ... ok
test_invalid_patch_size (test_patch_dataset.TestPatchDataset.test_invalid_patch_size) ... ok
test_metadata_count_must_match (test_patch_dataset.TestPatchDataset.test_metadata_count_must_match) ... ok
test_patch_count (test_patch_dataset.TestPatchDataset.test_patch_count) ... ok
test_patch_metadata_positions_and_transform (test_patch_dataset.TestPatchDataset.test_patch_metadata_positions_and_transform) ... ok
test_fit_transform (test_preprocessing.TestPreprocessing.test_fit_transform) ... ok
test_nonfinite_rejected (test_preprocessing.TestPreprocessing.test_nonfinite_rejected) ... ok
test_transform_before_fit (test_preprocessing.TestPreprocessing.test_transform_before_fit) ... ok
test_constant_band_reported (test_quality_checks.TestQualityChecks.test_constant_band_reported) ... ok
test_empty_band_detected (test_quality_checks.TestQualityChecks.test_empty_band_detected) ... ok
test_integer_masked_array_handles_nodata (test_quality_checks.TestQualityChecks.test_integer_masked_array_handles_nodata) ... ok
test_missing_required_crs_invalid (test_quality_checks.TestQualityChecks.test_missing_required_crs_invalid) ... ok
test_valid_array (test_quality_checks.TestQualityChecks.test_valid_array) ... ok
test_windowed_file_validation (test_quality_checks.TestQualityChecks.test_windowed_file_validation) ... ok
test_wrong_dimensions (test_quality_checks.TestQualityChecks.test_wrong_dimensions) ... ok
test_inspect_metadata (test_raster_reader.TestRasterReader.test_inspect_metadata) ... ok
test_missing_file (test_raster_reader.TestRasterReader.test_missing_file) ... ok
test_read_all_bands (test_raster_reader.TestRasterReader.test_read_all_bands) ... ok
test_read_window (test_raster_reader.TestRasterReader.test_read_window) ... ok
test_groups_do_not_overlap (test_spatial_split.TestSpatialSplit.test_groups_do_not_overlap) ... ok
test_invalid_fractions (test_spatial_split.TestSpatialSplit.test_invalid_fractions) ... ok

----------------------------------------------------------------------
Ran 23 tests in 0.152s

OK

```

## 8. Git audit

- git diff --check exit code: 0
```text
warning: in the working copy of 'ml/scripts/inspect_scene.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'ml/scripts/prepare_dataset.py', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'ml/src/terraspectra_ml/data/raster_reader.py', LF will be replaced by CRLF the next time Git touches it

```
- Diff summary:
```text
 ml/scripts/inspect_scene.py                   |  20 ++--
 ml/scripts/prepare_dataset.py                 |  16 +--
 ml/src/terraspectra_ml/data/patch_dataset.py  | 136 +++++++++++++++++++-----
 ml/src/terraspectra_ml/data/quality_checks.py | 143 +++++++++++++++++++++++---
 ml/src/terraspectra_ml/data/raster_reader.py  |  49 +++++++--
 ml/tests/test_patch_dataset.py                |  36 ++++++-
 ml/tests/test_quality_checks.py               |  54 +++++++++-
 7 files changed, 377 insertions(+), 77 deletions(-)

```
- Working tree:
```text
 M ml/scripts/inspect_scene.py
 M ml/scripts/prepare_dataset.py
 M ml/src/terraspectra_ml/data/patch_dataset.py
 M ml/src/terraspectra_ml/data/quality_checks.py
 M ml/src/terraspectra_ml/data/raster_reader.py
 M ml/tests/test_patch_dataset.py
 M ml/tests/test_quality_checks.py

```

## 9. Week 1 completion status

- Automated tests: PASS
- Git whitespace check: PASS
- Real satellite data validation: PENDING
- Dataset source/license verification: PENDING
- Label authenticity and geographic alignment: PENDING
- Team tensor/GIS contract confirmation: PENDING
- Git commit and push: NOT PERFORMED


## Final Verification - 15 November 2026

- Automated unit tests: 23 passed, 0 failed.
- Integer raster NoData smoke test: passed.
- Masked NoData pixels are excluded from non-finite pixel counts.
- Python compile check: passed.
- Git whitespace check: passed.
- Current working branch: khushi.
- Actual satellite raster validation: pending, because no raster dataset is currently available in the repository.
- Dataset source/license verification and label/geographic alignment: pending.
- GIS/tensor handoff confirmation: pending.
- No claim of complete real-world satellite data validation is made.
