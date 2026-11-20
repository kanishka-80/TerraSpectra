"""Automated deterministic unit tests for TerraSpectra classification metrics and reporting."""

import json
import pathlib
import sys
import tempfile
import unittest
import numpy as np

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.evaluation import (
    analyze_class_distribution,
    build_evaluation_report,
    compute_classification_metrics,
    export_evaluation_report,
)


class TestEvaluationMetricsAndReports(unittest.TestCase):
    """Validates accuracy, precision, recall, F1, confusion matrix, imbalance, and report exports."""

    def setUp(self) -> None:
        self.class_map = {0: "healthy", 1: "stressed", 2: "severe_stress"}

    def test_perfect_predictions(self) -> None:
        y_true = [0, 1, 2, 0, 1, 2]
        y_pred = [0, 1, 2, 0, 1, 2]
        res = compute_classification_metrics(y_true, y_pred, self.class_map)

        self.assertEqual(res["overall"]["accuracy"], 1.0)
        self.assertEqual(res["overall"]["macro_f1"], 1.0)
        self.assertEqual(res["overall"]["weighted_f1"], 1.0)
        self.assertEqual(res["confusion_matrix"]["matrix"], [[2, 0, 0], [0, 2, 0], [0, 0, 2]])

    def test_known_partially_incorrect_and_absent_class(self) -> None:
        # Class 2 ('severe_stress') has 0 ground-truth and 0 predicted samples
        y_true = [0, 0, 1, 1]
        y_pred = [0, 1, 1, 1]
        res = compute_classification_metrics(y_true, y_pred, self.class_map)

        self.assertAlmostEqual(res["overall"]["accuracy"], 0.75)
        # Class 0: TP=1, FP=0, FN=1 -> P=1.0, R=0.5, F1=2/3
        # Class 1: TP=2, FP=1, FN=0 -> P=2/3, R=1.0, F1=0.8
        per_class = {row["class_id"]: row for row in res["per_class"]}
        self.assertAlmostEqual(per_class[0]["precision"], 1.0)
        self.assertAlmostEqual(per_class[0]["recall"], 0.5)
        self.assertAlmostEqual(per_class[0]["f1_score"], 2.0 / 3.0)
        self.assertAlmostEqual(per_class[1]["precision"], 2.0 / 3.0)
        self.assertAlmostEqual(per_class[1]["recall"], 1.0)
        self.assertIsNone(per_class[2]["recall"])
        self.assertEqual(res["confusion_matrix"]["matrix"], [[1, 1, 0], [0, 2, 0], [0, 0, 0]])
        self.assertTrue(any("severe_stress" in w for w in res["warnings"]))

    def test_class_with_zero_predictions_handled_cleanly(self) -> None:
        y_true = [0, 0, 0, 1]
        y_pred = [0, 0, 0, 0]
        res = compute_classification_metrics(y_true, y_pred, {0: "healthy", 1: "stressed"})

        per_class = {row["class_id"]: row for row in res["per_class"]}
        self.assertEqual(per_class[1]["predicted_samples"], 0)
        self.assertEqual(per_class[1]["precision"], 0.0)
        self.assertEqual(per_class[1]["recall"], 0.0)
        self.assertEqual(per_class[1]["f1_score"], 0.0)

    def test_class_imbalance_detection(self) -> None:
        y_true = [0] * 18 + [1] * 2
        dist = analyze_class_distribution(y_true, {0: "healthy", 1: "stressed"})
        self.assertEqual(dist["max_to_min_present_ratio"], 9.0)
        self.assertTrue(dist["significant_imbalance_detected"])

    def test_report_generation_and_export(self) -> None:
        res = compute_classification_metrics([0, 1, 0, 1], [0, 1, 1, 1], {0: "healthy", 1: "stressed"})
        report = build_evaluation_report(
            metrics_result=res,
            metadata={
                "experiment_id": "unit_test_eval_01",
                "model_name": "terraspectra_3dcnn_baseline",
                "evaluation_split": "unit_test_fixture",
                "is_synthetic_smoke_fixture": True,
            },
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            paths = export_evaluation_report(report, tmpdir, file_stem="baseline_check")
            self.assertTrue(paths["json"].exists())
            self.assertTrue(paths["markdown"].exists())
            loaded = json.loads(paths["json"].read_text(encoding="utf-8"))
            self.assertEqual(loaded["experiment_metadata"]["experiment_id"], "unit_test_eval_01")
            self.assertIn("Confusion Matrix", paths["markdown"].read_text(encoding="utf-8"))

    def test_invalid_inputs_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "empty label arrays"):
            compute_classification_metrics([], [], {0: "healthy", 1: "stressed"})
        with self.assertRaisesRegex(ValueError, "Length mismatch"):
            compute_classification_metrics([0, 1], [0], {0: "healthy", 1: "stressed"})
        with self.assertRaisesRegex(ValueError, "unconfigured class IDs"):
            compute_classification_metrics([0, 5], [0, 1], {0: "healthy", 1: "stressed"})


if __name__ == "__main__":
    unittest.main()
