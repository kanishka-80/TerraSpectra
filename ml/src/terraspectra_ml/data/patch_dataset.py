"""Extract spatial patches and preserve their source metadata."""

import numpy as np


def _validate_image(image):
    data = np.asarray(image)

    if data.ndim != 3:
        raise ValueError("Image must have shape (bands, rows, columns).")

    return data


def _validate_patch_settings(patch_size, stride):
    if not isinstance(patch_size, int) or patch_size < 1:
        raise ValueError("patch_size must be a positive integer.")

    if not isinstance(stride, int) or stride < 1:
        raise ValueError("stride must be a positive integer.")


def _patch_positions(height, width, patch_size, stride):
    for row in range(0, height - patch_size + 1, stride):
        for column in range(0, width - patch_size + 1, stride):
            yield row, column


def extract_patches(image, patch_size=9, stride=1):
    """Return patches shaped (N, bands, patch_size, patch_size)."""
    _validate_patch_settings(patch_size, stride)
    data = _validate_image(image)
    bands, height, width = data.shape

    if patch_size > height or patch_size > width:
        raise ValueError("Patch size exceeds image dimensions.")

    patches = [
        data[:, row:row + patch_size, column:column + patch_size]
        for row, column in _patch_positions(
            height, width, patch_size, stride
        )
    ]

    if not patches:
        return np.empty((0, bands, patch_size, patch_size), dtype=data.dtype)

    return np.stack(patches)


def extract_patches_with_metadata(
    image,
    patch_size=9,
    stride=1,
    transform=None,
    crs=None,
    source_id=None,
):
    """
    Extract patches and return one metadata record per patch.

    transform should be a Rasterio/Affine transform or its six coefficients.
    """
    _validate_patch_settings(patch_size, stride)
    data = _validate_image(image)
    bands, height, width = data.shape

    if patch_size > height or patch_size > width:
        raise ValueError("Patch size exceeds image dimensions.")

    patches = []
    records = []

    patch_transform_base = None
    if transform is not None:
        try:
            from affine import Affine
            patch_transform_base = (
                transform
                if isinstance(transform, Affine)
                else Affine(*tuple(transform)[:6])
            )
        except (ImportError, TypeError, ValueError) as exc:
            raise ValueError(
                "transform must be an Affine transform or six coefficients."
            ) from exc

    for row, column in _patch_positions(
        height, width, patch_size, stride
    ):
        patches.append(
            data[:, row:row + patch_size, column:column + patch_size]
        )

        patch_transform = None
        if patch_transform_base is not None:
            patch_transform = tuple(
                patch_transform_base
                @ Affine.translation(column, row)
            )

        records.append({
            "source_id": source_id,
            "row": row,
            "column": column,
            "patch_size": patch_size,
            "crs": str(crs) if crs is not None else None,
            "transform": patch_transform,
        })

    patch_array = (
        np.stack(patches)
        if patches
        else np.empty(
            (0, bands, patch_size, patch_size),
            dtype=data.dtype,
        )
    )
    return patch_array, records


class PatchDataset:
    """NumPy-backed dataset with optional per-patch metadata."""

    def __init__(self, patches, labels=None, metadata=None):
        self.patches = np.asarray(patches)
        self.labels = None if labels is None else np.asarray(labels)
        self.metadata = None if metadata is None else list(metadata)

        if self.patches.ndim != 4:
            raise ValueError(
                "Patches must have shape (N, bands, height, width)."
            )

        if self.labels is not None:
            if len(self.labels) != len(self.patches):
                raise ValueError("Patch and label counts do not match.")

        if self.metadata is not None:
            if len(self.metadata) != len(self.patches):
                raise ValueError("Patch and metadata counts do not match.")

    def __len__(self):
        return len(self.patches)

    def __getitem__(self, index):
        if self.labels is None:
            return self.patches[index]
        return self.patches[index], self.labels[index]

    def get_metadata(self, index):
        """Return metadata for one patch, if metadata was provided."""
        if self.metadata is None:
            return None
        return self.metadata[index]
