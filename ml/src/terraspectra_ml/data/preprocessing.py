import numpy as np

class StandardNormalizer:
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
        self.mean_ = np.nansum(x, axis=axes) / count
        expanded = self.mean_.reshape(
            (1, len(self.mean_)) + (1,) * (x.ndim - 2)
        )
        variance = np.nansum((x - expanded) ** 2, axis=axes) / count
        self.scale_ = np.sqrt(variance)
        self.scale_[self.scale_ == 0] = 1.0
        return self

    def transform(self, images):
        if self.mean_ is None:
            raise RuntimeError("Fit normalizer on training data first")
        x = np.asarray(images, dtype=np.float32)
        shape = (1, len(self.mean_)) + (1,) * (x.ndim - 2)
        return ((x - self.mean_.reshape(shape)) /
                self.scale_.reshape(shape)).astype(np.float32)

    def save(self, path):
        if self.mean_ is None:
            raise RuntimeError("Normalizer has not been fitted")
        np.savez(path, mean=self.mean_, scale=self.scale_)

    @classmethod
    def load(cls, path):
        result = cls()
        params = np.load(path)
        result.mean_ = params["mean"]
        result.scale_ = params["scale"]
        return result

def valid_fraction(image):
    return float(np.isfinite(image).mean())
