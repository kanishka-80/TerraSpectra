import csv
import tempfile
import unittest
from pathlib import Path

import numpy as np

from terraspectra_ml.evaluation.spatial_split import (
    spatial_group_split,
    spatial_split,
)
from terraspectra_ml.data.patch_manifest import write_manifest


class TestSpatialGroupSplit(unittest.TestCase):

    def test_groups_do_not_overlap_and_are_complete(self):
        groups = np.repeat(np.arange(20), 2)
        result = spatial_group_split(groups)

        train = set(result["train_groups"])
        validation = set(result["validation_groups"])
        test = set(result["test_groups"])

        self.assertFalse(train & validation)
        self.assertFalse(train & test)
        self.assertFalse(validation & test)
        self.assertEqual(train | validation | test, set(groups))

    def test_split_is_reproducible(self):
        groups = np.arange(20)
        first = spatial_group_split(groups, seed=12)
        second = spatial_group_split(groups, seed=12)

        for key in first:
            np.testing.assert_array_equal(first[key], second[key])

    def test_invalid_fractions(self):
        with self.assertRaises(ValueError):
            spatial_group_split(
                np.arange(10),
                train_fraction=0.8,
                validation_fraction=0.3,
            )

    def test_missing_group_rejected(self):
        with self.assertRaises(ValueError):
            spatial_group_split([1, 2, None, 4])

    def test_nan_group_rejected(self):
        with self.assertRaises(ValueError):
            spatial_group_split([1.0, 2.0, np.nan, 4.0])


class TestSpatialRowSplit(unittest.TestCase):

    def setUp(self):
        self.records = [{"row": row} for row in range(20)]

    def test_zero_buffer_partitions_all_records(self):
        result = spatial_split(
            self.records, train=0.6, validation=0.2
        )

        sets = [
            set(result["train"]),
            set(result["validation"]),
            set(result["test"]),
        ]

        self.assertFalse(sets[0] & sets[1])
        self.assertFalse(sets[0] & sets[2])
        self.assertFalse(sets[1] & sets[2])

        combined = sets[0] | sets[1] | sets[2]
        self.assertEqual(combined, set(range(20)))
        self.assertEqual(len(result["excluded"]), 0)

    def test_buffer_excludes_boundary_records(self):
        without_buffer = spatial_split(self.records, buffer_pixels=0)
        with_buffer = spatial_split(self.records, buffer_pixels=1)

        self.assertGreater(len(with_buffer["excluded"]), 0)
        self.assertLessEqual(
            len(with_buffer["train"]),
            len(without_buffer["train"]),
        )

    def test_negative_buffer_rejected(self):
        with self.assertRaises(ValueError):
            spatial_split(self.records, buffer_pixels=-1)

    def test_nonfinite_rows_rejected(self):
        records = [{"row": 0}, {"row": 1}, {"row": np.nan}]
        with self.assertRaises(ValueError):
            spatial_split(records)

    def test_missing_row_rejected(self):
        with self.assertRaises(ValueError):
            spatial_split([{"row": 0}, {}, {"row": 2}])


class TestPatchManifest(unittest.TestCase):

    def test_column_alias_is_saved_as_col(self):
        records = [
            {
                "patch_id": "p1",
                "source_id": "scene1",
                "row": 10,
                "column": 20,
                "label": "class_a",
            }
        ]

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.csv"
            write_manifest(records, path)

            with path.open(encoding="utf-8") as file:
                rows = list(csv.DictReader(file))

            self.assertEqual(rows[0]["col"], "20")
            self.assertEqual(rows[0]["row"], "10")
            self.assertEqual(rows[0]["patch_id"], "p1")

    def test_optional_fields_remain_blank(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.csv"
            write_manifest([{"patch_id": "p2"}], path)

            with path.open(encoding="utf-8") as file:
                rows = list(csv.DictReader(file))

            self.assertEqual(rows[0]["label"], "")
            self.assertEqual(rows[0]["crs"], "")

    def test_invalid_record_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "manifest.csv"

            with self.assertRaises(ValueError):
                write_manifest(["invalid"], path)


if __name__ == "__main__":
    unittest.main()
