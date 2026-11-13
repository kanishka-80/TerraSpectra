import unittest

try:
    import numpy as np
    from terraspectra_ml.data.patch_dataset import (
        extract_patches,
        PatchDataset,
    )
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy is not installed")
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
            extract_patches(np.ones((2, 4, 4)), patch_size=8)


if __name__ == "__main__":
    unittest.main()
