# TerraSpectra Week 3 - Day 2 Reliability Report

Date: 25 November 2026
Owner: Khushi Tyagi
Branch: khushi

## 1. Objective

Improve reliability of the existing preprocessing and patch
dataset components without changing the proposed model contract.

## 2. Implemented improvements

### Standard normalization
- Reject empty training dimensions.
- Validate fitted channel count.
- Validate saved normalization parameters.
- Preserve non-finite pixel positions.
- Keep constant-channel handling stable.
- Preserve float32 transformed output.

### Spectral normalization
- Validate non-empty 2D input.
- Reject non-finite spectral values.
- Preserve feature-count validation.
- Preserve float32 transformed output.

### Patch extraction
- Validate image dimensions.
- Validate patch size and stride.
- Preserve band-first patch layout.
- Preserve patch pixel locations.
- Preserve existing metadata extraction interface.

### Invalid patch filtering
- Validate patch dimensions.
- Validate invalid-pixel threshold.
- Return the retained patch mask.
- Preserve empty-batch handling.

### PatchDataset
- Validate NCHW layout.
- Validate patch dimensions.
- Validate label and metadata counts.

## 3. Scientific safeguards

- No synthetic dataset was introduced.
- No labels or class mappings were invented.
- No sensor metadata was fabricated.
- No model input contract was declared approved.
- Training-only normalization policy remains unchanged.
- Real-scene validation remains pending.

## 4. Automated validation

New regression tests:
`ml/tests/test_day2_reliability.py`

Existing regression tests are also included in the
full ML test suite.

Test counts and outcomes must be recorded from the
actual execution output.

## 5. Pending work

- Confirm ViT and hybrid model input contracts with Harsh.
- Obtain the selected licensed hyperspectral scene.
- Verify actual band order and wavelength metadata.
- Run the pipeline against the real scene.
- Confirm normalization and PCA compatibility.

## 6. Conclusion

Day 2 focuses on software-level preprocessing reliability.

Passing automated tests does not establish real-scene
scientific validation or model integration approval.

## Test verification — 25 November 2026

- Day 2 reliability tests: 17 passed.
- Complete test suite: 59 passed, 2 skipped.
- Complete suite executed with `PYTHONPATH=.;ml/src`.
