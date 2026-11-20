import numpy as np


class StandardNormalizer:
    """Channel-wise standardization for NCHW or channel-first image batches."""

    def __init__(self):
        self.mean_ = None
        self.scale_ = None

    def fit(self, images):
        x = np.asarray(images, dtype=np.float64)
        if x.ndim < 2:
            raise ValueError("Expected channel-first image batch")

        axes = tuple(i for i in range(x.ndim) if i != 1)
        valid = np.isfinite(x)
        count = valid.sum(axis=axes)

        if np.any(count == 0):
            raise ValueError("A channel contains no valid training pixels")

        self.mean_ = np.where(valid, x, 0.0).sum(axis=axes) / count
        expanded = self.mean_.reshape(
            (1, len(self.mean_)) + (1,) * (x.ndim - 2)
        )
        variance = np.where(valid, (x - expanded) ** 2, 0.0).sum(axis=axes) / count
        self.scale_ = np.sqrt(variance)
        self.scale_[self.scale_ == 0] = 1.0
        return self

    def transform(self, images):
        if self.mean_ is None:
            raise RuntimeError("Fit normalizer on training data first")

        x = np.asarray(images, dtype=np.float32)
        if x.ndim < 2 or x.shape[1] != len(self.mean_):
            raise ValueError("Input channel count does not match fitted data")

        shape = (1, len(self.mean_)) + (1,) * (x.ndim - 2)
        return (
            (x - self.mean_.reshape(shape)) /
            self.scale_.reshape(shape)
        ).astype(np.float32)

    def fit_transform(self, images):
        return self.fit(images).transform(images)

    def save(self, path):
        if self.mean_ is None:
            raise RuntimeError("Normalizer has not been fitted")
        np.savez(path, mean=self.mean_, scale=self.scale_)

    @classmethod
    def load(cls, path):
        result = cls()
        with np.load(path) as params:
            result.mean_ = params["mean"]
            result.scale_ = params["scale"]
        return result


class SpectralNormalizer:
    """Feature-wise standardization for 2D (samples, spectral bands) data."""

    def __init__(self):
        self.mean_ = None
        self.scale_ = None

    def fit(self, samples):
        x = np.asarray(samples, dtype=np.float64)
        if x.ndim != 2 or x.shape[0] == 0 or x.shape[1] == 0:
            raise ValueError("Expected a non-empty 2D spectral sample array")
        if not np.isfinite(x).all():
            raise ValueError("Spectral samples contain non-finite values")

        self.mean_ = x.mean(axis=0)
        self.scale_ = x.std(axis=0)
        self.scale_[self.scale_ == 0] = 1.0
        return self

    def transform(self, samples):
        if self.mean_ is None:
            raise RuntimeError("Fit normalizer on training data first")

        x = np.asarray(samples, dtype=np.float64)
        if x.ndim != 2 or x.shape[1] != len(self.mean_):
            raise ValueError("Input spectral band count does not match")
        if not np.isfinite(x).all():
            raise ValueError("Spectral samples contain non-finite values")

        return ((x - self.mean_) / self.scale_).astype(np.float32)

    def fit_transform(self, samples):
        return self.fit(samples).transform(samples)


def valid_fraction(image):
    return float(np.isfinite(image).mean())
