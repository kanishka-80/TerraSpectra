import importlib.util
from pathlib import Path

import numpy as np
import pytest


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1]
    / "scripts"
    / "run_week3_preprocessing_experiment.py"
)

spec = importlib.util.spec_from_file_location(
    "week3_preprocessing_experiment",
    SCRIPT_PATH,
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sample_splits():
    rng = np.random.default_rng(7)

    return {
        "X_train": rng.normal(5, 2, size=(80, 8)),
        "X_val": rng.normal(5, 2, size=(20, 8)),
        "X_test": rng.normal(5, 2, size=(20, 8)),
    }


def test_both_normalization_methods_are_compared():
    result = module.run_experiment(
        sample_splits(),
        "test_fixture",
    )

    assert "standard_scaler" in result["results"]
    assert "robust_scaler" in result["results"]


def test_pca_outputs_keep_consistent_sample_counts():
    result = module.run_experiment(
        sample_splits(),
        "test_fixture",
    )

    for item in result["results"].values():
        assert item["train_output_shape"][0] == 80
        assert item["validation_output_shape"][0] == 20
        assert item["test_output_shape"][0] == 20
        assert item["pca_components_retained"] >= 1


def test_held_out_data_does_not_change_training_fit():
    first = sample_splits()
    second = sample_splits()

    second["X_val"] = second["X_val"] + 100000
    second["X_test"] = second["X_test"] - 100000

    result_one = module.run_experiment(first, "first")
    result_two = module.run_experiment(second, "second")

    for method in ("standard_scaler", "robust_scaler"):
        assert (
            result_one["results"][method]["training_scaler_center"]
            == result_two["results"][method]["training_scaler_center"]
        )

        assert (
            result_one["results"][method]["training_scaler_scale"]
            == result_two["results"][method]["training_scaler_scale"]
        )


def test_mismatched_feature_counts_are_rejected():
    data = sample_splits()
    data["X_test"] = np.ones((10, 5))

    with pytest.raises(ValueError):
        module.run_experiment(data, "invalid_test")


def test_non_finite_values_are_rejected():
    data = sample_splits()
    data["X_train"][0, 0] = np.nan

    with pytest.raises(ValueError):
        module.run_experiment(data, "invalid_test")


def test_one_sample_training_set_is_rejected():
    data = {
        "X_train": np.ones((1, 4)),
        "X_val": np.ones((2, 4)),
        "X_test": np.ones((2, 4)),
    }

    with pytest.raises(ValueError):
        module.run_experiment(data, "invalid_test")
