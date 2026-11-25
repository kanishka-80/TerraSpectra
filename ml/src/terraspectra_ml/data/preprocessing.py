import numpy as np


class StandardNormalizer:
    """Channel-wise standardization for channel-first image batches."""

    def __init__(self):
        self.mean_ = None
        self.scale_ = None

    def fit(self, images):
        x = np.asarray(images, dtype=np.float64)

        if x.ndim < 2:
            raise ValueError("Expected channel-first image batch")

        if any(size == 0 for size in x.shape):
            raise ValueError("Training data must not contain empty dimensions")

        axes = tuple(i for i in range(x.ndim) if i != 1)
        valid = np.isfinite(x)
        count = valid.sum(axis=axes)

        if np.any(count == 0):
            raise ValueError("A channel contains no valid training pixels")

        self.mean_ = (
            np.where(valid, x, 0.0).sum(axis=axes) / count
        )

        expanded = self.mean_.reshape(
            (1, len(self.mean_)) + (1,) * (x.ndim - 2)
        )

        variance = (
            np.where(valid, (x - expanded) ** 2, 0.0)
            .sum(axis=axes) / count
        )

        self.scale_ = np.sqrt(variance)
        self.scale_[self.scale_ == 0] = 1.0

        return self

    def transform(self, images):
        if self.mean_ is None or self.scale_ is None:
            raise RuntimeError("Fit normalizer on training data first")

        x = np.asarray(images, dtype=np.float64)

        if x.ndim < 2:
            raise ValueError("Expected channel-first input")

        if x.shape[1] != len(self.mean_):
            raise ValueError("Input channel count does not match fitted data")

        if any(size == 0 for size in x.shape):
            raise ValueError("Input must not contain empty dimensions")

        shape = (1, len(self.mean_)) + (1,) * (x.ndim - 2)

        result = (
            (x - self.mean_.reshape(shape))
            / self.scale_.reshape(shape)
        )

        return result.astype(np.float32)

    def fit_transform(self, images):
        return self.fit(images).transform(images)

    def save(self, path):
        if self.mean_ is None or self.scale_ is None:
            raise RuntimeError("Normalizer has not been fitted")

        np.savez(
            path,
            mean=self.mean_,
            scale=self.scale_
        )

    @classmethod
    def load(cls, path):
        result = cls()

        with np.load(path, allow_pickle=False) as params:
            mean = np.asarray(params["mean"], dtype=np.float64)
            scale = np.asarray(params["scale"], dtype=np.float64)

        if mean.ndim != 1 or scale.shape != mean.shape:
            raise ValueError("Invalid saved normalizer parameters")

        if not np.isfinite(mean).all():
            raise ValueError("Saved means contain invalid values")

        if not np.isfinite(scale).all() or np.any(scale <= 0):
            raise ValueError("Saved scales must be finite and positive")

        result.mean_ = mean
        result.scale_ = scale

        return result


class SpectralNormalizer:
    """Feature-wise standardization for 2D spectral samples."""

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
    image = np.asarray(image)

    if image.size == 0:
        raise ValueError("Image must not be empty")

    return float(np.isfinite(image).mean())
