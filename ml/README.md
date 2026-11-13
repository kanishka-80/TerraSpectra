# TerraSpectra - ML & Data Engineering

## Objective
Build a reproducible hyperspectral data pipeline for crop stress
intelligence and disease-risk forecasting.

## Week 1 modules
- Raster metadata inspection and windowed reading
- Data quality checks
- Spectral normalization
- Optional PCA
- Spatial patch extraction
- Dataset interface
- Spatial group splitting
- Label audit and readiness reporting

## Candidate data sources
1. EnMAP
2. PRISMA
3. NASA EMIT
4. AVIRIS / AVIRIS-NG

## Setup
Install dependencies from the repository root:

```bash
python -m pip install -r ml/requirements.txt
```

## Inspect a real scene

```bash
python ml/scripts/inspect_scene.py path/to/scene.tif
```

## Run a quality audit

```bash
python ml/scripts/prepare_dataset.py path/to/scene.tif
```

## Run tests

```bash
PYTHONPATH=ml/src python -m unittest discover -s ml/tests -v
```

## Scientific safeguards
- Do not fabricate disease labels.
- Do not assume every hyperspectral raster contains disease labels.
- Fit normalization and PCA on training data only.
- Keep spatial groups separate across train, validation and test sets.
- Do not commit raw satellite scenes, credentials or large model artifacts.

See `docs/dataset/` for inspection, preprocessing and label-audit records.
