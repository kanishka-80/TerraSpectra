"""Unit and integration tests for TerraSpectraHybridCNNViT and ConcatProjectionFusion (Day 18).

Note: All tensors used here are synthetic software fixtures for verifying branch shapes,
fusion dimensions, logits, gradient propagation, and device execution only.
They do not represent real hyperspectral classification accuracy.
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
    ConcatProjectionFusion,
    TerraSpectra3DCNN,
    TerraSpectraHybridCNNViT,
    TerraSpectraViT,
)


class TestHybridCNNViTShapesAndGradients(unittest.TestCase):
    """Covers initialization, branch dimensions, fusion, logits, gradients, and devices."""

    def _build_hybrid(self, num_classes: int = 2) -> TerraSpectraHybridCNNViT:
        return TerraSpectraHybridCNNViT.from_configs(
            hybrid_config_path=ROOT_DIR / "configs" / "hybrid_3dcnn_vit.yaml",
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            vit_config_path=ROOT_DIR / "configs" / "vit.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
            num_classes_override=num_classes,
        )

    def test_01_model_initialization_and_standalone_preservation(self) -> None:
        hybrid = self._build_hybrid(num_classes=3)
        self.assertEqual(hybrid.num_classes, 3)
        self.assertEqual(hybrid.fused_dim, 128)
        self.assertIsInstance(hybrid.cnn, TerraSpectra3DCNN)
        self.assertIsInstance(hybrid.vit, TerraSpectraViT)
        self.assertIsInstance(hybrid.fusion, ConcatProjectionFusion)

        # Standalone CNN and ViT remain runnable independently
        x_cube = torch.randn((2, 1, 32, 9, 9), dtype=torch.float32)
        cnn_logits = hybrid.cnn(x_cube)
        vit_tokens = hybrid.cnn.extract_vit_tokens(x_cube)
        vit_logits = hybrid.vit(vit_tokens)
        self.assertEqual(tuple(cnn_logits.shape), (2, 3))
        self.assertEqual(tuple(vit_logits.shape), (2, 3))

    def test_02_branch_and_fusion_dimensions(self) -> None:
        hybrid = self._build_hybrid(num_classes=2)
        hybrid.eval()
        x_cube = torch.randn((4, 1, 64, 9, 9), dtype=torch.float32)
        with torch.no_grad():
            reps = hybrid.extract_branch_representations(x_cube)
            logits = hybrid(x_cube)

        self.assertEqual(tuple(reps["cnn_features"].shape), (4, 128))
        self.assertEqual(tuple(reps["vit_tokens"].shape), (4, 25, 128))
        self.assertEqual(tuple(reps["vit_embedding"].shape), (4, 128))
        self.assertEqual(tuple(reps["fused_features"].shape), (4, 128))
        self.assertEqual(tuple(logits.shape), (4, 2))
        self.assertTrue(torch.isfinite(logits).all())

    def test_03_fusion_module_validation(self) -> None:
        fusion = ConcatProjectionFusion(cnn_dim=128, vit_dim=128, fused_dim=64, dropout=0.0)
        c = torch.randn((5, 128), dtype=torch.float32)
        v = torch.randn((5, 128), dtype=torch.float32)
        out = fusion(c, v)
        self.assertEqual(tuple(out.shape), (5, 64))
        self.assertTrue(torch.isfinite(out).all())

        # Wrong feature dimension
        with self.assertRaises(ValueError):
            fusion(torch.randn((5, 64), dtype=torch.float32), v)
        # Batch mismatch
        with self.assertRaises(ValueError):
            fusion(torch.randn((4, 128), dtype=torch.float32), v)
        # NaN rejection
        bad_v = v.clone()
        bad_v[0, 0] = float("nan")
        with self.assertRaises(ValueError):
            fusion(c, bad_v)

    def test_04_gradient_propagation_across_both_branches(self) -> None:
        hybrid = self._build_hybrid(num_classes=2)
        hybrid.train()
        hybrid.zero_grad(set_to_none=True)

        x_cube = torch.randn((3, 1, 48, 9, 9), dtype=torch.float32)
        targets = torch.tensor([0, 1, 0], dtype=torch.long)
        logits = hybrid(x_cube)
        loss = torch.nn.functional.cross_entropy(logits, targets)
        loss.backward()

        cnn_grads = [p.grad.abs().sum().item() for p in hybrid.cnn.feature_extractor.parameters() if p.grad is not None]
        vit_grads = [p.grad.abs().sum().item() for p in hybrid.vit.encoder.parameters() if p.grad is not None]
        fusion_grads = [p.grad.abs().sum().item() for p in hybrid.fusion.parameters() if p.grad is not None]
        head_grads = [p.grad.abs().sum().item() for p in hybrid.classifier.parameters() if p.grad is not None]

        self.assertGreater(sum(cnn_grads), 0.0)
        self.assertGreater(sum(vit_grads), 0.0)
        self.assertGreater(sum(fusion_grads), 0.0)
        self.assertGreater(sum(head_grads), 0.0)

    def test_05_cpu_and_cuda_execution(self) -> None:
        hybrid = self._build_hybrid(num_classes=2)
        x_cpu = torch.randn((2, 1, 32, 9, 9), dtype=torch.float32)
        hybrid_cpu = hybrid.to("cpu").eval()
        with torch.no_grad():
            out_cpu = hybrid_cpu(x_cpu)
        self.assertEqual(tuple(out_cpu.shape), (2, 2))
        self.assertTrue(torch.isfinite(out_cpu).all())

        if torch.cuda.is_available():
            dev = torch.device("cuda")
            hybrid_gpu = hybrid.to(dev).eval()
            x_gpu = x_cpu.to(dev)
            with torch.no_grad():
                out_gpu = hybrid_gpu(x_gpu)
            self.assertEqual(tuple(out_gpu.shape), (2, 2))
            self.assertTrue(torch.isfinite(out_gpu).all())


if __name__ == "__main__":
    unittest.main()
