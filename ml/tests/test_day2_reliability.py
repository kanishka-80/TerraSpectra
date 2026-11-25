import numpy as np
import pytest

from terraspectra_ml.data.preprocessing import (
    StandardNormalizer,
    SpectralNormalizer,
    valid_fraction,
)

from terraspectra_ml.data.patch_dataset import (
    extract_patches,
    filter_invalid_patches,
    PatchDataset,
)


def test_normalizer_rejects_empty_training_data():
    with pytest.raises(ValueError):
        StandardNormalizer().fit(np.empty((0, 3, 4, 4)))


def test_normalizer_rejects_channel_without_valid_pixels():
    x = np.full((4, 2, 3, 3), np.nan)

    with pytest.raises(ValueError):
        StandardNormalizer().fit(x)


def test_normalizer_handles_constant_channel():
    x = np.ones((5, 2, 4, 4), dtype=np.float32)

    result = StandardNormalizer().fit_transform(x)

    assert result.shape == x.shape
    assert np.isfinite(result).all()
    assert np.all(result == 0)


def test_normalizer_rejects_wrong_channel_count():
    normalizer = StandardNormalizer().fit(
        np.ones((5, 3, 4, 4))
    )

    with pytest.raises(ValueError):
        normalizer.transform(np.ones((2, 4, 4, 4)))


def test_normalizer_preserves_nonfinite_mask():
    x = np.ones((4, 2, 4, 4))
    x[0, 0, 0, 0] = np.nan

    normalizer = StandardNormalizer().fit(x)
    result = normalizer.transform(x)

    assert np.isnan(result[0, 0, 0, 0])
    assert np.isfinite(result[1:]).all()


def test_normalizer_saved_parameters_are_valid(tmp_path):
    x = np.random.default_rng(42).normal(
        size=(5, 3, 4, 4)
    )

    normalizer = StandardNormalizer().fit(x)
    path = tmp_path / "normalizer.npz"

    normalizer.save(path)
    loaded = StandardNormalizer.load(path)

    np.testing.assert_allclose(
        normalizer.transform(x),
        loaded.transform(x)
    )


def test_spectral_normalizer_rejects_empty_samples():
    with pytest.raises(ValueError):
        SpectralNormalizer().fit(np.empty((0, 5)))


def test_spectral_normalizer_rejects_nan():
    x = np.ones((5, 3))
    x[0, 0] = np.nan

    with pytest.raises(ValueError):
        SpectralNormalizer().fit(x)


def test_spectral_normalizer_output_is_float32():
    x = np.random.default_rng(42).normal(size=(20, 5))

    result = SpectralNormalizer().fit_transform(x)

    assert result.dtype == np.float32
    assert result.shape == x.shape


def test_patch_extraction_rejects_invalid_size():
    image = np.ones((3, 32, 32))

    with pytest.raises(ValueError):
        extract_patches(image, patch_size=0)


def test_patch_extraction_rejects_empty_image():
    with pytest.raises(ValueError):
        extract_patches(np.empty((3, 0, 20)))


def test_patch_extraction_preserves_locations():
    image = np.ones((3, 32, 32))

    patches, locations = extract_patches(
        image,
        patch_size=16,
        stride=8,
        return_locations=True,
    )

    assert patches.shape == (9, 3, 16, 16)
    assert locations[0] == (0, 0)
    assert locations[-1] == (16, 16)


def test_invalid_patch_threshold_rejects_nan():
    patches = np.ones((2, 3, 16, 16))

    with pytest.raises(ValueError):
        filter_invalid_patches(
            patches,
            max_invalid_fraction=float("nan")
        )


def test_patch_filter_returns_mask():
    patches = np.ones((3, 2, 4, 4))
    patches[1, :, :, :] = np.nan

    filtered, mask = filter_invalid_patches(
        patches,
        max_invalid_fraction=0.20
    )

    assert filtered.shape[0] == 2
    assert mask.tolist() == [True, False, True]


def test_patch_dataset_rejects_mismatched_labels():
    patches = np.ones((4, 3, 16, 16))
    labels = np.array([1, 2])

    with pytest.raises(ValueError):
        PatchDataset(patches, labels=labels)


def test_valid_fraction():
    image = np.array([
        [1.0, 2.0],
        [np.nan, 4.0]
    ])

    assert valid_fraction(image) == 0.75


def test_valid_fraction_rejects_empty_image():
    with pytest.raises(ValueError):
        valid_fraction(np.array([]))
