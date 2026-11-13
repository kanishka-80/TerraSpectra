"""Optional PCA fitted only on training observations."""

class SpectralPCA:
    def __init__(self, n_components=3, random_state=42):
        self.n_components = n_components
        self.random_state = random_state
        self.model = None

    def fit(self, training_data):
        try:
            from sklearn.decomposition import PCA
        except ImportError as exc:
            raise ImportError("PCA requires scikit-learn.") from exc

        import numpy as np

        values = np.asarray(training_data, dtype=float)

        if values.ndim != 2 or not np.isfinite(values).all():
            raise ValueError("Training data must be a finite 2D array.")

        if self.n_components > min(values.shape):
            raise ValueError(
                "n_components cannot exceed the smaller data dimension."
            )

        self.model = PCA(
            n_components=self.n_components,
            random_state=self.random_state,
        )
        self.model.fit(values)
        return self

    def transform(self, data):
        if self.model is None:
            raise RuntimeError("Call fit() before transform().")
        return self.model.transform(data)

    def inverse_transform(self, transformed_data):
        if self.model is None:
            raise RuntimeError("Call fit() before inverse_transform().")
        return self.model.inverse_transform(transformed_data)
