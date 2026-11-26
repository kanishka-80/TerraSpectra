import numpy as np

from .patch_dataset import PatchDataset


def make_dataloader(
    patches,
    labels=None,
    batch_size=8,
    shuffle=False,
    seed=42,
):
    """Create a reproducible PyTorch DataLoader.

    Accepts either a PatchDataset or a NumPy patch array.
    Expected patch layout: (N, C, H, W).
    """

    try:
        import torch
        from torch.utils.data import TensorDataset, DataLoader
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch is required for DataLoader. Install a version "
            "compatible with the active Python environment."
        ) from exc

    if (
        not isinstance(batch_size, int)
        or isinstance(batch_size, bool)
        or batch_size < 1
    ):
        raise ValueError("batch_size must be a positive integer")

    if not isinstance(shuffle, bool):
        raise ValueError("shuffle must be a boolean")

    if (
        not isinstance(seed, (int, np.integer))
        or isinstance(seed, (bool, np.bool_))
    ):
        raise ValueError("seed must be an integer")

    # Direct PatchDataset integration
    if isinstance(patches, PatchDataset):
        if labels is not None:
            raise ValueError(
                "Do not provide labels separately when using PatchDataset"
            )

        labels = patches.labels
        patches = patches.patches

    x = np.asarray(patches, dtype=np.float32)

    if x.ndim != 4:
        raise ValueError("Expected patches shaped (N, C, H, W)")

    if any(size == 0 for size in x.shape[1:]):
        raise ValueError("Patch dimensions must not be empty")

    if len(x) == 0:
        raise ValueError("Dataset is empty")

    if not np.isfinite(x).all():
        raise ValueError("Patches contain invalid values")

    tensors = [
        torch.from_numpy(np.ascontiguousarray(x))
    ]

    if labels is not None:
        y = np.asarray(labels)

        if y.ndim != 1 or len(y) != len(x):
            raise ValueError(
                "Labels must be 1D and match patch count"
            )

        if not np.issubdtype(y.dtype, np.number):
            raise ValueError("Labels must be numeric class IDs")

        if (
            not np.isfinite(y).all()
            or not np.equal(y, np.floor(y)).all()
        ):
            raise ValueError(
                "Labels must contain finite integer class IDs"
            )

        tensors.append(
            torch.as_tensor(y, dtype=torch.long)
        )

    dataset = TensorDataset(*tensors)

    generator = torch.Generator()
    generator.manual_seed(int(seed))

    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        generator=generator,
    )
