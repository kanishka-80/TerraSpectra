"""Quality checks for hyperspectral raster arrays."""

def validate_raster(array, metadata=None):
    """
    Validate a band-first array with shape (bands, rows, columns).

    Returns a report. It does not modify the input array.
    """
    try:
        import numpy as np
    except ImportError as exc:
        raise ImportError("Quality checks require numpy.") from exc

    data = np.ma.asarray(array)
    values = np.asarray(data.filled(np.nan), dtype=float)

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

    if metadata:
        if metadata.get("crs") is None:
            report["issues"].append("CRS is missing.")

        if metadata.get("transform") is None:
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
            "valid": finite_count > 0 and not constant,
        }

        if finite_count == 0:
            report["issues"].append(
                f"Band {index + 1} contains no finite pixels."
            )
        elif constant:
            report["issues"].append(
                f"Band {index + 1} is constant."
            )

        if nonfinite_count:
            report["issues"].append(
                f"Band {index + 1} contains non-finite pixels."
            )

        report["band_checks"].append(checks)

    report["valid"] = not any(
        "no finite pixels" in issue or "empty dimension" in issue
        for issue in report["issues"]
    )

    return report
