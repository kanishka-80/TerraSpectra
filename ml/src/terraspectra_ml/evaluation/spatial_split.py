import numpy as np


def _validate_fractions(train, validation, test=None):
    values = [train, validation]
    if test is not None:
        values.append(test)

    if not all(np.isfinite(v) and 0 < v < 1 for v in values):
        raise ValueError("Split fractions must be finite and between 0 and 1")

    if train + validation >= 1:
        raise ValueError("Invalid split proportions")

    if test is not None and not np.isclose(train + validation + test, 1.0):
        raise ValueError("Split fractions must sum to 1")


def _split_counts(group_count, train, validation):
    if group_count < 3:
        raise ValueError("At least three unique groups are required")

    train_count = min(max(1, int(group_count * train)), group_count - 2)
    validation_count = min(
        max(1, int(group_count * validation)),
        group_count - train_count - 1,
    )
    return train_count, validation_count


def spatial_group_split(
    groups,
    train_fraction=0.70,
    validation_fraction=0.15,
    test_fraction=None,
    seed=42,
):
    """Split unique group IDs without dividing groups across sets."""

    _validate_fractions(
        train_fraction, validation_fraction, test_fraction
    )

    values = np.asarray(groups)

    if values.ndim != 1 or values.size == 0:
        raise ValueError("Groups must be a non-empty one-dimensional array")

    for value in values:
        if value is None:
            raise ValueError("Group IDs cannot be missing")
        if isinstance(value, (str, np.str_)) and not value.strip():
            raise ValueError("Group IDs cannot be empty")
        if isinstance(value, (float, np.floating)) and not np.isfinite(value):
            raise ValueError("Group IDs must be finite")

    unique = np.unique(values)
    train_count, validation_count = _split_counts(
        len(unique), train_fraction, validation_fraction
    )

    rng = np.random.default_rng(seed)
    shuffled = unique.copy()
    rng.shuffle(shuffled)

    validation_end = train_count + validation_count

    return {
        "train_groups": shuffled[:train_count],
        "validation_groups": shuffled[train_count:validation_end],
        "test_groups": shuffled[validation_end:],
    }


def spatial_split(records, train=0.70, validation=0.15, buffer_pixels=0):
    """Split records into contiguous row bands with optional boundary exclusion."""

    _validate_fractions(train, validation)

    if not np.isfinite(buffer_pixels) or buffer_pixels < 0:
        raise ValueError("buffer_pixels must be finite and non-negative")

    if records is None or len(records) == 0:
        raise ValueError("No records to split")

    try:
        rows = np.asarray(
            [record["row"] for record in records], dtype=float
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Every record must contain a numeric row") from exc

    if not np.all(np.isfinite(rows)):
        raise ValueError("Row positions must be finite")

    unique_rows = np.unique(rows)
    train_count, validation_count = _split_counts(
        len(unique_rows), train, validation
    )

    validation_end = train_count + validation_count

    first_boundary = (
        unique_rows[train_count - 1] + unique_rows[train_count]
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
