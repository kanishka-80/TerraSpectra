"""Inspect a raster scene and save a JSON metadata report."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "src"))

from terraspectra_ml.data.raster_reader import inspect_raster
from terraspectra_ml.data.raster_reader import read_raster
from terraspectra_ml.data.quality_checks import validate_raster


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scene", help="Path to raster scene")
    parser.add_argument(
        "--output",
        default="docs/dataset/scene-inspection.json",
    )
    args = parser.parse_args()

    metadata = inspect_raster(args.scene)
    data = read_raster(args.scene, masked=True)
    quality = validate_raster(data, metadata)

    report = {
        "metadata": metadata,
        "quality": quality,
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))
    print(f"\nReport saved to: {output}")


if __name__ == "__main__":
    main()
