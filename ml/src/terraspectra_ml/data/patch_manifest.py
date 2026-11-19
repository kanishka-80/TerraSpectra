import csv
from pathlib import Path

FIELDS = [
    "patch_id", "source_id", "row", "col",
    "crs", "transform", "label_source", "label"
]

def write_manifest(records, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow({k: record.get(k) for k in FIELDS})
