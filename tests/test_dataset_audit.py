import tempfile
import unittest
import csv
from pathlib import Path

from src.terraspectra.dataset_audit import audit_dataset


class TestDatasetAudit(unittest.TestCase):

    def test_csv_audit(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)

            with (folder / "sample.csv").open(
                "w", newline="", encoding="utf-8"
            ) as file:
                writer = csv.writer(file)
                writer.writerow(["crop", "health"])
                writer.writerow(["wheat", "healthy"])
                writer.writerow(["rice", ""])

            result = audit_dataset(folder)

            self.assertEqual(result["total_files"], 1)
            self.assertEqual(result["csv_reports"][0]["row_count"], 2)
            self.assertEqual(
                result["csv_reports"][0]["missing_values"]["health"], 1
            )

    def test_invalid_directory(self):
        with self.assertRaises(ValueError):
            audit_dataset("nonexistent_dataset_folder")


if __name__ == "__main__":
    unittest.main()
