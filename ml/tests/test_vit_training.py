"""Integration tests for standalone TerraSpectraViT training & checkpointing (Day 17).

Note: All tensors used here are synthetic software fixtures for verifying forward/backward
passes, optimizer updates, validation mode, and checkpoint save/load mechanics only.
They do not represent real hyperspectral classification accuracy.
"""

import pathlib
import sys
import tempfile
import unittest
import torch
from torch.utils.data import DataLoader, TensorDataset
import yaml

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.models import TerraSpectraViT
from terraspectra_ml.training.train import load_checkpoint, main


class TestStandaloneViTTrainingPipeline(unittest.TestCase):
    """Verify standalone ViT connects cleanly to shared training and checkpointing."""

    def _make_synthetic_4d_loaders(self, num_samples: int = 16, bands: int = 32, patch_size: int = 9):
        gen = torch.Generator().manual_seed(42)
        x_train = torch.randn((num_samples, bands, patch_size, patch_size), generator=gen, dtype=torch.float32)
        y_train = torch.randint(0, 2, (num_samples,), generator=gen, dtype=torch.long)
        x_val = torch.randn((8, bands, patch_size, patch_size), generator=gen, dtype=torch.float32)
        y_val = torch.randint(0, 2, (8,), generator=gen, dtype=torch.long)

        train_loader = DataLoader(TensorDataset(x_train, y_train), batch_size=4, shuffle=False, num_workers=0)
        val_loader = DataLoader(TensorDataset(x_val, y_val), batch_size=4, shuffle=False, num_workers=0)
        return train_loader, val_loader

    def test_vit_end_to_end_training_and_checkpoint_restore(self) -> None:
        train_loader, val_loader = self._make_synthetic_4d_loaders()
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = pathlib.Path(tmpdir)
            with open(ROOT_DIR / "configs" / "vit.yaml", "r", encoding="utf-8") as vf:
                vit_cfg = yaml.safe_load(vf)

            vit_cfg["training_overrides"] = {
                "training": {"epochs": 2, "batch_size": 4, "num_workers": 0},
                "checkpointing": {
                    "checkpoint_dir": str(tmp_path / "checkpoints"),
                    "save_recovery_every_n_epochs": 1,
                },
                "logging": {
                    "run_id": "test_vit_smoke",
                    "output_dir": str(tmp_path / "logs"),
                },
            }
            custom_vit_yaml = tmp_path / "vit_test.yaml"
            with open(custom_vit_yaml, "w", encoding="utf-8") as out_f:
                yaml.safe_dump(vit_cfg, out_f, sort_keys=False)

            summary = main(
                training_config_path=ROOT_DIR / "configs" / "training.yaml",
                classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
                train_loader=train_loader,
                val_loader=val_loader,
                model_type="vit",
                vit_config_path=custom_vit_yaml,
            )

            self.assertEqual(summary["run_id"], "test_vit_smoke")
            self.assertEqual(len(summary["history"]), 2)
            for row in summary["history"]:
                self.assertTrue(torch.isfinite(torch.tensor(row["train_loss"])))
                self.assertTrue(torch.isfinite(torch.tensor(row["val_loss"])))

            best_ckpt = pathlib.Path(summary["best_checkpoint"])
            last_ckpt = pathlib.Path(summary["last_recovery_checkpoint"])
            self.assertTrue(best_ckpt.exists())
            self.assertTrue(last_ckpt.exists())

            # Verify state restoration into a fresh TerraSpectraViT instance
            restored_model = TerraSpectraViT.from_configs(
                vit_config_path=custom_vit_yaml,
                classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
            )
            ckpt_payload = load_checkpoint(last_ckpt, model=restored_model, map_location="cpu")
            self.assertEqual(ckpt_payload["epoch"], 2)
            self.assertEqual(ckpt_payload["random_seed"], 42)

            # Verify gradients flow cleanly during a single step
            restored_model.train()
            sample_cube = torch.randn((2, 1, 32, 9, 9), dtype=torch.float32)
            logits = restored_model(sample_cube)
            loss = logits.sum()
            loss.backward()
            grad_norms = [p.grad.abs().sum().item() for p in restored_model.parameters() if p.requires_grad and p.grad is not None]
            self.assertGreater(len(grad_norms), 0)
            self.assertGreater(sum(grad_norms), 0.0)

    def test_invalid_model_type_raises_clear_error(self) -> None:
        train_loader, val_loader = self._make_synthetic_4d_loaders()
        with self.assertRaises(ValueError):
            main(
                training_config_path=ROOT_DIR / "configs" / "training.yaml",
                classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
                train_loader=train_loader,
                val_loader=val_loader,
                model_type="unknown_arch",
            )


if __name__ == "__main__":
    unittest.main()
