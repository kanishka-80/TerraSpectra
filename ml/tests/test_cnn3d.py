"""Automated unit and smoke tests for the TerraSpectra PyTorch 3D-CNN architecture.

Note: Synthetic tensor fixtures used here strictly validate model initialization,
forward-pass shapes, input-contract enforcement, and numerical finiteness.
They are NOT real hyperspectral datasets and make zero performance claims.
"""

import pathlib
import sys
import unittest
import torch

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.models import (
    ClassificationHead,
    Conv3DBlock,
    InputContractError,
    SpatialSpectral3DExtractor,
    TerraSpectra3DCNN,
    adapt_4d_patch_batch_to_5d,
)


class TestTerraSpectra3DCNN(unittest.TestCase):
    """Tests initialization, forward pass, feature shapes, error handling, and device execution."""

    def setUp(self) -> None:
        torch.manual_seed(42)
        self.model = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )
        self.model.eval()

    def test_model_initialization_from_configs(self) -> None:
        self.assertIsInstance(self.model, TerraSpectra3DCNN)
        self.assertIsInstance(self.model.feature_extractor, SpatialSpectral3DExtractor)
        self.assertIsInstance(self.model.classifier, ClassificationHead)
        self.assertEqual(len(self.model.feature_extractor.blocks), 3)
        for block in self.model.feature_extractor.blocks:
            self.assertIsInstance(block, Conv3DBlock)
        self.assertEqual(self.model.num_classes, 2)

    def test_forward_pass_and_output_dimensions(self) -> None:
        x = torch.rand((8, 1, 103, 9, 9), dtype=torch.float32)
        with torch.no_grad():
            logits = self.model(x)
            probs = self.model.predict_probabilities(x)

        self.assertEqual(logits.ndim, 2)
        self.assertEqual(tuple(logits.shape), (8, 2))
        self.assertTrue(torch.isfinite(logits).all().item())
        self.assertTrue(torch.allclose(probs.sum(dim=-1), torch.ones(8), atol=1e-5))

    def test_variable_spectral_bands_supported(self) -> None:
        for bands in (32, 103, 200):
            x = torch.rand((4, 1, bands, 9, 9), dtype=torch.float32)
            with torch.no_grad():
                logits = self.model(x)
            self.assertEqual(tuple(logits.shape), (4, 2))

    def test_dataloader_4d_adapter_end_to_end_forward(self) -> None:
        batch_4d = torch.rand((16, 64, 9, 9), dtype=torch.float32)
        batch_5d = adapt_4d_patch_batch_to_5d(batch_4d)
        with torch.no_grad():
            logits = self.model(batch_5d)
        self.assertEqual(tuple(logits.shape), (16, 2))

    def test_feature_extractor_and_vit_token_shapes(self) -> None:
        x = torch.rand((4, 1, 120, 9, 9), dtype=torch.float32)
        with torch.no_grad():
            features = self.model.extract_features(x)
            vit_tokens = self.model.feature_extractor.extract_vit_tokens(x)
            head_out = self.model.classifier(features)

        self.assertEqual(tuple(features.shape), (4, 128))
        self.assertEqual(tuple(vit_tokens.shape), (4, 25, 128))
        self.assertEqual(tuple(head_out.shape), (4, 2))

    def test_invalid_inputs_rejected_by_model(self) -> None:
        # 4D input without adapter
        with self.assertRaisesRegex(InputContractError, "Expected 5D tensor"):
            self.model(torch.zeros((4, 64, 9, 9), dtype=torch.float32))

        # 6D input
        with self.assertRaisesRegex(InputContractError, "Expected 5D tensor"):
            self.model(torch.zeros((2, 1, 1, 64, 9, 9), dtype=torch.float32))

        # Unsupported float64 dtype
        with self.assertRaisesRegex(InputContractError, "Unsupported data type 'float64'"):
            self.model(torch.zeros((2, 1, 64, 9, 9), dtype=torch.float64))

        # NaN values
        x_nan = torch.zeros((2, 1, 64, 9, 9), dtype=torch.float32)
        x_nan[0, 0, 10, 4, 4] = float("nan")
        with self.assertRaisesRegex(InputContractError, "contains NaN values"):
            self.model(x_nan)

    def test_gpu_or_cpu_forward_smoke(self) -> None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model_dev = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        ).to(device)
        model_dev.eval()

        x_dev = torch.rand((16, 1, 128, 9, 9), dtype=torch.float32, device=device)
        with torch.no_grad():
            out = model_dev(x_dev)

        self.assertEqual(out.device.type, device.type)
        self.assertEqual(tuple(out.shape), (16, 2))
        self.assertTrue(torch.isfinite(out).all().item())


    def test_top_level_extract_vit_tokens_delegator(self) -> None:
        model = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )
        x = torch.rand((2, 1, 64, 9, 9), dtype=torch.float32)
        tokens = model.extract_vit_tokens(x)
        self.assertEqual(tuple(tokens.shape), (2, 25, 128))


if __name__ == "__main__":
    unittest.main()
