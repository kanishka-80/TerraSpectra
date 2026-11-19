from pathlib import Path
import numpy as np

def read_window(path, window, bands=None):
    try:
        import rasterio
    except ImportError as exc:
        raise RuntimeError("Install rasterio in project environment") from exc

    with rasterio.open(Path(path)) as src:
        indexes = bands or list(range(1, src.count + 1))
        data = src.read(indexes, window=window, masked=True)
        transform = src.window_transform(window)

        arr = np.asarray(data.filled(np.nan), dtype=np.float32)
        invalid = ~np.isfinite(arr)

        return {
            "image": arr,
            "invalid_mask": invalid,
            "transform": transform,
            "crs": src.crs,
            "source": str(path),
            "bands": indexes,
            "wavelengths": None,
        }

def inspect_raster(path):
    import rasterio
    with rasterio.open(path) as src:
        return {
            "width": src.width,
            "height": src.height,
            "count": src.count,
            "dtype": src.dtypes,
            "crs": str(src.crs),
            "transform": tuple(src.transform),
            "nodata": src.nodata,
        }
