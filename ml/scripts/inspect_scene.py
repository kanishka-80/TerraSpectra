"""Inspect raster metadata and quality using windowed reads."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "src"))

from terraspectra_ml.data.quality_checks import validate_raster_file


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scene", help="Path to raster scene")
    parser.add_argument(
        "--output",
        default="docs/dataset/scene-inspection.json",
    )
    parser.add_argument("--window-size", type=int, default=512)
    args = parser.parse_args()

    report = validate_raster_file(
        args.scene,
        window_size=args.window_size,
    )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))
    print(f"\nReport saved to: {output}")
    print(f"Raster quality valid: {report['valid']}")


if __name__ == "__main__":
    main()
