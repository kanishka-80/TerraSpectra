"""Quality checks for hyperspectral raster arrays and raster files."""


def validate_raster(
    array,
    metadata=None,
    require_crs=True,
    require_transform=True,
):
    """
    Validate a band-first array shaped (bands, rows, columns).

    Constant bands are reported but are not automatically rejected.
    Missing required geospatial metadata makes the report invalid.
    """
    try:
        import numpy as np
    except ImportError as exc:
        raise ImportError("Quality checks require numpy.") from exc

    data = np.ma.asarray(array)
    values = np.asarray(data.astype(np.float64).filled(np.nan), dtype=np.float64)

    report = {
        "valid": True,
        "shape": tuple(values.shape),
        "band_count": 0,
        "issues": [],
        "band_checks": [],
    }

    if values.ndim != 3:
        report["valid"] = False
        report["issues"].append(
            "Expected a 3D array: (bands, rows, columns)."
        )
        return report

    bands, rows, columns = values.shape
    report["band_count"] = bands

    if bands < 1 or rows < 1 or columns < 1:
        report["valid"] = False
        report["issues"].append("Raster contains an empty dimension.")
        return report

    if metadata is not None:
        if require_crs and metadata.get("crs") is None:
            report["valid"] = False
            report["issues"].append("CRS is missing.")

        if require_transform and metadata.get("transform") is None:
            report["valid"] = False
            report["issues"].append("Geospatial transform is missing.")

    for index, band in enumerate(values):
        finite = np.isfinite(band)
        finite_count = int(finite.sum())
        nonfinite_count = int(band.size - finite_count)

        if finite_count:
            finite_values = band[finite]
            constant = bool(np.all(finite_values == finite_values[0]))
            minimum = float(finite_values.min())
            maximum = float(finite_values.max())
        else:
            constant = False
            minimum = None
            maximum = None

        checks = {
            "band": index + 1,
            "finite_pixels": finite_count,
            "nonfinite_pixels": nonfinite_count,
            "constant": constant,
            "minimum": minimum,
            "maximum": maximum,
            "valid": finite_count > 0,
        }

        if finite_count == 0:
            report["valid"] = False
            report["issues"].append(
                f"Band {index + 1} contains no finite pixels."
            )
        elif constant:
            report["issues"].append(f"Band {index + 1} is constant.")

        if nonfinite_count:
            report["issues"].append(
                f"Band {index + 1} contains non-finite pixels."
            )

        report["band_checks"].append(checks)

    return report


def validate_raster_file(
    path,
    window_size=512,
    require_crs=True,
    require_transform=True,
):
    """Validate a raster incrementally without reading the full scene."""
    try:
        import numpy as np
        import rasterio
    except ImportError as exc:
        raise ImportError(
            "File validation requires NumPy and Rasterio."
        ) from exc

    from terraspectra_ml.data.raster_reader import inspect_raster

    metadata = inspect_raster(path)

    if not isinstance(window_size, int) or window_size < 1:
        raise ValueError("window_size must be a positive integer.")

    band_count = metadata["band_count"]
    finite_counts = np.zeros(band_count, dtype=np.int64)
    nonfinite_counts = np.zeros(band_count, dtype=np.int64)
    minima = np.full(band_count, np.inf)
    maxima = np.full(band_count, -np.inf)

    with rasterio.open(path) as src:
        for row in range(0, src.height, window_size):
            for col in range(0, src.width, window_size):
                window = rasterio.windows.Window(
                    col,
                    row,
                    min(window_size, src.width - col),
                    min(window_size, src.height - row),
                )
                chunk = src.read(window=window, masked=True)
                masked_chunk = np.ma.asarray(chunk).astype(np.float64)
                values = np.asarray(masked_chunk.data, dtype=np.float64)
                masked = np.ma.getmaskarray(masked_chunk)

                for index, band in enumerate(values):
                    band_mask = masked[index]
                    finite_mask = (~band_mask) & np.isfinite(band)
                    nonfinite_mask = (~band_mask) & (~np.isfinite(band))

                    finite = band[finite_mask]
                    finite_counts[index] += finite.size
                    nonfinite_counts[index] += int(nonfinite_mask.sum())

                    if finite.size:
                        minima[index] = min(minima[index], finite.min())
                        maxima[index] = max(maxima[index], finite.max())

    issues = []
    valid = True

    if require_crs and metadata["crs"] is None:
        valid = False
        issues.append("CRS is missing.")

    if require_transform and metadata["transform"] is None:
        valid = False
        issues.append("Geospatial transform is missing.")

    band_checks = []
    for index in range(band_count):
        count = int(finite_counts[index])
        nonfinite = int(nonfinite_counts[index])
        has_values = count > 0
        constant = bool(
            has_values and minima[index] == maxima[index]
        )

        if not has_values:
            valid = False
            issues.append(f"Band {index + 1} contains no finite pixels.")
        elif constant:
            issues.append(f"Band {index + 1} is constant.")

        if nonfinite:
            issues.append(
                f"Band {index + 1} contains non-finite pixels."
            )

        band_checks.append({
            "band": index + 1,
            "finite_pixels": count,
            "nonfinite_pixels": nonfinite,
            "constant": constant,
            "minimum": float(minima[index]) if has_values else None,
            "maximum": float(maxima[index]) if has_values else None,
            "valid": has_values,
        })

    return {
        "valid": valid,
        "shape": (band_count, metadata["height"], metadata["width"]),
        "band_count": band_count,
        "issues": issues,
        "band_checks": band_checks,
        "window_size": window_size,
        "metadata": metadata,
        "read_strategy": "windowed",
    }
