# Spectral Preprocessing Specification

1. Inspect raster metadata before processing.
2. Identify NoData, non-finite, constant and invalid bands.
3. Preserve original wavelength and band-index mapping.
4. Fit normalization statistics on training data only.
5. Apply the fitted transformation to validation and test data.
6. Use PCA only when justified by exploratory analysis.
7. Fit PCA on training data only.
8. Preserve preprocessing parameters for reproducibility.

Never fit preprocessing statistics on the complete dataset before splitting.
