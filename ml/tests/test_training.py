"""Automated unit tests for the TerraSpectra reproducible training pipeline.

Note: Small synthetic tensor fixtures used here strictly validate training software
mechanics (forward/backward updates, validation isolation, checkpointing, and seeding).
They are NOT real hyperspectral datasets and make zero accuracy claims.
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

from terraspectra_ml.models import TerraSpectra3DCNN
from terraspectra_ml.training import (
    build_loss_function,
    build_optimizer,
    load_checkpoint,
    run_training,
    set_reproducibility_seed,
    train_one_epoch,
    validate_one_epoch,
)


class TestTrainingPipeline(unittest.TestCase):
    """Validates engine, validation mode, loss/optimizer configs, checkpoints, and error handling."""

    def setUp(self) -> None:
        set_reproducibility_seed(42, deterministic=True)
        self.model = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        )
        x_train = torch.rand((16, 32, 9, 9), dtype=torch.float32)
        y_train = torch.randint(0, 2, (16,), dtype=torch.long)
        x_val = torch.rand((8, 32, 9, 9), dtype=torch.float32)
        y_val = torch.randint(0, 2, (8,), dtype=torch.long)

        self.train_loader = DataLoader(TensorDataset(x_train, y_train), batch_size=8, shuffle=False)
        self.val_loader = DataLoader(TensorDataset(x_val, y_val), batch_size=8, shuffle=False)

    def test_train_one_epoch_updates_weights(self) -> None:
        device = torch.device("cpu")
        self.model.to(device)
        criterion = build_loss_function({"name": "CrossEntropyLoss"}, device=device)
        optimizer = build_optimizer(self.model, {"name": "AdamW", "learning_rate": 1e-3})

        before_params = [p.detach().clone() for p in self.model.parameters()]
        stats = train_one_epoch(self.model, self.train_loader, criterion, optimizer, device)

        self.assertGreater(stats["train_loss"], 0.0)
        self.assertEqual(stats["num_samples"], 16.0)
        changed = any(
            not torch.equal(b, a.detach()) for b, a in zip(before_params, self.model.parameters())
        )
        self.assertTrue(changed, "Model parameters did not update during training step.")

    def test_validate_one_epoch_preserves_weights_and_sets_eval(self) -> None:
        device = torch.device("cpu")
        self.model.to(device)
        criterion = build_loss_function({"name": "CrossEntropyLoss"}, device=device)

        before_params = [p.detach().clone() for p in self.model.parameters()]
        stats = validate_one_epoch(self.model, self.val_loader, criterion, device)

        self.assertFalse(self.model.training)
        self.assertGreater(stats["val_loss"], 0.0)
        for b, a in zip(before_params, self.model.parameters()):
            self.assertTrue(torch.equal(b, a.detach()), "Validation modified model parameters.")

    def test_checkpoint_save_load_and_resume(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(ROOT_DIR / "configs" / "training.yaml", "r", encoding="utf-8") as f:
                cfg = yaml.safe_load(f)

            cfg["training"]["epochs"] = 2
            cfg["checkpointing"]["checkpoint_dir"] = str(pathlib.Path(tmpdir) / "ckpts")
            cfg["checkpointing"]["save_recovery_every_n_epochs"] = 1
            cfg["logging"]["run_id"] = "test_smoke"
            cfg["logging"]["output_dir"] = str(pathlib.Path(tmpdir) / "runs")
            cfg["hardware"]["device_preference"] = "cpu"

            summary = run_training(cfg, self.model, self.train_loader, self.val_loader)
            self.assertEqual(len(summary["history"]), 2)
            self.assertIsNotNone(summary["best_checkpoint"])
            self.assertIsNotNone(summary["last_recovery_checkpoint"])

            # Verify best checkpoint loads cleanly
            best_model = TerraSpectra3DCNN.from_configs(
                model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
                classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
            )
            best_opt = build_optimizer(best_model, cfg["optimizer"])
            best_ckpt = load_checkpoint(summary["best_checkpoint"], best_model, best_opt)
            self.assertIn("model_state_dict", best_ckpt)
            self.assertIn("optimizer_state_dict", best_ckpt)
            self.assertEqual(best_ckpt["random_seed"], 42)

            # Verify final-epoch recovery checkpoint matches final in-memory model weights identically
            restored_model = TerraSpectra3DCNN.from_configs(
                model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
                classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
            )
            restored_opt = build_optimizer(restored_model, cfg["optimizer"])
            rec_ckpt = load_checkpoint(summary["last_recovery_checkpoint"], restored_model, restored_opt)
            self.assertEqual(rec_ckpt["epoch"], 2)

            for p1, p2 in zip(self.model.parameters(), restored_model.parameters()):
                self.assertTrue(torch.equal(p1.cpu(), p2.cpu()))

    def test_invalid_configs_and_batches_raise_clear_errors(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported optimizer"):
            build_optimizer(self.model, {"name": "InvalidOpt"})

        with self.assertRaisesRegex(ValueError, "Unsupported loss function"):
            build_loss_function({"name": "UnsupportedLoss"})

        with self.assertRaisesRegex(ValueError, "use_class_weights=True requires explicit"):
            build_loss_function({"name": "CrossEntropyLoss", "use_class_weights": True})

        criterion = build_loss_function({"name": "CrossEntropyLoss"})
        optimizer = build_optimizer(self.model, {"name": "AdamW"})
        bad_loader = [torch.zeros((4, 32, 9, 9))]
        with self.assertRaisesRegex(ValueError, "tuple/list of"):
            train_one_epoch(self.model, bad_loader, criterion, optimizer, torch.device("cpu"))


if __name__ == "__main__":
    unittest.main()
