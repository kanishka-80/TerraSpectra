import unittest

try:
    import numpy as np
    from terraspectra_ml.evaluation.spatial_split import spatial_group_split
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy is not installed")
class TestSpatialSplit(unittest.TestCase):

    def test_groups_do_not_overlap(self):
        groups = np.repeat(np.arange(10), 3)
        result = spatial_group_split(groups)

        train = set(result["train_groups"])
        validation = set(result["validation_groups"])
        test = set(result["test_groups"])

        self.assertFalse(train & validation)
        self.assertFalse(train & test)
        self.assertFalse(validation & test)

    def test_invalid_fractions(self):
        with self.assertRaises(ValueError):
            spatial_group_split(
                np.repeat(np.arange(5), 2),
                train_fraction=0.8,
                validation_fraction=0.3,
                test_fraction=0.1,
            )


if __name__ == "__main__":
    unittest.main()
