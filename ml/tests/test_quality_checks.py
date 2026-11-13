import unittest

try:
    import numpy as np
    from terraspectra_ml.data.quality_checks import validate_raster
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy is not installed")
class TestQualityChecks(unittest.TestCase):

    def test_valid_array(self):
        data = np.arange(48, dtype=float).reshape(2, 4, 6)
        result = validate_raster(data)
        self.assertEqual(result["band_count"], 2)
        self.assertTrue(result["valid"])

    def test_empty_band_detected(self):
        data = np.full((1, 3, 3), np.nan)
        result = validate_raster(data)
        self.assertFalse(result["valid"])

    def test_constant_band_detected(self):
        data = np.ones((1, 3, 3))
        result = validate_raster(data)
        self.assertTrue(
            any("constant" in issue for issue in result["issues"])
        )

    def test_wrong_dimensions(self):
        result = validate_raster(np.ones((3, 3)))
        self.assertFalse(result["valid"])


if __name__ == "__main__":
    unittest.main()
