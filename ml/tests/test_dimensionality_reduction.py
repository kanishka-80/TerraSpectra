import numpy as np
import pytest

from terraspectra_ml.features.dimensionality_reduction import SpectralPCA


def test_pca_fit_transform_shape():
    x = np.random.default_rng(42).normal(size=(30, 6))
    model = SpectralPCA(n_components=3)
    result = model.fit_transform(x)
    assert result.shape == (30, 3)


def test_pca_transform_before_fit():
    with pytest.raises(RuntimeError):
        SpectralPCA().transform(np.ones((3, 4)))


def test_pca_rejects_nonfinite():
    x = np.ones((5, 3))
    x[0, 0] = np.nan
    with pytest.raises(ValueError):
        SpectralPCA().fit(x)


def test_pca_rejects_wrong_feature_count():
    model = SpectralPCA(2).fit(np.random.default_rng(21).normal(size=(10, 3)))
    with pytest.raises(ValueError):
        model.transform(np.ones((2, 4)))


def test_pca_explained_variance():
    x = np.random.default_rng(7).normal(size=(20, 4))
    model = SpectralPCA(2).fit(x)
    assert model.explained_variance_ratio.shape == (2,)


def test_pca_rejects_zero_components():
    with pytest.raises(ValueError):
        SpectralPCA(0)
