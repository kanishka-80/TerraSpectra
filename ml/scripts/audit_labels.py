"""Audit CSV label completeness and class distribution."""

import argparse
import csv
import json
from collections import Counter
from pathlib import Path


def audit_labels(csv_path, label_column, id_column=None):
    path = Path(csv_path)

    if not path.is_file():
        raise FileNotFoundError(path)

    counts = Counter()
    missing_labels = 0
    duplicate_ids = 0
    seen_ids = set()
    total_rows = 0

    with path.open(
        "r",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        reader = csv.DictReader(file)

        if not reader.fieldnames or label_column not in reader.fieldnames:
            raise ValueError(
                f"Label column '{label_column}' not found."
            )

        if id_column and id_column not in reader.fieldnames:
            raise ValueError(f"ID column '{id_column}' not found.")

        for row in reader:
            total_rows += 1
            label = (row.get(label_column) or "").strip()

            if not label:
                missing_labels += 1
            else:
                counts[label] += 1

            if id_column:
                identifier = (row.get(id_column) or "").strip()

                if identifier:
                    if identifier in seen_ids:
                        duplicate_ids += 1
                    seen_ids.add(identifier)

    return {
        "file": str(path.resolve()),
        "total_rows": total_rows,
        "label_column": label_column,
        "id_column": id_column,
        "missing_labels": missing_labels,
        "label_counts": dict(sorted(counts.items())),
        "unique_labels": len(counts),
        "duplicate_ids": duplicate_ids,
        "label_source_verified": False,
        "model_ready": False,
        "warnings": [
            "CSV structure does not prove label correctness.",
            "Verify original label source, license and sample alignment.",
            "Confirm spatial independence before supervised training.",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_file")
    parser.add_argument("--label-column", required=True)
    parser.add_argument("--id-column")
    parser.add_argument(
        "--output",
        default="docs/dataset/label-audit-report.json",
    )
    args = parser.parse_args()

    report = audit_labels(
        args.csv_file,
        args.label_column,
        args.id_column,
    )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Rows inspected: {report['total_rows']}")
    print(f"Missing labels: {report['missing_labels']}")
    print(f"Unique classes: {report['unique_labels']}")
    print(f"Report saved: {output}")
    print("Label provenance still requires manual verification.")


if __name__ == "__main__":
    main()
