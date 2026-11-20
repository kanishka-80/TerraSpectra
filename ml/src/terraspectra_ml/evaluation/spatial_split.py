import numpy as np


def spatial_group_split(
    groups,
    train_fraction=0.70,
    validation_fraction=0.15,
    test_fraction=None,
    seed=42,
):
    """Split unique group IDs without dividing a group across sets."""
    if (
        train_fraction <= 0
        or validation_fraction <= 0
        or train_fraction + validation_fraction >= 1
    ):
        raise ValueError("Invalid split proportions")

    if test_fraction is not None:
        if test_fraction <= 0 or not np.isclose(
            train_fraction + validation_fraction + test_fraction, 1.0
        ):
            raise ValueError("Split fractions must sum to 1")

    values = np.asarray(groups)
    if values.ndim != 1 or values.size == 0:
        raise ValueError("Groups must be a non-empty one-dimensional array")

    unique = np.unique(values)
    if len(unique) < 3:
        raise ValueError("At least three unique groups are required")

    rng = np.random.default_rng(seed)
    shuffled = unique.copy()
    rng.shuffle(shuffled)

    train_end = max(1, int(len(shuffled) * train_fraction))
    validation_end = max(
        train_end + 1,
        int(len(shuffled) * (train_fraction + validation_fraction)),
    )
    validation_end = min(validation_end, len(shuffled) - 1)

    return {
        "train_groups": shuffled[:train_end],
        "validation_groups": shuffled[train_end:validation_end],
        "test_groups": shuffled[validation_end:],
    }


def spatial_split(records, train=0.70, validation=0.15, buffer_pixels=0):
    """
    Split records into contiguous row bands.

    buffer_pixels excludes records near split boundaries. For overlapping
    patches, choose a buffer at least as large as the patch overlap risk.
    """
    if train <= 0 or validation <= 0 or train + validation >= 1:
        raise ValueError("Invalid split proportions")
    if buffer_pixels < 0:
        raise ValueError("buffer_pixels cannot be negative")
    if not records:
        raise ValueError("No records to split")

    rows = np.asarray([record["row"] for record in records], dtype=float)
    unique_rows = np.unique(rows)

    if len(unique_rows) < 3:
        raise ValueError("At least three unique row positions are required")

    train_end = max(1, int(len(unique_rows) * train))
    validation_end = max(
        train_end + 1,
        int(len(unique_rows) * (train + validation)),
    )
    validation_end = min(validation_end, len(unique_rows) - 1)

    first_boundary = (
        unique_rows[train_end - 1] + unique_rows[train_end]
    ) / 2
    second_boundary = (
        unique_rows[validation_end - 1] + unique_rows[validation_end]
    ) / 2

    train_mask = rows < first_boundary - buffer_pixels
    validation_mask = (
        (rows > first_boundary + buffer_pixels)
        & (rows < second_boundary - buffer_pixels)
    )
    test_mask = rows > second_boundary + buffer_pixels

    assigned = train_mask | validation_mask | test_mask

    return {
        "train": np.flatnonzero(train_mask),
        "validation": np.flatnonzero(validation_mask),
        "test": np.flatnonzero(test_mask),
        "excluded": np.flatnonzero(~assigned),
    }
