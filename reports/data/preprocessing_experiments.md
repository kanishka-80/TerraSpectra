# Week 3 Day 4 — Controlled Preprocessing Experiments

- Data source: `deterministic_synthetic_smoke_test`
- Data kind: `synthetic_software_smoke_test`
- Band selection changed: No
- Split changed: No

## Experiment methodology

Two normalization methods were compared: StandardScaler and RobustScaler.

For each method, the scaler was fitted on training data only. The fitted scaler was reused without refitting on validation and test data.

PCA was fitted only on the scaled training data with a 95% explained-variance target. The fitted PCA transformation was then reused on validation and test data.

## Results

### standard_scaler

- Training samples: 256
- Validation samples: 64
- Test samples: 64
- Input features: 16
- PCA components retained: 15
- Explained variance retained: 0.959790
- Train output shape: `[256, 15]`
- Validation output shape: `[64, 15]`
- Test output shape: `[64, 15]`

### robust_scaler

- Training samples: 256
- Validation samples: 64
- Test samples: 64
- Input features: 16
- PCA components retained: 15
- Explained variance retained: 0.960069
- Train output shape: `[256, 15]`
- Validation output shape: `[64, 15]`
- Test output shape: `[64, 15]`

## Reproducibility and limitations

Both normalization and PCA are fitted on training data only. The fitted transformations are reused unchanged on validation and test data.

No band selection or split modification was performed in this comparison.

**Important:** No real hyperspectral dataset was supplied to this run. The results above are from deterministic synthetic data and verify software behavior only. They are not scientific evidence, real-scene validation, or a recommendation for model training.

A real-data comparison remains pending until the team supplies the approved train/validation/test feature arrays and dataset version.
