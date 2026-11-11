"""Basic inventory and CSV quality audit for TerraSpectra datasets."""

import argparse
import csv
import json
from pathlib import Path


def audit_dataset(dataset_dir):
    """Inspect dataset files and basic CSV structure."""

    root = Path(dataset_dir)

    if not root.exists() or not root.is_dir():
        raise ValueError(f"Invalid dataset directory: {root}")

    results = {
        "dataset_path": str(root.resolve()),
        "total_files": 0,
        "files": [],
        "csv_reports": [],
    }

    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file():
            continue

        results["total_files"] += 1

        file_info = {
            "name": file_path.name,
            "extension": file_path.suffix.lower(),
            "size_bytes": file_path.stat().st_size,
        }

        results["files"].append(file_info)

        if file_path.suffix.lower() == ".csv":
            report = {
                "file": file_path.name,
                "columns": [],
                "row_count": 0,
                "missing_values": {},
                "error": None,
            }

            try:
                with file_path.open(
                    "r", encoding="utf-8-sig", newline=""
                ) as csv_file:
                    reader = csv.DictReader(csv_file)
                    report["columns"] = reader.fieldnames or []

                    missing = {
                        column: 0 for column in report["columns"]
                    }

                    for row in reader:
                        report["row_count"] += 1

                        for column in missing:
                            if not (row.get(column) or "").strip():
                                missing[column] += 1

                    report["missing_values"] = missing

            except (OSError, UnicodeError, csv.Error) as error:
                report["error"] = str(error)

            results["csv_reports"].append(report)

    return results


def main():
    parser = argparse.ArgumentParser(
        description="TerraSpectra dataset inventory and CSV audit"
    )
    parser.add_argument("dataset_dir", help="Path to dataset folder")
    parser.add_argument(
        "--output",
        default="dataset-audit.json",
        help="Output JSON report path",
    )

    args = parser.parse_args()

    try:
        report = audit_dataset(args.dataset_dir)

        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(report, indent=4),
            encoding="utf-8",
        )

        print(f"Audit completed: {report['total_files']} files")
        print(f"CSV reports: {len(report['csv_reports'])}")
        print(f"Saved report: {output_path}")

    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
