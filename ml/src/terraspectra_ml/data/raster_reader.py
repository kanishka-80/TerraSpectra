from pathlib import Path
import numpy as np


def read_raster(path, bands=None):
    """Read selected raster bands as a float32 (bands, rows, columns) array."""
    try:
        import rasterio
    except ImportError as exc:
        raise RuntimeError("Install rasterio in project environment") from exc

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    with rasterio.open(path) as src:
        indexes = list(bands) if bands is not None else list(
            range(1, src.count + 1)
        )
        if not indexes or any(i < 1 or i > src.count for i in indexes):
            raise ValueError("Band indexes are outside the raster band range")
        data = src.read(indexes, masked=True)
        return np.asarray(data.filled(np.nan), dtype=np.float32)


def read_window(path, window, bands=None, return_metadata=False):
    """Read a raster window; optionally return geospatial metadata too."""
    try:
        import rasterio
    except ImportError as exc:
        raise RuntimeError("Install rasterio in project environment") from exc

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    with rasterio.open(path) as src:
        indexes = list(bands) if bands is not None else list(
            range(1, src.count + 1)
        )
        if not indexes or any(i < 1 or i > src.count for i in indexes):
            raise ValueError("Band indexes are outside the raster band range")

        data = src.read(indexes, window=window, masked=True)
        arr = np.asarray(data.filled(np.nan), dtype=np.float32)

        if not return_metadata:
            return arr

        return {
            "image": arr,
            "invalid_mask": ~np.isfinite(arr),
            "transform": src.window_transform(window),
            "crs": src.crs,
            "source": str(path),
            "bands": indexes,
            "wavelengths": None,
        }


def inspect_raster(path):
    """Return raster dimensions, band count and geospatial metadata."""
    try:
        import rasterio
    except ImportError as exc:
        raise RuntimeError("Install rasterio in project environment") from exc

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)

    with rasterio.open(path) as src:
        return {
            "width": src.width,
            "height": src.height,
            "count": src.count,
            "band_count": src.count,
            "dtype": src.dtypes,
            "crs": str(src.crs) if src.crs is not None else None,
            "transform": tuple(src.transform),
            "nodata": src.nodata,
        }
