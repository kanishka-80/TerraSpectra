import numpy as np

class SpectralPCA:
    def __init__(self, n_components=10):
        self.n_components = n_components
        self.model = None

    def fit(self, training_samples):
        from sklearn.decomposition import PCA
        x = np.asarray(training_samples)
        if x.ndim != 2 or not np.isfinite(x).all():
            raise ValueError("Expected finite 2D training data")
        count = min(self.n_components, x.shape[0], x.shape[1])
        if count < 1:
            raise ValueError("Not enough samples or bands")
        self.model = PCA(n_components=count, random_state=42)
        self.model.fit(x)
        return self

    def transform(self, samples):
        if self.model is None:
            raise RuntimeError("Fit PCA on training data first")
        return self.model.transform(samples)

    @property
    def explained_variance_ratio(self):
        if self.model is None:
            raise RuntimeError("PCA not fitted")
        return self.model.explained_variance_ratio_
