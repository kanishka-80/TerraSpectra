"""End-to-end integration tests between Khushi's data pipeline and Harsh's 3D-CNN pipeline.

Note: Because the final hyperspectral scene and ground-truth labels remain UNCONFIRMED
in data.yaml / classes.yaml, these tests execute Khushi's actual preprocessing, patch
extraction, spatial splitting, PatchDataset, and make_dataloader implementations on
explicitly labeled synthetic hyperspectral cubes solely to verify software integration.
They are NOT real hyperspectral classification results.
"""

import importlib.util
import pathlib
import subprocess
import sys
import tempfile
import unittest
import numpy as np
import torch
import yaml

ROOT_DIR = pathlib.Path(__file__).resolve().parents[1]
REPO_DIR = ROOT_DIR.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from terraspectra_ml.models import (
    InputContractSpec,
    TerraSpectra3DCNN,
    adapt_4d_patch_batch_to_5d,
)
from terraspectra_ml.training import (
    build_loss_function,
    build_optimizer,
    set_reproducibility_seed,
    train_one_epoch,
    validate_one_epoch,
)


def _load_module(rel_path: str, module_name: str, git_ref: str = "origin/khushi"):
    """Load a module from local disk if present, otherwise from the specified Git ref."""
    local_file = REPO_DIR / rel_path
    if local_file.exists():
        spec = importlib.util.spec_from_file_location(module_name, local_file)
        mod = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(mod)
        return mod

    code = subprocess.check_output(
        ["git", "show", f"{git_ref}:{rel_path}"],
        cwd=str(REPO_DIR),
        text=True,
    )
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as tmp:
        tmp.write(code)
        tmp_path = tmp.name
    spec = importlib.util.spec_from_file_location(module_name, tmp_path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod


class TestDataModelIntegration(unittest.TestCase):
    """Verifies Khushi's DataLoader + preprocessing + spatial split with TerraSpectra3DCNN."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.preproc_mod = _load_module(
            "ml/src/terraspectra_ml/data/preprocessing.py", "khushi_preprocessing"
        )
        cls.patch_mod = _load_module(
            "ml/src/terraspectra_ml/data/patch_dataset.py", "khushi_patch_dataset"
        )
        cls.loaders_mod = _load_module(
            "ml/src/terraspectra_ml/data/loaders.py", "khushi_loaders"
        )
        cls.split_mod = _load_module(
            "ml/src/terraspectra_ml/evaluation/spatial_split.py", "khushi_spatial_split"
        )
        cls.eval_script = _load_module("ml/scripts/evaluate.py", "evaluate_script")

    def test_end_to_end_khushi_dataloader_to_3dcnn_train_val_eval(self) -> None:
        set_reproducibility_seed(42, deterministic=True)
        rng = np.random.default_rng(42)

        # 1. Synthetic hyperspectral cube (D=48 bands, H=24, W=24) for software integration only
        raw_cube = rng.uniform(0.05, 0.95, size=(48, 24, 24)).astype(np.float32)

        # 2. Extract 9x9 patches using Khushi's extract_patches()
        patches = self.patch_mod.extract_patches(raw_cube, patch_size=9, stride=3)
        self.assertEqual(patches.ndim, 4)
        self.assertEqual(patches.shape[1:], (48, 9, 9))

        n_samples = patches.shape[0]
        labels = rng.integers(0, 2, size=(n_samples,), dtype=np.int64)
        spatial_groups = np.arange(n_samples) // 4

        # 3. Spatial group split using Khushi's spatial_group_split()
        splits = self.split_mod.spatial_group_split(
            spatial_groups, train_fraction=0.6, validation_fraction=0.2, seed=42
        )
        train_mask = np.isin(spatial_groups, splits["train_groups"])
        val_mask = np.isin(spatial_groups, splits["validation_groups"])
        test_mask = np.isin(spatial_groups, splits["test_groups"])

        self.assertFalse(np.any(train_mask & val_mask))
        self.assertFalse(np.any(train_mask & test_mask))
        self.assertFalse(np.any(val_mask & test_mask))

        # 4. Fit Khushi's StandardNormalizer strictly on training patches
        normalizer = self.preproc_mod.StandardNormalizer()
        train_patches = normalizer.fit_transform(patches[train_mask])
        val_patches = normalizer.transform(patches[val_mask])
        self.assertEqual(train_patches.dtype, np.float32)
        self.assertTrue(np.isfinite(train_patches).all())

        # 5. Build PyTorch DataLoaders via Khushi's make_dataloader()
        train_loader = self.loaders_mod.make_dataloader(
            train_patches, labels=labels[train_mask], batch_size=8, shuffle=False, seed=42
        )
        val_loader = self.loaders_mod.make_dataloader(
            val_patches, labels=labels[val_mask], batch_size=8, shuffle=False, seed=42
        )

        sample_x, sample_y = next(iter(train_loader))
        self.assertEqual(sample_x.ndim, 4)
        adapted_x = adapt_4d_patch_batch_to_5d(sample_x)
        self.assertEqual(tuple(adapted_x.shape[1:]), (1, 48, 9, 9))
        self.assertEqual(sample_y.dtype, torch.int64)

        # 6. Connect to TerraSpectra3DCNN, CrossEntropyLoss, AdamW & Training Engine
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = TerraSpectra3DCNN.from_configs(
            model_config_path=ROOT_DIR / "configs" / "model_config.yaml",
            classes_config_path=ROOT_DIR / "configs" / "classes.yaml",
        ).to(device)
        criterion = build_loss_function({"name": "CrossEntropyLoss"}, device=device)
        optimizer = build_optimizer(model, {"name": "AdamW", "learning_rate": 3e-4})

        before_weights = [p.detach().clone() for p in model.parameters()]
        train_stats = train_one_epoch(model, train_loader, criterion, optimizer, device)
        self.assertTrue(np.isfinite(train_stats["train_loss"]))
        self.assertTrue(
            any(not torch.equal(b, a.detach()) for b, a in zip(before_weights, model.parameters()))
        )

        # 7. Run Validation & Evaluation Module without modifying weights
        val_stats = validate_one_epoch(model, val_loader, criterion, device)
        self.assertTrue(np.isfinite(val_stats["val_loss"]))

        eval_report = self.eval_script.evaluate_model_on_loader(
            model=model,
            dataloader=val_loader,
            class_mapping={0: "healthy", 1: "stressed"},
            device=device,
            metadata={"experiment_id": "day12_integration_smoke", "is_synthetic_smoke_fixture": True},
        )
        self.assertIn("accuracy", eval_report["evaluation_metrics"])
        self.assertEqual(eval_report["confusion_matrix"]["class_names"], ["healthy", "stressed"])

    def test_khushi_data_yaml_16x16_patch_compatibility(self) -> None:
        spec_16 = InputContractSpec(
            expected_height=16,
            expected_width=16,
            require_odd_spatial=False,
        )
        with open(ROOT_DIR / "configs" / "model_config.yaml", "r", encoding="utf-8") as f:
            model_cfg = yaml.safe_load(f)

        model_16 = TerraSpectra3DCNN(model_cfg=model_cfg, num_classes=2, contract_spec=spec_16)
        batch_16 = torch.rand((4, 32, 16, 16), dtype=torch.float32)
        adapted_16 = adapt_4d_patch_batch_to_5d(batch_16, spec=spec_16)
        logits = model_16(adapted_16)
        self.assertEqual(tuple(logits.shape), (4, 2))


if __name__ == "__main__":
    unittest.main()
