import numpy as np
import pytest

from terraspectra_ml.data.patch_dataset import (
    extract_patches,
    filter_invalid_patches
)
from terraspectra_ml.data.preprocessing import StandardNormalizer
from terraspectra_ml.evaluation.spatial_split import spatial_split


def test_patch_shape():
    image = np.ones((4, 32, 32), dtype=np.float32)
    patches, locations = extract_patches(image, 16, 8)
    assert patches.shape == (9, 4, 16, 16)
    assert len(locations) == 9


def test_small_image():
    patches, locations = extract_patches(
        np.ones((3, 4, 4)), 16, 8
    )
    assert len(patches) == 0
    assert locations == []


def test_invalid_patch_filter():
    patches = np.ones((2, 2, 4, 4), dtype=np.float32)
    patches[1, :, :, :2] = np.nan

    result, keep = filter_invalid_patches(
        patches, max_invalid_fraction=0.20
    )

    assert len(result) == 1
    assert keep.tolist() == [True, False]


def test_normalizer():
    x = np.random.default_rng(42).normal(
        size=(10, 3, 4, 4)
    )
    normalizer = StandardNormalizer().fit(x)
    result = normalizer.transform(x)

    assert result.shape == x.shape
    assert np.isfinite(result).all()


def test_normalizer_save_load(tmp_path):
    x = np.random.default_rng(42).normal(
        size=(10, 3, 4, 4)
    )
    normalizer = StandardNormalizer().fit(x)
    path = tmp_path / "normalizer.npz"

    normalizer.save(path)
    loaded = StandardNormalizer.load(path)

    np.testing.assert_allclose(
        normalizer.transform(x),
        loaded.transform(x)
    )


def test_spatial_split():
    records = [
        {"row": i, "col": 0}
        for i in range(20)
    ]

    splits = spatial_split(records)

    assert len(splits["train"]) > 0
    assert len(splits["validation"]) > 0
    assert len(splits["test"]) > 0

    assert not (
        set(splits["train"]) & set(splits["test"])
    )


def test_invalid_split():
    with pytest.raises(ValueError):
        spatial_split(
            [{"row": 0}],
            train=0.8,
            validation=0.3
        )
