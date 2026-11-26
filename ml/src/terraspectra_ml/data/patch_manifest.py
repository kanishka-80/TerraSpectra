import csv
from collections.abc import Mapping
from pathlib import Path

FIELDS = [
    "patch_id",
    "source_id",
    "row",
    "col",
    "crs",
    "transform",
    "label_source",
    "label",
]


def write_manifest(records, path):
    """Write patch metadata to a consistent CSV manifest.

    Accepts both 'col' and the existing extraction metadata key 'column'.
    Missing optional values are left blank.
    """

    if records is None:
        raise ValueError("Records cannot be None")

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()

        for index, record in enumerate(records):
            if not isinstance(record, Mapping):
                raise ValueError(
                    f"Record {index} must be a mapping"
                )

            row = {key: record.get(key) for key in FIELDS}

            if row["col"] is None:
                row["col"] = record.get("column")

            writer.writerow(row)

    return path
