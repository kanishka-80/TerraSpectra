# Preprocessing Comparison Experiment

1. Select a manageable licensed scene subset.
2. Create spatial train/validation/test splits.
3. Fit normalization on training data only.
4. Fit PCA on training samples only.
5. Apply transforms to validation and test.
6. Record explained variance and compare full-band vs PCA.
7. Document limitations.
