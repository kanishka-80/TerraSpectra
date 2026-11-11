# TerraSpectra

Agricultural monitoring research project focused on
hyperspectral data analysis and Machine Learning.

## Phase 1 - ML Foundation

### Completed
- Initial ML planning documentation.
- Hyperspectral dataset evaluation framework.
- Python dataset inventory utility.
- CSV quality and missing-value audit.
- Automated unit tests (2 tests passed).

## Dataset Audit Features
- File inventory and size information.
- CSV column inspection.
- Row counting.
- Missing-value detection.
- JSON report generation.

## Run Dataset Audit

python -m src.terraspectra.dataset_audit path/to/dataset

## Run Tests

python -m unittest discover -s tests -v

## Project Structure

- docs/
- src/terraspectra/
- tests/
- README.md

## Pending Work
- Public hyperspectral dataset verification.
- Raster metadata validation.
- Spectral preprocessing.
- Baseline ML experiments.
- Model evaluation and explainability.

## Current Status
Initial ML foundation and CSV audit utility implemented.
Further dataset validation and ML experiments are pending.
