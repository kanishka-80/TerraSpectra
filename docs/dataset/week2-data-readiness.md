# TerraSpectra Week 2 Data Readiness

Owner: Khushi — ML & Data Engineering
Period: 18–24 November 2026

## Confirmed implementation
- Configurable data and preprocessing YAML files.
- Windowed raster reading.
- Nodata represented as invalid pixels.
- Channel-wise standard normalization.
- Patch extraction and invalid-patch filtering.
- Source and geospatial manifest fields.
- PyTorch DataLoader interface.
- Spatial row-group split helper.
- PCA fit/transform interface.

## External confirmations required
- Actual scene ID, acquisition date and license.
- Selected band indices and wavelength mapping.
- Harsh's patch size, tensor axis order, dtype and label contract.
- Verified label provenance and semantics.
- Kanishka's required geospatial output contract.

## Scientific safeguards
- Original scenes are read-only.
- Do not fabricate labels.
- Fit normalization and PCA on training samples only.
- Do not claim full-scene or farm-scale performance from a small test.
- Spatial splitting must be reviewed for geographic leakage.

## Status
Implementation scaffold created. Real-data acceptance remains pending until
a licensed scene and team tensor contract are confirmed.
