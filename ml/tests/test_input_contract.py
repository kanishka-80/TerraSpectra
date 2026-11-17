"""Unit tests for the TerraSpectra 3D-CNN Input Contract Validator and DataLoader Adapter."""

import sys
import pathlib
import unittest
import numpy as np

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.models import (
    InputContractError,
    InputContractSpec,
    adapt_4d_patch_batch_to_5d,
    validate_model_input,
)


class TestInputContract(unittest.TestCase):
    """Tests for validate_model_input and adapt_4d_patch_batch_to_5d."""

    def test_valid_5d_input_default_spec_9x9(self) -> None:
        x = np.zeros((16, 1, 100, 9, 9), dtype=np.float32)
        shape = validate_model_input(x)
        self.assertEqual(shape, (16, 1, 100, 9, 9))

    def test_adapt_4d_dataloader_batch_to_5d(self) -> None:
        x_4d = np.ones((16, 100, 9, 9), dtype=np.float32)
        x_5d = adapt_4d_patch_batch_to_5d(x_4d)
        self.assertEqual(x_5d.shape, (16, 1, 100, 9, 9))

    def test_invalid_tensor_dimensionality_4d_without_adapter(self) -> None:
        x_4d = np.zeros((8, 100, 9, 9), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected 5D tensor"):
            validate_model_input(x_4d)

    def test_invalid_channel_count(self) -> None:
        x_bad_c = np.zeros((4, 3, 100, 9, 9), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected channel dimension C=1"):
            validate_model_input(x_bad_c)

    def test_invalid_spectral_depth_when_configured(self) -> None:
        spec = InputContractSpec(expected_depth=200)
        x_wrong_d = np.zeros((4, 1, 120, 9, 9), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected spectral depth D=200"):
            validate_model_input(x_wrong_d, spec=spec)

    def test_too_small_spectral_depth(self) -> None:
        x_rgb_like = np.zeros((4, 1, 3, 9, 9), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "smaller than minimum required depth"):
            validate_model_input(x_rgb_like)

    def test_empty_tensor_dimension(self) -> None:
        x_empty = np.zeros((0, 1, 50, 9, 9), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "zero or negative dimensions"):
            validate_model_input(x_empty)

    def test_invalid_spatial_dimensions(self) -> None:
        x_bad_hw = np.zeros((4, 1, 50, 13, 13), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "Expected spatial height H=9"):
            validate_model_input(x_bad_hw)

    def test_even_spatial_dimensions_rejected(self) -> None:
        spec = InputContractSpec(expected_height=None, expected_width=None, require_odd_spatial=True)
        x_even = np.zeros((4, 1, 50, 10, 10), dtype=np.float32)
        with self.assertRaisesRegex(InputContractError, "must be odd"):
            validate_model_input(x_even, spec=spec)

    def test_nan_values_rejected(self) -> None:
        x_nan = np.zeros((2, 1, 50, 9, 9), dtype=np.float32)
        x_nan[0, 0, 10, 4, 4] = np.nan
        with self.assertRaisesRegex(InputContractError, "contains NaN values"):
            validate_model_input(x_nan)

    def test_inf_values_rejected(self) -> None:
        x_inf = np.zeros((2, 1, 50, 9, 9), dtype=np.float32)
        x_inf[0, 0, 5, 2, 2] = np.inf
        with self.assertRaisesRegex(InputContractError, "contains Infinite"):
            validate_model_input(x_inf)

    def test_unsupported_dtype_rejected(self) -> None:
        x_f64 = np.zeros((2, 1, 50, 9, 9), dtype=np.float64)
        with self.assertRaisesRegex(InputContractError, "Unsupported data type 'float64'"):
            validate_model_input(x_f64)


if __name__ == "__main__":
    unittest.main()
