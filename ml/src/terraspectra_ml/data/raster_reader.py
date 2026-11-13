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
    """Return raster dimensions, metadata and geospatial information."""
    rasterio = _require_rasterio()
    path = Path(path)

    if not path.is_file():
        raise FileNotFoundError(f"Raster file not found: {path}")

    with rasterio.open(path) as src:
        descriptions = list(src.descriptions or ())
        wavelengths = src.tags().get("wavelength")

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
            "band_descriptions": descriptions,
            "wavelength_metadata": wavelengths,
        }


def read_raster(path, indexes=None, masked=True):
    """Read all bands or selected bands from a raster."""
    rasterio = _require_rasterio()

    with rasterio.open(path) as src:
        return src.read(indexes=indexes, masked=masked)


def read_window(path, window, indexes=None, masked=True):
    """Read a spatial window without loading the entire scene."""
    rasterio = _require_rasterio()

    with rasterio.open(path) as src:
        return src.read(
            indexes=indexes,
            window=window,
            masked=masked,
        )
