"""Reusable classification metrics, confusion matrix, per-class analysis, and imbalance diagnostics.

Averaging Conventions:
- Macro: Unweighted mean across all configured classes. Treats every class equally regardless
  of sample count, making it essential for exposing poor minority-class recall under imbalance.
- Weighted: Average weighted by each class's true support count. Reflects overall dataset
  prevalence, so majority-class performance dominates when classes are imbalanced.
- Micro: Aggregates total true positives, false positives, and false negatives globally
  across all samples (identical to overall accuracy in single-label multiclass tasks).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)


def _validate_labels_and_predictions(
    y_true: Sequence[int] | np.ndarray,
    y_pred: Sequence[int] | np.ndarray,
    class_ids: Sequence[int],
) -> tuple[np.ndarray, np.ndarray]:
    """Validate ground-truth and predicted label arrays against the configured class IDs."""
    if y_true is None or y_pred is None:
        raise ValueError("y_true and y_pred must not be None.")

    true_arr = np.asarray(y_true)
    pred_arr = np.asarray(y_pred)

    if true_arr.ndim != 1 or pred_arr.ndim != 1:
        raise ValueError(
            f"y_true and y_pred must be 1D arrays; got shapes {true_arr.shape} and {pred_arr.shape}."
        )
    if true_arr.size == 0 or pred_arr.size == 0:
        raise ValueError("Cannot compute evaluation metrics on empty label arrays.")
    if true_arr.shape[0] != pred_arr.shape[0]:
        raise ValueError(
            f"Length mismatch: y_true has {true_arr.shape[0]} samples, y_pred has {pred_arr.shape[0]}."
        )
    if not np.issubdtype(true_arr.dtype, np.integer) or not np.issubdtype(pred_arr.dtype, np.integer):
        raise ValueError(
            f"Labels must be integer class indices; got dtypes {true_arr.dtype} and {pred_arr.dtype}."
        )

    valid_set = set(int(c) for c in class_ids)
    unknown_true = set(int(v) for v in np.unique(true_arr)) - valid_set
    unknown_pred = set(int(v) for v in np.unique(pred_arr)) - valid_set
    if unknown_true:
        raise ValueError(f"y_true contains unconfigured class IDs: {sorted(unknown_true)}")
    if unknown_pred:
        raise ValueError(f"y_pred contains unconfigured class IDs: {sorted(unknown_pred)}")

    return true_arr.astype(np.int64), pred_arr.astype(np.int64)


def analyze_class_distribution(
    y_true: Sequence[int] | np.ndarray,
    class_mapping: Dict[int, str],
    imbalance_ratio_threshold: float = 2.0,
) -> Dict[str, Any]:
    """Analyze ground-truth class counts, proportions, and imbalance severity."""
    ordered_ids = sorted(int(k) for k in class_mapping.keys())
    true_arr = np.asarray(y_true, dtype=np.int64)
    total = int(true_arr.shape[0])
    if total == 0:
        raise ValueError("Cannot analyze class distribution of an empty label array.")

    counts: Dict[str, int] = {}
    proportions: Dict[str, float] = {}
    present_counts: List[int] = []
    missing_classes: List[str] = []

    for cid in ordered_ids:
        cname = class_mapping[cid]
        cnt = int(np.sum(true_arr == cid))
        counts[cname] = cnt
        proportions[cname] = round(cnt / total, 6)
        if cnt > 0:
            present_counts.append(cnt)
        else:
            missing_classes.append(cname)

    imbalance_ratio: Optional[float] = None
    is_imbalanced = False
    if len(present_counts) >= 2:
        imbalance_ratio = round(max(present_counts) / min(present_counts), 4)
        is_imbalanced = imbalance_ratio >= imbalance_ratio_threshold
    elif len(present_counts) <= 1:
        is_imbalanced = True

    return {
        "total_samples": total,
        "class_counts": counts,
        "class_proportions": proportions,
        "missing_classes_in_split": missing_classes,
        "max_to_min_present_ratio": imbalance_ratio,
        "significant_imbalance_detected": is_imbalanced,
        "imbalance_ratio_threshold": imbalance_ratio_threshold,
    }


def compute_classification_metrics(
    y_true: Sequence[int] | np.ndarray,
    y_pred: Sequence[int] | np.ndarray,
    class_mapping: Dict[int, str],
) -> Dict[str, Any]:
    """Compute overall, macro, weighted, micro, per-class metrics, and confusion matrix.

    Confusion Matrix Orientation:
        - Rows    = Actual (ground-truth) class in ascending class ID order.
        - Columns = Predicted class in ascending class ID order.
    """
    if not class_mapping:
        raise ValueError("class_mapping must contain at least one class definition.")

    ordered_ids = sorted(int(k) for k in class_mapping.keys())
    ordered_names = [class_mapping[cid] for cid in ordered_ids]
    true_arr, pred_arr = _validate_labels_and_predictions(y_true, y_pred, ordered_ids)

    acc = float(accuracy_score(true_arr, pred_arr))

    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        true_arr, pred_arr, labels=ordered_ids, average="macro", zero_division=0
    )
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        true_arr, pred_arr, labels=ordered_ids, average="weighted", zero_division=0
    )
    micro_p, micro_r, micro_f1, _ = precision_recall_fscore_support(
        true_arr, pred_arr, labels=ordered_ids, average="micro", zero_division=0
    )

    per_p, per_r, per_f1, per_support = precision_recall_fscore_support(
        true_arr, pred_arr, labels=ordered_ids, average=None, zero_division=0
    )

    cm = confusion_matrix(true_arr, pred_arr, labels=ordered_ids)

    per_class_report: List[Dict[str, Any]] = []
    warnings: List[str] = []

    for idx, cid in enumerate(ordered_ids):
        cname = class_mapping[cid]
        gt_count = int(per_support[idx])
        pred_count = int(np.sum(pred_arr == cid))

        if gt_count == 0:
            warnings.append(f"Class '{cname}' (id={cid}) has 0 ground-truth samples in this split.")
        if pred_count == 0:
            warnings.append(f"Class '{cname}' (id={cid}) received 0 predicted samples.")
        if 0 < gt_count < 5:
            warnings.append(f"Class '{cname}' (id={cid}) has very low support ({gt_count} samples).")

        per_class_report.append(
            {
                "class_id": cid,
                "class_name": cname,
                "ground_truth_samples": gt_count,
                "predicted_samples": pred_count,
                "precision": None if gt_count == 0 and pred_count == 0 else float(per_p[idx]),
                "recall": None if gt_count == 0 else float(per_r[idx]),
                "f1_score": None if gt_count == 0 else float(per_f1[idx]),
            }
        )

    imbalance_summary = analyze_class_distribution(true_arr, class_mapping)

    return {
        "overall": {
            "accuracy": acc,
            "macro_precision": float(macro_p),
            "macro_recall": float(macro_r),
            "macro_f1": float(macro_f1),
            "weighted_precision": float(weighted_p),
            "weighted_recall": float(weighted_r),
            "weighted_f1": float(weighted_f1),
            "micro_precision": float(micro_p),
            "micro_recall": float(micro_r),
            "micro_f1": float(micro_f1),
        },
        "per_class": per_class_report,
        "confusion_matrix": {
            "rows_axis": "actual_class",
            "cols_axis": "predicted_class",
            "class_ids": ordered_ids,
            "class_names": ordered_names,
            "matrix": cm.tolist(),
        },
        "class_distribution": imbalance_summary,
        "warnings": warnings,
    }
