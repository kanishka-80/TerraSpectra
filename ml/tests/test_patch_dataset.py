import unittest

try:
    import numpy as np
    from affine import Affine
    from terraspectra_ml.data.patch_dataset import (
        extract_patches,
        extract_patches_with_metadata,
        PatchDataset,
    )
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy or Affine is not installed")
class TestPatchDataset(unittest.TestCase):

    def test_patch_count(self):
        image = np.ones((3, 8, 8))
        patches = extract_patches(image, patch_size=4, stride=4)
        self.assertEqual(patches.shape, (4, 3, 4, 4))

    def test_dataset_without_labels(self):
        patches = np.ones((2, 3, 4, 4))
        dataset = PatchDataset(patches)
        self.assertEqual(len(dataset), 2)
        self.assertEqual(dataset[0].shape, (3, 4, 4))

    def test_dataset_with_labels(self):
        patches = np.ones((2, 3, 4, 4))
        dataset = PatchDataset(patches, labels=[0, 1])
        self.assertEqual(dataset[1][1], 1)

    def test_invalid_patch_size(self):
        with self.assertRaises(ValueError):
            extract_patches(np.ones((2, 4, 4)), patch_size=0)

    def test_patch_metadata_positions_and_transform(self):
        image = np.arange(1 * 6 * 6).reshape(1, 6, 6)
        transform = Affine.translation(100, 200) @ Affine.scale(10, -10)

        patches, metadata = extract_patches_with_metadata(
            image,
            patch_size=3,
            stride=3,
            transform=transform,
            crs="EPSG:4326",
            source_id="fixture-scene",
        )

        self.assertEqual(patches.shape, (4, 1, 3, 3))
        self.assertEqual(metadata[0]["row"], 0)
        self.assertEqual(metadata[0]["column"], 0)
        self.assertEqual(metadata[1]["column"], 3)
        self.assertEqual(metadata[1]["source_id"], "fixture-scene")
        self.assertEqual(metadata[1]["crs"], "EPSG:4326")
        self.assertEqual(metadata[1]["transform"][2], 130.0)
        self.assertEqual(metadata[1]["transform"][5], 200.0)

    def test_dataset_metadata_access(self):
        patches = np.ones((1, 2, 3, 3))
        records = [{"source_id": "scene-a", "row": 2, "column": 4}]
        dataset = PatchDataset(patches, metadata=records)
        self.assertEqual(dataset.get_metadata(0)["source_id"], "scene-a")

    def test_metadata_count_must_match(self):
        with self.assertRaises(ValueError):
            PatchDataset(np.ones((2, 1, 3, 3)), metadata=[{}])


if __name__ == "__main__":
    unittest.main()
