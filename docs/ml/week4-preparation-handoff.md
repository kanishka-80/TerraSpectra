# TerraSpectra — Week 4 ML Preparation and Handover

Date: 26 November 2026
Owner: Khushi Tyagi
Working branch: khushi

## 1. Starting point

Week 3 established and tested the data-processing foundation:

- PatchDataset and DataLoader integration.
- Preprocessing and normalization utilities.
- PCA transformation.
- Spatial and patch validation.
- Automated reliability tests.
- Proposed model-data contract.

## 2. Week 4 priorities

### Priority 1 — Confirm the data contract

Obtain confirmation from the model owner for:

- ViT input tensor layout.
- Hybrid-model input tensor layout.
- Required patch dimensions.
- Band selection and ordering.
- Wavelength metadata and units.
- Normalization and value range.
- PCA compatibility.
- Label encoding and class mapping.
- Batch output and metadata requirements.

### Priority 2 — Confirm the dataset

Obtain:

- Dataset source and license.
- Dataset version and path.
- Acquisition metadata.
- Study-area information.
- Band metadata.
- Label documentation.
- Approved train, validation and test splits.

### Priority 3 — Integration planning

After confirmation:

- Map the approved model inputs to the existing DataLoader.
- Validate tensor shapes and data types.
- Verify preprocessing compatibility.
- Add integration tests.
- Record any required changes before implementation.

### Priority 4 — Real-data validation

Only after approved data is available:

- Run dataset quality checks.
- Verify patch and label alignment.
- Check spatial split integrity.
- Run preprocessing on approved data.
- Record provenance and experiment configuration.

## 3. Acceptance criteria

Week 4 integration should not be marked complete until:

- Model input requirements are documented and approved.
- Dataset provenance is recorded.
- Tensor layout and dimensions match the model contract.
- Label mapping is confirmed.
- Training-only fitting safeguards are preserved.
- Automated tests pass.
- Results are reproducible and documented.

## 4. Constraints

- Do not invent a model architecture.
- Do not invent labels or class mappings.
- Do not treat synthetic smoke tests as real-data validation.
- Do not claim model training or model integration without evidence.
- Keep work on the assigned `khushi` branch.

## 5. Initial status

Software data-pipeline foundation: available.

Real dataset approval: pending.

Model-owner confirmation: pending.

Model integration: not yet approved to begin.
