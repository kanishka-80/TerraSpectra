# Week 3 Day 6 — Preprocessing and PCA Reliability

## Objective

Validate the reliability of the existing normalization and dimensionality
reduction components before any model-training integration.

## Scope

- StandardNormalizer training-only fitting behavior.
- Reuse of fitted normalization parameters on validation and test data.
- Saving and loading fitted normalization parameters.
- SpectralPCA training-only fitting behavior.
- Reuse of the fitted PCA transformation on held-out samples.
- Preservation of sample counts and output dimensions.
- Rejection of incompatible and non-finite PCA inputs.

## Validation approach

Deterministic test fixtures are used to verify software behavior.
Validation and test arrays are deliberately modified after fitting to
check that fitted training parameters do not change.

The tests do not fit preprocessing transformations on validation or test
data.

## Scientific and data safeguards

- No model architecture or model-training pipeline was invented.
- No dataset labels or class mappings were assumed.
- No real-scene performance claim is made.
- No dataset source, band selection, or study-area configuration was changed.
- The proposed data/model contract remains subject to team confirmation.

## Limitations

The tests use deterministic synthetic software fixtures. They verify
implementation behavior only; they are not scientific evidence or
real hyperspectral dataset validation.

Actual model integration remains pending confirmation of the model input
contract and approved dataset information.

## Expected outcome

All focused Day 6 tests and the existing full test suite should pass.
