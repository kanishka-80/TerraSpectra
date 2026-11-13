"""Deterministic spatial-group train/validation/test splitting."""

import numpy as np


def spatial_group_split(
    group_ids,
    train_fraction=0.70,
    validation_fraction=0.15,
    test_fraction=0.15,
    random_state=42,
):
    """Split complete spatial groups to reduce spatial leakage."""
    fractions = (
        train_fraction,
        validation_fraction,
        test_fraction,
    )

    if any(value < 0 for value in fractions):
        raise ValueError("Split fractions cannot be negative.")

    if not np.isclose(sum(fractions), 1.0):
        raise ValueError("Split fractions must sum to 1.")

    groups = np.asarray(group_ids)

    if groups.ndim != 1 or len(groups) == 0:
        raise ValueError("group_ids must be a non-empty 1D array.")

    unique_groups = np.unique(groups)

    if len(unique_groups) < 3:
        raise ValueError(
            "At least three distinct spatial groups are required."
        )

    rng = np.random.default_rng(random_state)
    shuffled = rng.permutation(unique_groups)

    train_end = max(1, int(len(shuffled) * train_fraction))
    validation_end = max(
        train_end + 1,
        int(len(shuffled) * (train_fraction + validation_fraction)),
    )
    validation_end = min(validation_end, len(shuffled) - 1)

    train_groups = shuffled[:train_end]
    validation_groups = shuffled[train_end:validation_end]
    test_groups = shuffled[validation_end:]

    return {
        "train": np.flatnonzero(np.isin(groups, train_groups)),
        "validation": np.flatnonzero(
            np.isin(groups, validation_groups)
        ),
        "test": np.flatnonzero(np.isin(groups, test_groups)),
        "train_groups": train_groups,
        "validation_groups": validation_groups,
        "test_groups": test_groups,
    }
