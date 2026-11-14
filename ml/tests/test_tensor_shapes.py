"""Automated tensor-shape, dtype, and device validation tests for TerraSpectra.

Note: Synthetic tensor fixtures used here strictly test structural shape contracts
and validation logic. They are NOT real hyperspectral datasets and must never
be used for model training or performance evaluation.
"""

import pathlib
import sys
import unittest
import numpy as np

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.models import (
    InputContractError,
    InputContractSpec,
    resolve_target_device,
    validate_model_input,
)


class TestTensorShapesAndDevices(unittest.TestCase):
    """Validates 5D [B, C, D, H, W] structural rules, dtypes, and device handling."""

    def test_valid_5d_tensor_fixture(self) -> None:
        rng = np.random.default_rng(seed=42)
        synthetic_patch = rng.uniform(0.0, 1.0, size=(16, 1, 128, 13, 13)).astype(np.float32)
        b, c, d, h, w = validate_model_input(synthetic_patch)
        self.assertEqual((b, c, d, h, w), (16, 1, 128, 13, 13))

    def test_variable_spectral_band_counts_accepted(self) -> None:
        for band_count in (32, 103, 200, 224):
            tensor = np.ones((2, 1, band_count, 13, 13), dtype=np.float32)
            validated = validate_model_input(tensor)
            self.assertEqual(validated[2], band_count)

    def test_4d_input_rejected(self) -> None:
        tensor_4d = np.zeros((16, 128, 13, 13), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected 5D tensor"):
            validate_model_input(tensor_4d)

    def test_6d_input_rejected(self) -> None:
        tensor_6d = np.zeros((2, 1, 1, 128, 13, 13), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected 5D tensor"):
            validate_model_input(tensor_6d)

    def test_empty_batch_or_spatial_dimension_rejected(self) -> None:
        empty_batch = np.zeros((0, 1, 64, 13, 13), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "zero or negative dimensions"):
            validate_model_input(empty_batch)

        empty_depth = np.zeros((4, 1, 0, 13, 13), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "zero or negative dimensions"):
            validate_model_input(empty_depth)

    def test_unsupported_dtypes_rejected(self) -> None:
        for bad_dtype in (np.float64, np.int32, np.uint8):
            tensor = np.zeros((2, 1, 64, 13, 13), dtype=bad_dtype)
            with self.assertRaisesRegex(InputContractError, "Unsupported data type"):
                validate_model_input(tensor)

    def test_nan_and_inf_rejected(self) -> None:
        nan_tensor = np.zeros((2, 1, 64, 13, 13), dtype=np.float32)
        nan_tensor[1, 0, 32, 6, 6] = np.nan
        with self.assertRaisesRegex(InputContractError, "contains NaN values"):
            validate_model_input(nan_tensor)

        inf_tensor = np.zeros((2, 1, 64, 13, 13), dtype=np.float32)
        inf_tensor[0, 0, 10, 1, 1] = -np.inf
        with self.assertRaisesRegex(InputContractError, "contains Infinite"):
            validate_model_input(inf_tensor)

    def test_device_resolution_and_validation(self) -> None:
        self.assertEqual(resolve_target_device("cpu"), "cpu")
        resolved_auto = resolve_target_device("auto")
        self.assertIn(resolved_auto, ("cpu", "cuda"))

        with self.assertRaisesRegex(InputContractError, "Unsupported device specification"):
            resolve_target_device("tpu:0")

        # NumPy host array validated against cpu succeeds, against cuda fails explicitly
        host_arr = np.zeros((2, 1, 64, 13, 13), dtype=np.float32)
        self.assertEqual(
            validate_model_input(host_arr, InputContractSpec(expected_device="cpu")),
            (2, 1, 64, 13, 13),
        )
        with self.assertRaisesRegex(InputContractError, "host CPU memory"):
            validate_model_input(host_arr, InputContractSpec(expected_device="cuda"))


if __name__ == "__main__":
    unittest.main()
