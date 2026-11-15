import tempfile
import unittest
from pathlib import Path

try:
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from terraspectra_ml.data.quality_checks import (
        validate_raster,
        validate_raster_file,
    )
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy or Rasterio is not installed")
class TestQualityChecks(unittest.TestCase):

    def test_valid_array(self):
        data = np.arange(48, dtype=float).reshape(2, 4, 6)
        result = validate_raster(data)
        self.assertEqual(result["band_count"], 2)
        self.assertTrue(result["valid"])

    def test_integer_masked_array_handles_nodata(self):
        data = np.ma.array(
            [[[1, 2], [3, 4]]],
            mask=[[[False, True], [False, False]]],
        )
        result = validate_raster(data)
        self.assertIsNotNone(result)

    def test_empty_band_detected(self):
        data = np.full((1, 3, 3), np.nan)
        result = validate_raster(data)
        self.assertFalse(result["valid"])

    def test_constant_band_reported(self):
        data = np.ones((1, 3, 3))
        result = validate_raster(data)
        self.assertTrue(
            any("constant" in issue for issue in result["issues"])
        )

    def test_wrong_dimensions(self):
        result = validate_raster(np.ones((3, 3)))
        self.assertFalse(result["valid"])

    def test_missing_required_crs_invalid(self):
        data = np.arange(9, dtype=float).reshape(1, 3, 3)
        result = validate_raster(
            data,
            metadata={"crs": None, "transform": (1, 0, 0, 0, -1, 0)},
        )
        self.assertFalse(result["valid"])
        self.assertTrue(any("CRS is missing" in x for x in result["issues"]))

    def test_windowed_file_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "scene.tif"
            data = np.arange(2 * 7 * 8, dtype=np.float32).reshape(2, 7, 8)

            with rasterio.open(
                path,
                "w",
                driver="GTiff",
                height=7,
                width=8,
                count=2,
                dtype="float32",
                crs="EPSG:4326",
                transform=from_origin(70, 30, 0.01, 0.01),
            ) as dst:
                dst.write(data)

            result = validate_raster_file(path, window_size=3)
            self.assertTrue(result["valid"])
            self.assertEqual(result["shape"], (2, 7, 8))
            self.assertEqual(result["read_strategy"], "windowed")
            self.assertEqual(result["band_checks"][0]["finite_pixels"], 56)


if __name__ == "__main__":
    unittest.main()
