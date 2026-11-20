import numpy as np


def extract_patches(image, patch_size=16, stride=8, return_locations=False):
    """Extract NCHW patches from a band-first image."""
    image = np.asarray(image)

    if image.ndim != 3:
        raise ValueError("Image must have shape (bands, height, width)")
    if patch_size <= 0 or stride <= 0:
        raise ValueError("Patch size and stride must be positive")

    bands, height, width = image.shape
    patches = []
    locations = []

    for row in range(0, height - patch_size + 1, stride):
        for col in range(0, width - patch_size + 1, stride):
            patches.append(
                image[:, row:row + patch_size, col:col + patch_size].copy()
            )
            locations.append((row, col))

    if patches:
        result = np.stack(patches)
    else:
        result = np.empty(
            (0, bands, patch_size, patch_size), dtype=image.dtype
        )

    if return_locations:
        return result, locations
    return result


def extract_patches_with_metadata(
    image,
    patch_size=16,
    stride=8,
    transform=None,
    crs=None,
    source_id=None,
):
    """Extract patches and record their pixel and geospatial origins."""
    from affine import Affine

    patches, locations = extract_patches(
        image, patch_size, stride, return_locations=True
    )

    metadata = []
    for row, col in locations:
        patch_transform = None
        if transform is not None:
            patch_transform = tuple(
                (Affine(*transform) if not isinstance(transform, Affine)
                 else transform) @ Affine.translation(col, row)
            )

        metadata.append({
            "row": int(row),
            "column": int(col),
            "source_id": source_id,
            "crs": str(crs) if crs is not None else None,
            "transform": patch_transform,
        })

    return patches, metadata


def filter_invalid_patches(patches, max_invalid_fraction=0.20):
    """Keep patches whose non-finite pixel fraction is within the limit."""
    if not 0 <= max_invalid_fraction <= 1:
        raise ValueError("Invalid fraction must be between 0 and 1")

    patches = np.asarray(patches)
    if len(patches) == 0:
        return patches, np.array([], dtype=bool)

    keep = np.isfinite(patches).mean(axis=(1, 2, 3)) >= (
        1 - max_invalid_fraction
    )
    return patches[keep], keep


class PatchDataset:
    """Small NumPy-backed dataset with optional labels and metadata."""

    def __init__(self, patches, labels=None, metadata=None):
        self.patches = np.asarray(patches)

        if self.patches.ndim != 4:
            raise ValueError("Patches must have shape (N, C, H, W)")

        self.labels = None if labels is None else np.asarray(labels)
        self.metadata = metadata

        if self.labels is not None and len(self.labels) != len(self.patches):
            raise ValueError("Patch and label counts differ")
        if self.metadata is not None and len(self.metadata) != len(self.patches):
            raise ValueError("Patch and metadata counts differ")

    def __len__(self):
        return len(self.patches)

    def __getitem__(self, index):
        if self.labels is None:
            return self.patches[index]
        return self.patches[index], self.labels[index]

    def get_metadata(self, index):
        if self.metadata is None:
            raise ValueError("No patch metadata is available")
        return self.metadata[index]
