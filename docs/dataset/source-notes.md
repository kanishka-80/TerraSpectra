# TerraSpectra - Dataset Source Notes

Date: 11 November 2026
Prepared by: Khushi

## Research Objective

Identify accessible hyperspectral sources for
crop stress intelligence and disease-risk forecasting.

## Key Technical Observations

1. EnMAP provides VNIR and SWIR observations.
2. PRISMA provides VNIR and SWIR observations.
3. EMIT provides 285 spectral bands at nominal 60 m.
4. AVIRIS is airborne; specifications depend on the instrument.

## Data Engineering Considerations

- Inspect CRS and affine transform.
- Verify raster width, height and band count.
- Inspect wavelength metadata and band ordering.
- Identify nodata values and invalid pixels.
- Check cloud and quality masks.
- Inspect data types and scaling factors.
- Check spectral values for NaN and infinity.
- Verify labels before supervised training.

## Initial Preprocessing Considerations

- Invalid-pixel masking
- Reflectance scaling verification
- Band quality assessment
- Normalization experiments
- Optional PCA experiments
- Spatial patch extraction

Preprocessing decisions will be finalized only after
inspecting actual sample products.

## Important Coordination

Harsh:
Confirm model input dimensions, band ordering,
patch size and normalization expectations.

Kanishka:
Share CRS, affine transform and scene bounds
after actual raster inspection.

## Current Limitations

No scene has been downloaded or inspected as part
of this research note.

No crop disease labels have been verified.

Licensing and scene-level access conditions
remain to be confirmed.
