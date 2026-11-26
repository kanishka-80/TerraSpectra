import argparse
import json
import os
from pathlib import Path

import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import RobustScaler, StandardScaler


def validate_splits(splits):
    required = ("X_train", "X_val", "X_test")

    for name in required:
        if name not in splits:
            raise ValueError(f"Missing required array: {name}")

        array = np.asarray(splits[name])

        if array.ndim != 2:
            raise ValueError(f"{name} must be a 2D array")

        if array.shape[0] == 0 or array.shape[1] == 0:
            raise ValueError(f"{name} cannot be empty")

        if not np.isfinite(array).all():
            raise ValueError(f"{name} contains NaN or infinite values")

    train = np.asarray(splits["X_train"])
    val = np.asarray(splits["X_val"])
    test = np.asarray(splits["X_test"])

    if train.shape[1] != val.shape[1] or train.shape[1] != test.shape[1]:
        raise ValueError("Train, validation and test feature counts must match")

    if train.shape[0] < 2:
        raise ValueError("At least two training samples are required for PCA")

    return train, val, test


def run_experiment(splits, data_source):
    X_train, X_val, X_test = validate_splits(splits)

    methods = {
        "standard_scaler": StandardScaler(),
        "robust_scaler": RobustScaler(),
    }

    results = {}

    for method_name, scaler in methods.items():
        # Fit ONLY on training data.
        X_train_scaled = scaler.fit_transform(X_train)

        # Reuse the exact fitted scaler on held-out data.
        X_val_scaled = scaler.transform(X_val)
        X_test_scaled = scaler.transform(X_test)

        max_components = min(X_train_scaled.shape)

        if max_components < 1:
            raise ValueError("Not enough training dimensions for PCA")

        pca = PCA(
            n_components=0.95,
            svd_solver="full"
        )

        # PCA is also fitted ONLY on training data.
        X_train_pca = pca.fit_transform(X_train_scaled)
        X_val_pca = pca.transform(X_val_scaled)
        X_test_pca = pca.transform(X_test_scaled)

        results[method_name] = {
            "scaler": method_name,
            "train_samples": int(X_train.shape[0]),
            "validation_samples": int(X_val.shape[0]),
            "test_samples": int(X_test.shape[0]),
            "input_features": int(X_train.shape[1]),
            "pca_components_retained": int(pca.n_components_),
            "pca_explained_variance_ratio": float(
                np.sum(pca.explained_variance_ratio_)
            ),
            "train_output_shape": list(X_train_pca.shape),
            "validation_output_shape": list(X_val_pca.shape),
            "test_output_shape": list(X_test_pca.shape),
            "training_scaler_center": np.asarray(
                getattr(scaler, "center_", getattr(scaler, "mean_", []))
            ).tolist(),
            "training_scaler_scale": np.asarray(
                getattr(scaler, "scale_", [])
            ).tolist(),
        }

    return {
        "data_source": data_source,
        "data_kind": (
            "real_dataset"
            if data_source != "deterministic_synthetic_smoke_test"
            else "synthetic_software_smoke_test"
        ),
        "fit_policy": (
            "Both normalization and PCA are fitted on training data only. "
            "The fitted transformations are reused unchanged on validation "
            "and test data."
        ),
        "band_selection_changed": False,
        "split_changed": False,
        "results": results,
    }


def load_npz(path):
    with np.load(path, allow_pickle=False) as data:
        required = ("X_train", "X_val", "X_test")

        missing = [key for key in required if key not in data.files]
        if missing:
            raise ValueError(
                f"NPZ is missing required arrays: {', '.join(missing)}"
            )

        return {key: data[key] for key in required}


def make_synthetic_smoke_test_data():
    rng = np.random.default_rng(42)

    train = rng.normal(10, 3, size=(256, 16))
    val = rng.normal(10, 3, size=(64, 16))
    test = rng.normal(10, 3, size=(64, 16))

    return {
        "X_train": train,
        "X_val": val,
        "X_test": test,
    }


