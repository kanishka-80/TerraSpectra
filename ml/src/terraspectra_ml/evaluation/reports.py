"""Structured evaluation report generation and export (JSON & Markdown) for TerraSpectra."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def build_evaluation_report(
    metrics_result: Dict[str, Any],
    metadata: Dict[str, Any],
    limitations: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Assemble a complete, traceable evaluation report dictionary."""
    default_limitations = [
        "Class mapping in ml/configs/classes.yaml is currently provisional (confirmed: false) until verified ground-truth labels are locked.",
        "Disease-specific forecasting or multi-date temporal progression is out of scope for single-date baseline classification.",
        "Spatial leakage risk must be controlled by evaluating strictly on spatially separated test blocks.",
    ]

    merged_metadata = {
        "experiment_id": metadata.get("experiment_id", "unavailable"),
        "model_name": metadata.get("model_name", "unavailable"),
        "model_config": metadata.get("model_config", "unavailable"),
        "training_config": metadata.get("training_config", "unavailable"),
        "preprocessing_config": metadata.get("preprocessing_config", "unavailable"),
        "dataset_name": metadata.get("dataset_name", "unavailable"),
        "dataset_version": metadata.get("dataset_version", "unavailable"),
        "dataset_source": metadata.get("dataset_source", "unavailable"),
        "evaluation_split": metadata.get("evaluation_split", "unavailable"),
        "split_identifiers": metadata.get("split_identifiers", "unavailable"),
        "spatial_split_info": metadata.get("spatial_split_info", "unavailable"),
        "checkpoint_identifier": metadata.get("checkpoint_identifier", "unavailable"),
        "random_seed": metadata.get("random_seed", "unavailable"),
        "hardware": metadata.get("hardware", "unavailable"),
        "evaluation_timestamp_utc": metadata.get(
            "evaluation_timestamp_utc", datetime.now(timezone.utc).isoformat()
        ),
        "is_synthetic_smoke_fixture": bool(metadata.get("is_synthetic_smoke_fixture", False)),
    }

    return {
        "experiment_metadata": merged_metadata,
        "evaluation_metrics": metrics_result["overall"],
        "per_class_analysis": metrics_result["per_class"],
        "confusion_matrix": metrics_result["confusion_matrix"],
        "class_distribution": metrics_result["class_distribution"],
        "warnings": metrics_result.get("warnings", []),
        "limitations": limitations if limitations is not None else default_limitations,
    }


def render_markdown_report(report: Dict[str, Any]) -> str:
    """Render an evaluation report dictionary into human-readable Markdown."""
    meta = report["experiment_metadata"]
    overall = report["evaluation_metrics"]
    cm = report["confusion_matrix"]
    dist = report["class_distribution"]

    lines: List[str] = [
        f"# TerraSpectra Evaluation Report — `{meta['experiment_id']}`",
        "",
        "## 1. Experiment & Reproducibility Metadata",
        f"- **Model Name:** `{meta['model_name']}`",
        f"- **Dataset:** `{meta['dataset_name']}` (version: `{meta['dataset_version']}`)",
        f"- **Evaluation Split:** `{meta['evaluation_split']}`",
        f"- **Checkpoint:** `{meta['checkpoint_identifier']}`",
        f"- **Random Seed:** `{meta['random_seed']}`",
        f"- **Hardware:** `{meta['hardware']}`",
        f"- **Timestamp (UTC):** `{meta['evaluation_timestamp_utc']}`",
        "",
        "## 2. Aggregated Metrics",
        "| Metric | Value |",
        "| :--- | :---: |",
        f"| **Accuracy** | `{overall['accuracy']:.4f}` |",
        f"| **Macro Precision** | `{overall['macro_precision']:.4f}` |",
        f"| **Macro Recall** | `{overall['macro_recall']:.4f}` |",
        f"| **Macro F1** | `{overall['macro_f1']:.4f}` |",
        f"| **Weighted Precision** | `{overall['weighted_precision']:.4f}` |",
        f"| **Weighted Recall** | `{overall['weighted_recall']:.4f}` |",
        f"| **Weighted F1** | `{overall['weighted_f1']:.4f}` |",
        "",
        "## 3. Per-Class Performance",
        "| Class ID | Class Name | GT Samples | Predicted | Precision | Recall | F1-Score |",
        "| :---: | :--- | :---: | :---: | :---: | :---: | :---: |",
    ]

    for row in report["per_class_analysis"]:
        p_str = f"{row['precision']:.4f}" if row["precision"] is not None else "N/A"
        r_str = f"{row['recall']:.4f}" if row["recall"] is not None else "N/A"
        f_str = f"{row['f1_score']:.4f}" if row["f1_score"] is not None else "N/A"
        lines.append(
            f"| {row['class_id']} | `{row['class_name']}` | {row['ground_truth_samples']} | "
            f"{row['predicted_samples']} | {p_str} | {r_str} | {f_str} |"
        )

    lines.extend(
        [
            "",
            "## 4. Confusion Matrix (Rows = Actual, Columns = Predicted)",
            f"- **Class Order:** {cm['class_names']}",
            "",
        ]
    )
    header = "| Actual \\ Predicted | " + " | ".join(f"`{n}`" for n in cm["class_names"]) + " |"
    sep = "| :--- | " + " | ".join(":---:" for _ in cm["class_names"]) + " |"
    lines.extend([header, sep])
    for cname, row_vals in zip(cm["class_names"], cm["matrix"]):
        lines.append(f"| **`{cname}`** | " + " | ".join(str(v) for v in row_vals) + " |")

    lines.extend(
        [
            "",
            "## 5. Class Imbalance & Diagnostic Warnings",
            f"- **Total Evaluated Samples:** `{dist['total_samples']}`",
            f"- **Significant Imbalance Detected:** `{dist['significant_imbalance_detected']}` (ratio: `{dist['max_to_min_present_ratio']}`)",
        ]
    )
    for w in report.get("warnings", []):
        lines.append(f"- **Warning:** {w}")

    lines.extend(["", "## 6. Scientific & Data Limitations"])
    for lim in report.get("limitations", []):
        lines.append(f"- {lim}")

    return "\n".join(lines) + "\n"


def export_evaluation_report(
    report: Dict[str, Any],
    output_dir: str | Path,
    file_stem: str = "evaluation_report",
) -> Dict[str, Path]:
    """Export evaluation report to both JSON and Markdown files."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    json_path = out_path / f"{file_stem}.json"
    md_path = out_path / f"{file_stem}.md"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown_report(report))

    return {"json": json_path, "markdown": md_path}
