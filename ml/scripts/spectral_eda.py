"""Calculate per-band spectral statistics using windowed raster reads."""

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "src"))


def calculate_spectral_statistics(scene_path):
    try:
        import numpy as np
        import rasterio
    except ImportError as exc:
        raise ImportError(
            "Install NumPy and Rasterio before running spectral EDA."
        ) from exc

    scene_path = Path(scene_path)

    if not scene_path.is_file():
        raise FileNotFoundError(scene_path)

    with rasterio.open(scene_path) as src:
        count = np.zeros(src.count, dtype=np.int64)
        sums = np.zeros(src.count, dtype=np.float64)
        sums_sq = np.zeros(src.count, dtype=np.float64)
        minima = np.full(src.count, np.inf)
        maxima = np.full(src.count, -np.inf)

        for _, window in src.block_windows(1):
            block = src.read(window=window, masked=True)
            values = np.asarray(
                np.ma.asarray(block).filled(np.nan),
                dtype=np.float64,
            )

            for band_index in range(src.count):
                band = values[band_index]
                valid = band[np.isfinite(band)]

                if valid.size == 0:
                    continue

                count[band_index] += valid.size
                sums[band_index] += valid.sum()
                sums_sq[band_index] += np.square(valid).sum()
                minima[band_index] = min(
                    minima[band_index], valid.min()
                )
                maxima[band_index] = max(
                    maxima[band_index], valid.max()
                )

        rows = []

        for index in range(src.count):
            valid_count = int(count[index])

            if valid_count:
                mean = sums[index] / valid_count
                variance = max(
                    sums_sq[index] / valid_count - mean ** 2,
                    0.0,
                )
                std = float(np.sqrt(variance))
                minimum = float(minima[index])
                maximum = float(maxima[index])
                constant = minimum == maximum
            else:
                mean = std = minimum = maximum = None
                constant = False

            descriptions = src.descriptions or ()
            description = descriptions[index]

            rows.append({
                "band": index + 1,
                "description": description,
                "finite_pixels": valid_count,
                "mean": float(mean) if mean is not None else None,
                "std": std,
                "minimum": minimum,
                "maximum": maximum,
                "constant": constant,
            })

        return {
            "scene": str(scene_path.resolve()),
            "width": src.width,
            "height": src.height,
            "band_count": src.count,
            "crs": str(src.crs) if src.crs else None,
            "bands": rows,
            "note": (
                "Statistics describe this scene only. "
                "They do not establish disease labels or model readiness."
            ),
        }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scene")
    parser.add_argument(
        "--output-dir",
        default="docs/dataset/spectral-eda",
    )
    args = parser.parse_args()

    report = calculate_spectral_statistics(args.scene)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    json_path = output_dir / "spectral-summary.json"
    csv_path = output_dir / "spectral-band-statistics.csv"

    json_path.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )

    with csv_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=list(report["bands"][0].keys())
            if report["bands"] else ["band"],
        )
        writer.writeheader()
        writer.writerows(report["bands"])

    print(f"JSON report: {json_path}")
    print(f"Band statistics: {csv_path}")
    print(f"Inspected bands: {report['band_count']}")


if __name__ == "__main__":
    main()
