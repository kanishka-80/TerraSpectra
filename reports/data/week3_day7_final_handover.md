# TerraSpectra — Week 3 Final Handover

Date: 26 November 2026
Owner: Khushi Tyagi
Branch: khushi
Status: SOFTWARE VALIDATION COMPLETE; MODEL/DATA APPROVAL PENDING

## 1. Week 3 work summary

Week 3 focused on strengthening the ML data pipeline and validating
preprocessing behavior.

Completed work includes:

- Dataset and patch validation improvements.
- Spatial and patch validation checks.
- Controlled preprocessing comparison.
- Training-only preprocessing and PCA safeguards.
- PatchDataset and DataLoader integration.
- Preprocessing and PCA reliability tests.
- Documentation of the proposed model-data contract.

## 2. Key implementation areas

### Data pipeline

- PatchDataset validation.
- DataLoader support for PatchDataset and NumPy arrays.
- Input dimensions and sample validation.
- Reproducible DataLoader shuffle behavior.

### Preprocessing

- StandardNormalizer channel-wise normalization.
- SpectralNormalizer feature-wise normalization.
- Training-only fitting safeguards.
- Reuse of fitted parameters on held-out data.
- Saving and loading normalization parameters.

### Dimensionality reduction

- SpectralPCA implementation.
- Training-only PCA fitting.
- Validation and test transformation using the fitted PCA model.
- Feature-count and finite-value validation.

## 3. Verification history

Recorded project test results:

- Day 5 full ML suite: 81 passed, 9 skipped.
- Day 6 focused tests: 10 passed.
- Day 6 regression tests: 35 passed, 7 skipped.
- Day 6 full project suite: 91 passed, 9 skipped.

The Day 7 final audit performs another full test run.
Its actual result must be read from the terminal output.

## 4. Experiment limitations

The controlled preprocessing experiment used deterministic synthetic
software smoke-test data.

It compared StandardScaler and RobustScaler and fitted PCA using
training data only.

These results verify software behavior only. They do not establish
real-scene performance or scientific model quality.

## 5. Pending external confirmations

The following remain pending:

- Approved real dataset source and license.
- Dataset path and acquisition metadata.
- Confirmed band selection and wavelength metadata.
- Confirmed label semantics and class mapping.
- Harsh's confirmation of ViT input requirements.
- Harsh's confirmation of hybrid-model input requirements.
- Approval of patch dimensions and preprocessing compatibility.
- Approved model-data integration interface.

The existing model-data contract is proposed, not approved.

## 6. Scientific safeguards

- No invented labels or class mappings.
- No unsupported real-scene claims.
- No silent band removal or tensor reshaping.
- Normalization and PCA fit on training data only.
- Fitted transformations reused on validation and test data.
- Dataset provenance and model input assumptions remain explicit.

## 7. Week 4 readiness

The software data-pipeline foundation is available for the next phase.

Model integration and real-data validation must begin only after
the required dataset and model-owner confirmations are received.

## 8. Final status

Week 3 software implementation and reliability documentation are
handed over for review.

External data approval and model integration remain open dependencies.
