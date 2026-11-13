"""Extract spatial patches from band-first hyperspectral arrays."""

import numpy as np


def extract_patches(
    image,
    patch_size=9,
    stride=1,
):
    """Extract non-overlapping or overlapping patches.

    Input shape: (bands, rows, columns).
    Output shape: (patches, bands, patch_rows, patch_columns).
    """
    if not isinstance(patch_size, int) or patch_size < 1:
        raise ValueError("patch_size must be a positive integer.")

    if not isinstance(stride, int) or stride < 1:
        raise ValueError("stride must be a positive integer.")

    data = np.asarray(image)

    if data.ndim != 3:
        raise ValueError("Image must have shape (bands, rows, columns).")

    bands, height, width = data.shape

    if patch_size > height or patch_size > width:
        raise ValueError("Patch size exceeds image dimensions.")

    patches = []

    for row in range(0, height - patch_size + 1, stride):
        for column in range(0, width - patch_size + 1, stride):
            patch = data[
                :,
                row:row + patch_size,
                column:column + patch_size,
            ]
            patches.append(patch)

    if not patches:
        return np.empty((0, bands, patch_size, patch_size))

    return np.stack(patches)


class PatchDataset:
    """Small NumPy-backed dataset interface."""

    def __init__(self, patches, labels=None):
        self.patches = np.asarray(patches)
        self.labels = None if labels is None else np.asarray(labels)

        if self.patches.ndim != 4:
            raise ValueError(
                "Patches must have shape (N, bands, height, width)."
            )

        if self.labels is not None:
            if len(self.labels) != len(self.patches):
                raise ValueError("Patch and label counts do not match.")

    def __len__(self):
        return len(self.patches)

    def __getitem__(self, index):
        if self.labels is None:
            return self.patches[index]
        return self.patches[index], self.labels[index]
