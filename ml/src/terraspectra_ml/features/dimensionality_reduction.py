import numpy as np


class SpectralPCA:
    """PCA fitted only on the training samples."""

    def __init__(self, n_components=10):
        if not isinstance(n_components, int) or n_components < 1:
            raise ValueError("n_components must be a positive integer")
        self.n_components = n_components
        self.model = None
        self.n_features_in_ = None

    def fit(self, training_samples):
        from sklearn.decomposition import PCA

        x = np.asarray(training_samples, dtype=np.float32)
        if x.ndim != 2 or not np.isfinite(x).all():
            raise ValueError("Expected finite 2D training data")
        if x.shape[0] < 2 or x.shape[1] < 1:
            raise ValueError("PCA requires at least two samples and one feature")

        count = min(self.n_components, x.shape[0], x.shape[1])
        self.model = PCA(n_components=count, random_state=42)
        self.model.fit(x)
        self.n_features_in_ = x.shape[1]
        return self

    def transform(self, samples):
        if self.model is None:
            raise RuntimeError("Fit PCA on training data first")

        x = np.asarray(samples, dtype=np.float32)
        if x.ndim != 2 or x.shape[1] != self.n_features_in_:
            raise ValueError("Input feature count does not match fitted PCA")
        if not np.isfinite(x).all():
            raise ValueError("PCA input contains non-finite values")
        return self.model.transform(x)

    def fit_transform(self, training_samples):
        return self.fit(training_samples).transform(training_samples)

    @property
    def explained_variance_ratio(self):
        if self.model is None:
            raise RuntimeError("PCA not fitted")
        return self.model.explained_variance_ratio_
