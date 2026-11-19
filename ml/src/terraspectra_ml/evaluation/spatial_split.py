import numpy as np

def spatial_split(records, train=0.70, validation=0.15):
    if train <= 0 or validation <= 0 or train + validation >= 1:
        raise ValueError("Invalid split proportions")

    # Group by source row strips; neighboring patches remain together.
    rows = np.array([r["row"] for r in records])
    if len(rows) == 0:
        raise ValueError("No records to split")

    unique = np.unique(rows)
    n = len(unique)
    a = max(1, int(n * train))
    b = max(a + 1, int(n * (train + validation)))
    b = min(b, n)

    groups = {
        "train": set(unique[:a]),
        "validation": set(unique[a:b]),
        "test": set(unique[b:])
    }

    return {
        name: np.array([
            i for i, r in enumerate(records)
            if r["row"] in group
        ], dtype=int)
        for name, group in groups.items()
    }
