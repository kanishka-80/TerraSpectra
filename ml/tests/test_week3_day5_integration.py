import numpy as np
import pytest

from terraspectra_ml.data.patch_dataset import PatchDataset
from terraspectra_ml.data.loaders import make_dataloader


def test_patch_dataset_direct_dataloader_integration():
    torch = pytest.importorskip("torch")

    patches = np.random.default_rng(42).random(
        (5, 3, 16, 16)
    )

    labels = np.array([0, 1, 2, 1, 0])

    dataset = PatchDataset(
        patches,
        labels=labels,
        metadata=[{"id": i} for i in range(5)],
    )

    loader = make_dataloader(
        dataset,
        batch_size=2,
    )

    batches = list(loader)

    assert len(batches) == 3
    assert batches[0][0].shape == (2, 3, 16, 16)
    assert batches[0][0].dtype == torch.float32
    assert batches[0][1].dtype == torch.int64


def test_dataloader_without_labels():
    torch = pytest.importorskip("torch")

    dataset = PatchDataset(
        np.ones((4, 2, 8, 8))
    )

    loader = make_dataloader(
        dataset,
        batch_size=2,
    )

    batch = next(iter(loader))

    assert batch[0].shape == (2, 2, 8, 8)
    assert batch[0].dtype == torch.float32


def test_numpy_input_backward_compatibility():
    pytest.importorskip("torch")

    patches = np.ones((4, 3, 8, 8))
    labels = np.array([0, 1, 0, 1])

    loader = make_dataloader(
        patches,
        labels,
        batch_size=2,
    )

    assert len(loader) == 2


def test_dataset_rejects_multidimensional_labels():
    with pytest.raises(ValueError, match="1D"):
        PatchDataset(
            np.ones((2, 3, 4, 4)),
            labels=[[0], [1]],
        )


def test_dataset_rejects_non_integer_labels():
    with pytest.raises(ValueError, match="integer"):
        PatchDataset(
            np.ones((2, 3, 4, 4)),
            labels=[0, 1.5],
        )


def test_dataset_rejects_non_finite_labels():
    with pytest.raises(ValueError, match="integer"):
        PatchDataset(
            np.ones((2, 3, 4, 4)),
            labels=[0, np.nan],
        )


def test_dataloader_rejects_separate_labels_for_dataset():
    pytest.importorskip("torch")

    dataset = PatchDataset(
        np.ones((2, 3, 4, 4)),
        labels=[0, 1],
    )

    with pytest.raises(ValueError, match="separately"):
        make_dataloader(
            dataset,
            labels=[0, 1],
        )


def test_dataloader_rejects_invalid_seed():
    pytest.importorskip("torch")

    with pytest.raises(ValueError, match="seed"):
        make_dataloader(
            np.ones((2, 3, 4, 4)),
            seed=True,
        )


def test_dataloader_rejects_invalid_shuffle():
    pytest.importorskip("torch")

    with pytest.raises(ValueError, match="shuffle"):
        make_dataloader(
            np.ones((2, 3, 4, 4)),
            shuffle=1,
        )


def test_dataloader_seed_reproducibility():
    pytest.importorskip("torch")

    patches = np.arange(
        20 * 1 * 2 * 2
    ).reshape(20, 1, 2, 2)

    first = make_dataloader(
        patches,
        batch_size=4,
        shuffle=True,
        seed=42,
    )

    second = make_dataloader(
        patches,
        batch_size=4,
        shuffle=True,
        seed=42,
    )

    first_order = np.concatenate(
        [batch[0].numpy() for batch in first]
    )

    second_order = np.concatenate(
        [batch[0].numpy() for batch in second]
    )

    np.testing.assert_array_equal(
        first_order,
        second_order,
    )
