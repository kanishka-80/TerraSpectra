"""Read and inspect geospatial raster scenes."""

from pathlib import Path


def _require_rasterio():
    try:
        import rasterio
        return rasterio
    except ImportError as exc:
        raise ImportError(
            "Raster reading requires rasterio. "
            "Install dependencies using: pip install -r ml/requirements.txt"
        ) from exc


def inspect_raster(path):
    """Return raster dimensions, band and geospatial metadata."""
    rasterio = _require_rasterio()
    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"Raster file not found: {path}")

    with rasterio.open(path) as src:
        tags = src.tags()
        return {
            "path": str(path.resolve()),
            "width": src.width,
            "height": src.height,
            "band_count": src.count,
            "dtype": list(src.dtypes),
            "crs": str(src.crs) if src.crs else None,
            "transform": tuple(src.transform),
            "bounds": tuple(src.bounds),
            "resolution": tuple(src.res),
            "nodata": src.nodata,
            "driver": src.driver,
            "band_descriptions": list(src.descriptions or ()),
            "wavelength_metadata": tags.get("wavelength"),
            "band_scales": list(src.scales),
            "band_offsets": list(src.offsets),
            "block_shapes": [tuple(shape) for shape in src.block_shapes],
            "tags": tags,
        }


def read_raster(path, indexes=None, masked=True):
    """Read all bands or selected bands from a raster."""
    rasterio = _require_rasterio()
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Raster file not found: {path}")

    with rasterio.open(path) as src:
        return src.read(indexes=indexes, masked=masked)


def read_window(path, window, indexes=None, masked=True):
    """Read a spatial window without loading the entire scene."""
    rasterio = _require_rasterio()
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Raster file not found: {path}")

    with rasterio.open(path) as src:
        return src.read(indexes=indexes, window=window, masked=masked)


def iter_raster_windows(path, window_size=512):
    """Yield (window, masked_array) chunks from a raster."""
    rasterio = _require_rasterio()

    if not isinstance(window_size, int) or window_size < 1:
        raise ValueError("window_size must be a positive integer.")

    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Raster file not found: {path}")

    with rasterio.open(path) as src:
        for row in range(0, src.height, window_size):
            for col in range(0, src.width, window_size):
                window = rasterio.windows.Window(
                    col,
                    row,
                    min(window_size, src.width - col),
                    min(window_size, src.height - row),
                )
                yield window, src.read(window=window, masked=True)
