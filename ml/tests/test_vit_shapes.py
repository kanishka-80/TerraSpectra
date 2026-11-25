"""Unit tests and CPU/GPU smoke checks for TerraSpectra ViT building blocks (Day 16).

Note: All tensors used here are synthetic software fixtures for shape, finiteness,
and device verification only. They do not represent real hyperspectral accuracy.
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
    HyperspectralTokenEmbedding,
    LearnablePositionalEncoding,
    TerraSpectra3DCNN,
    TerraSpectraViT,
    TransformerEncoderBlock,
    TransformerEncoderStack,
    ViTArchitectureSpec,
    ViTClassificationHead,
)


class TestViTShapesAndForward(unittest.TestCase):
    """Covers all 8 Day 16 ViT shape, configuration, validation, and forward checks."""

    def test_01_tokenization_and_embedding_dimensions(self) -> None:
        tokenizer = HyperspectralTokenEmbedding(
            embed_dim=128, input_token_dim=128, spectral_bins=16, spatial_grid_size=5
        )
        # Case A: Pre-tokenized [B, 25, 128]
        tok_in = torch.rand((4, 25, 128), dtype=torch.float32)
        tok_out = tokenizer(tok_in)
        self.assertEqual(tuple(tok_out.shape), (4, 25, 128))

        # Case B: Raw 5D cube [B, 1, D=48, H=16, W=16] without hardcoded D, H, W
        cube_in = torch.rand((4, 1, 48, 16, 16), dtype=torch.float32)
        cube_out = tokenizer(cube_in)
        self.assertEqual(tuple(cube_out.shape), (4, 25, 128))

    def test_02_positional_encoding_compatibility(self) -> None:
        pos_cls = LearnablePositionalEncoding(
            num_tokens=25, embed_dim=128, use_cls_token=True, dropout=0.0
        )
        tokens = torch.rand((3, 25, 128), dtype=torch.float32)
        out_cls = pos_cls(tokens)
        self.assertEqual(tuple(out_cls.shape), (3, 26, 128))

        # Configurable token count interpolation (e.g., 16 tokens) without [CLS]
        pos_nocls = LearnablePositionalEncoding(
            num_tokens=25, embed_dim=128, use_cls_token=False, dropout=0.0
        )
        tokens_16 = torch.rand((3, 16, 128), dtype=torch.float32)
        out_16 = pos_nocls(tokens_16)
        self.assertEqual(tuple(out_16.shape), (3, 16, 128))

    def test_03_transformer_encoder_output_dimensions(self) -> None:
        block = TransformerEncoderBlock(embed_dim=128, num_heads=4, mlp_ratio=2.0, dropout=0.1)
        stack = TransformerEncoderStack(
            num_layers=3, embed_dim=128, num_heads=4, mlp_ratio=2.0, dropout=0.1
        )
        x = torch.rand((2, 26, 128), dtype=torch.float32)
        self.assertEqual(tuple(block(x).shape), (2, 26, 128))
        self.assertEqual(tuple(stack(x).shape), (2, 26, 128))

    def test_04_classification_logits_shape(self) -> None:
        head = ViTClassificationHead(
            embed_dim=128, num_classes=4, pooling="cls", use_cls_token=True, dropout=0.0
        )
        encoded = torch.rand((5, 26, 128), dtype=torch.float32)
        logits = head(encoded)
        self.assertEqual(tuple(logits.shape), (5, 4))

    def test_05_finite_output_values(self) -> None:
        model = TerraSpectraViT.from_configs(
            vit_config_path=ROOT_DIR / "configs" / "vit.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )
        model.eval()
        x = torch.randn((4, 25, 128), dtype=torch.float32)
        with torch.no_grad():
            logits = model(x)
            emb = model.extract_embedding(x)
        self.assertTrue(torch.isfinite(logits).all())
        self.assertTrue(torch.isfinite(emb).all())

    def test_06_configurable_input_dimensions(self) -> None:
        custom_spec = ViTArchitectureSpec(
            embed_dim=64,
            input_token_dim=96,
            num_tokens=9,
            num_heads=4,
            num_layers=2,
            mlp_ratio=2.0,
            dropout=0.0,
            use_cls_token=False,
            pooling="mean",
            spectral_bins=12,
            spatial_grid_size=3,
        )
        custom_vit = TerraSpectraViT(spec=custom_spec, num_classes=3)
        # Variable spectral depth D=72 and spatial size 11x11
        cube = torch.rand((2, 1, 72, 11, 11), dtype=torch.float32)
        logits = custom_vit(cube)
        self.assertEqual(tuple(logits.shape), (2, 3))

    def test_07_invalid_input_handling(self) -> None:
        model = TerraSpectraViT()
        # Wrong ndim (4D)
        with self.assertRaises(ValueError):
            model(torch.rand((2, 32, 9, 9), dtype=torch.float32))
        # Wrong dtype (float64)
        with self.assertRaises(TypeError):
            model(torch.rand((2, 25, 128), dtype=torch.float64))
        # NaN values
        bad = torch.rand((2, 25, 128), dtype=torch.float32)
        bad[0, 0, 0] = float("nan")
        with self.assertRaises(ValueError):
            model(bad)
        # Incompatible embed_dim % num_heads != 0
        with self.assertRaises(ValueError):
            TransformerEncoderBlock(embed_dim=130, num_heads=4)

    def test_08_complete_vit_forward_and_cpu_gpu_smoke(self) -> None:
        cnn = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )
        vit = TerraSpectraViT.from_configs(
            vit_config_path=ROOT_DIR / "configs" / "vit.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )

        # CPU smoke
        cnn_cpu = cnn.to("cpu").eval()
        vit_cpu = vit.to("cpu").eval()
        cube_cpu = torch.rand((2, 1, 64, 9, 9), dtype=torch.float32)
        with torch.no_grad():
            tokens_cpu = cnn_cpu.extract_vit_tokens(cube_cpu)
            logits_cpu = vit_cpu(tokens_cpu)
        self.assertEqual(tuple(logits_cpu.shape), (2, 2))
        self.assertTrue(torch.isfinite(logits_cpu).all())

        # GPU smoke if CUDA available
        if torch.cuda.is_available():
            dev = torch.device("cuda")
            cnn_gpu = cnn.to(dev).eval()
            vit_gpu = vit.to(dev).eval()
            cube_gpu = torch.rand((2, 1, 64, 9, 9), dtype=torch.float32, device=dev)
            with torch.no_grad():
                tokens_gpu = cnn_gpu.extract_vit_tokens(cube_gpu)
                logits_gpu = vit_gpu(tokens_gpu)
            self.assertEqual(tuple(logits_gpu.shape), (2, 2))
            self.assertTrue(torch.isfinite(logits_gpu).all())


if __name__ == "__main__":
    unittest.main()
