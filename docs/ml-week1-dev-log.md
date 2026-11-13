# TerraSpectra - Week 1 ML Development Log

## Scope
Build a reusable hyperspectral data engineering foundation.

## Implemented modules
- Raster metadata inspection
- Windowed raster reading
- Raster quality validation
- Training-only spectral normalization
- Optional PCA adapter
- Spatial patch extraction
- Dataset interface and optional PyTorch loader
- Spatial group splitting
- Scene inspection and preparation scripts
- Unit tests and data configuration

## Scientific safeguards
- No fabricated disease labels
- No automatic model-readiness claim
- Normalization and PCA fitted on training data only
- Spatial groups kept separate across splits
- Real scene inspection remains dependent on data access

## Pending
- Inspect an accessible real scene
- Verify source licensing and metadata
- Complete label provenance audit
- Agree tensor contract with ML lead
- Handoff CRS, transform and bounds to GIS/backend team
