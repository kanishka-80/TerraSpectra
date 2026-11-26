import numpy as np
import pytest

from terraspectra_ml.data.preprocessing import StandardNormalizer
from terraspectra_ml.features.dimensionality_reduction import SpectralPCA


def make_image_splits():
    rng = np.random.default_rng(606)

    return (
        rng.normal(10, 3, size=(12, 4, 8, 8)),
        rng.normal(10, 3, size=(5, 4, 8, 8)),
        rng.normal(10, 3, size=(5, 4, 8, 8)),
    )


def make_spectral_splits():
    rng = np.random.default_rng(607)

    return (
        rng.normal(5, 2, size=(60, 12)),
        rng.normal(5, 2, size=(20, 12)),
        rng.normal(5, 2, size=(20, 12)),
    )


def test_standard_normalizer_fits_training_data_only():
    train, val, test = make_image_splits()

    normalizer = StandardNormalizer().fit(train)

    expected_mean = normalizer.mean_.copy()
    expected_scale = normalizer.scale_.copy()

    # Changing held-out data must not change fitted parameters.
    val = val + 100000
    test = test - 100000

    assert np.array_equal(normalizer.mean_, expected_mean)
    assert np.array_equal(normalizer.scale_, expected_scale)

    val_result = normalizer.transform(val)
    test_result = normalizer.transform(test)

    assert val_result.shape == val.shape
    assert test_result.shape == test.shape
    assert val_result.dtype == np.float32
    assert test_result.dtype == np.float32


def test_standard_normalizer_reuses_training_parameters():
    train, val, test = make_image_splits()

    normalizer = StandardNormalizer().fit(train)

    mean_before = normalizer.mean_.copy()
    scale_before = normalizer.scale_.copy()

    normalizer.transform(val)
    normalizer.transform(test)

    assert np.array_equal(normalizer.mean_, mean_before)
    assert np.array_equal(normalizer.scale_, scale_before)


def test_standard_normalizer_save_and_load_preserves_parameters(tmp_path):
    train, val, _ = make_image_splits()

    normalizer = StandardNormalizer().fit(train)
    output_file = tmp_path / "normalizer_parameters.npz"

    normalizer.save(output_file)
    loaded = StandardNormalizer.load(output_file)

    assert np.allclose(loaded.mean_, normalizer.mean_)
    assert np.allclose(loaded.scale_, normalizer.scale_)
    assert np.allclose(
        loaded.transform(val),
        normalizer.transform(val),
    )


def test_standard_normalizer_rejects_transform_before_fit():
    with pytest.raises(RuntimeError):
        StandardNormalizer().transform(np.ones((2, 3, 4, 4)))


def test_standard_normalizer_rejects_wrong_channel_count():
    train, _, _ = make_image_splits()
    normalizer = StandardNormalizer().fit(train)

    with pytest.raises(ValueError):
        normalizer.transform(np.ones((2, 3, 4, 4)))


def test_spectral_pca_fits_training_samples_only():
    train, val, test = make_spectral_splits()

    model = SpectralPCA(n_components=5).fit(train)

    expected_components = model.model.components_.copy()
    expected_mean = model.model.mean_.copy()

    # Held-out data is deliberately changed after PCA fitting.
    val = val + 100000
    test = test - 100000

    model.transform(val)
    model.transform(test)

    assert np.array_equal(
        model.model.components_,
        expected_components,
    )
    assert np.array_equal(model.model.mean_, expected_mean)


def test_spectral_pca_reuses_same_fitted_transform():
    train, val, test = make_spectral_splits()

    model = SpectralPCA(n_components=5).fit(train)

    components_before = model.model.components_.copy()
    mean_before = model.model.mean_.copy()

    val_result = model.transform(val)
    test_result = model.transform(test)

    assert val_result.shape == (20, 5)
    assert test_result.shape == (20, 5)
    assert np.array_equal(model.model.components_, components_before)
    assert np.array_equal(model.model.mean_, mean_before)


def test_pca_training_and_held_out_sample_counts_are_preserved():
    train, val, test = make_spectral_splits()

    model = SpectralPCA(n_components=5).fit(train)

    train_result = model.transform(train)
    val_result = model.transform(val)
    test_result = model.transform(test)

    assert train_result.shape[0] == train.shape[0]
    assert val_result.shape[0] == val.shape[0]
    assert test_result.shape[0] == test.shape[0]


def test_pca_rejects_incompatible_held_out_features():
    train, _, _ = make_spectral_splits()

    model = SpectralPCA(n_components=5).fit(train)

    with pytest.raises(ValueError):
        model.transform(np.ones((10, 8)))


def test_pca_rejects_nonfinite_held_out_values():
    train, _, _ = make_spectral_splits()

    model = SpectralPCA(n_components=5).fit(train)

    invalid = np.ones((10, 12))
    invalid[0, 0] = np.nan

    with pytest.raises(ValueError):
        model.transform(invalid)