def write_markdown_report(result, output_path):
    lines = [
        "# Week 3 Day 4 — Controlled Preprocessing Experiments",
        "",
        f"- Data source: `{result['data_source']}`",
        f"- Data kind: `{result['data_kind']}`",
        "- Band selection changed: No",
        "- Split changed: No",
        "",
        "## Experiment methodology",
        "",
        "Two normalization methods were compared: StandardScaler and "
        "RobustScaler.",
        "",
        "For each method, the scaler was fitted on training data only. "
        "The fitted scaler was reused without refitting on validation and "
        "test data.",
        "",
        "PCA was fitted only on the scaled training data with a 95% "
        "explained-variance target. The fitted PCA transformation was "
        "then reused on validation and test data.",
        "",
        "## Results",
        "",
    ]

    for name, item in result["results"].items():
        lines.extend([
            f"### {name}",
            "",
            f"- Training samples: {item['train_samples']}",
            f"- Validation samples: {item['validation_samples']}",
            f"- Test samples: {item['test_samples']}",
            f"- Input features: {item['input_features']}",
            f"- PCA components retained: {item['pca_components_retained']}",
            f"- Explained variance retained: "
            f"{item['pca_explained_variance_ratio']:.6f}",
            f"- Train output shape: `{item['train_output_shape']}`",
            f"- Validation output shape: `{item['validation_output_shape']}`",
            f"- Test output shape: `{item['test_output_shape']}`",
            "",
        ])

    lines.extend([
        "## Reproducibility and limitations",
        "",
        result["fit_policy"],
        "",
        "No band selection or split modification was performed in this "
        "comparison.",
        "",
    ])

    if result["data_kind"] == "synthetic_software_smoke_test":
        lines.extend([
            "**Important:** No real hyperspectral dataset was supplied to "
            "this run. The results above are from deterministic synthetic "
            "data and verify software behavior only. They are not scientific "
            "evidence, real-scene validation, or a recommendation for model "
            "training.",
            "",
            "A real-data comparison remains pending until the team supplies "
            "the approved train/validation/test feature arrays and dataset "
            "version.",
            "",
        ])
    else:
        lines.extend([
            "This run used the supplied NPZ arrays. Dataset provenance, "
            "sensor metadata, label meaning, split approval and dataset "
            "version must be verified separately before model comparison.",
            "",
        ])

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input",
        default=os.environ.get("TERRASPECTRA_EXPERIMENT_NPZ"),
        help=(
            "Optional NPZ containing X_train, X_val and X_test. "
            "If omitted, a synthetic software smoke test is run."
        ),
    )
    parser.add_argument(
        "--output",
        default="reports/data/preprocessing_experiments.md",
    )
    args = parser.parse_args()

    if args.input:
        input_path = Path(args.input)

        if not input_path.is_file():
            raise FileNotFoundError(
                f"Experiment input file not found: {input_path}"
            )

        splits = load_npz(input_path)
        source = str(input_path)
    else:
        splits = make_synthetic_smoke_test_data()
        source = "deterministic_synthetic_smoke_test"

    result = run_experiment(splits, source)

    report_path = Path(args.output)
    write_markdown_report(result, report_path)

    config_path = Path(
        "ml/configs/week3_preprocessing_experiment.json"
    )
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(
        json.dumps(result, indent=2),
        encoding="utf-8",
    )

    print("========== EXPERIMENT COMPLETE ==========")
    print(f"Data kind: {result['data_kind']}")
    print(f"Markdown report: {report_path}")
    print(f"Experiment config: {config_path}")

    for name, item in result["results"].items():
        print(
            f"{name}: PCA components={item['pca_components_retained']}, "
            f"variance={item['pca_explained_variance_ratio']:.4f}"
        )


if __name__ == "__main__":
    main()
