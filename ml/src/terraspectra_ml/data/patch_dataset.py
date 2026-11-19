import numpy as np

def extract_patches(image, patch_size=16, stride=8):
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
            patch = image[:, row:row+patch_size, col:col+patch_size]
            patches.append(patch.copy())
            locations.append((row, col))

    if not patches:
        return np.empty((0, bands, patch_size, patch_size),
                        dtype=image.dtype), []

    return np.stack(patches), locations

def filter_invalid_patches(patches, max_invalid_fraction=0.20):
    if not 0 <= max_invalid_fraction <= 1:
        raise ValueError("Invalid fraction must be between 0 and 1")
    if len(patches) == 0:
        return patches, np.array([], dtype=bool)
    keep = np.isfinite(patches).mean(axis=(1, 2, 3)) >= (
        1 - max_invalid_fraction
    )
    return patches[keep], keep
