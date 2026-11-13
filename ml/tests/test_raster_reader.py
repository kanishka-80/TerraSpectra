import tempfile
import unittest
from pathlib import Path

try:
    import numpy as np
    import rasterio
    from rasterio.transform import from_origin
    from terraspectra_ml.data.raster_reader import (
        inspect_raster,
        read_raster,
        read_window,
    )
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy or Rasterio is not installed")
class TestRasterReader(unittest.TestCase):

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "sample.tif"

        data = np.arange(48, dtype=np.float32).reshape(2, 4, 6)

        with rasterio.open(
            self.path,
            "w",
            driver="GTiff",
            height=4,
            width=6,
            count=2,
            dtype="float32",
            crs="EPSG:4326",
            transform=from_origin(70, 30, 0.01, 0.01),
        ) as dst:
            dst.write(data)

    def tearDown(self):
        self.temp.cleanup()

    def test_inspect_metadata(self):
        metadata = inspect_raster(self.path)

        self.assertEqual(metadata["width"], 6)
        self.assertEqual(metadata["height"], 4)
        self.assertEqual(metadata["band_count"], 2)
        self.assertEqual(metadata["crs"], "EPSG:4326")

    def test_read_all_bands(self):
        result = read_raster(self.path)
        self.assertEqual(result.shape, (2, 4, 6))

    def test_read_window(self):
        result = read_window(
            self.path,
            rasterio.windows.Window(0, 0, 3, 2),
        )
        self.assertEqual(result.shape, (2, 2, 3))

    def test_missing_file(self):
        with self.assertRaises(FileNotFoundError):
            inspect_raster(self.path.parent / "missing.tif")


if __name__ == "__main__":
    unittest.main()
