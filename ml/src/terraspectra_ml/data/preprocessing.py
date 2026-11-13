"""Training-only spectral normalization utilities."""

import numpy as np


class SpectralNormalizer:
    """Standardize spectral features using training data statistics."""

    def __init__(self, epsilon=1e-8):
        self.epsilon = epsilon
        self.mean_ = None
        self.scale_ = None

    def fit(self, training_data):
        data = np.asarray(training_data, dtype=float)

        if data.ndim != 2:
            raise ValueError("Expected a 2D samples-by-features array.")

        if data.shape[0] == 0:
            raise ValueError("Training data cannot be empty.")

        if not np.isfinite(data).all():
            raise ValueError("Training data contains non-finite values.")

        self.mean_ = data.mean(axis=0)
        standard_deviation = data.std(axis=0)

        self.scale_ = np.where(
            standard_deviation < self.epsilon,
            1.0,
            standard_deviation,
        )
        return self

    def transform(self, data):
        if self.mean_ is None or self.scale_ is None:
            raise RuntimeError("Call fit() before transform().")

        values = np.asarray(data, dtype=float)

        if values.shape[-1] != len(self.mean_):
            raise ValueError("Feature count does not match fitted data.")

        if not np.isfinite(values).all():
            raise ValueError("Input contains non-finite values.")

        return (values - self.mean_) / self.scale_

    def fit_transform(self, training_data):
        return self.fit(training_data).transform(training_data)
