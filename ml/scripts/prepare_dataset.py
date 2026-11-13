"""Run a basic raster quality audit."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "src"))

from terraspectra_ml.data.raster_reader import inspect_raster, read_raster
from terraspectra_ml.data.quality_checks import validate_raster


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scene")
    parser.add_argument("--output", default="data-quality-report.json")
    args = parser.parse_args()

    metadata = inspect_raster(args.scene)
    array = read_raster(args.scene, masked=True)
    quality = validate_raster(array, metadata)

    report = {
        "scene": metadata,
        "quality": quality,
        "model_ready": False,
        "note": (
            "Raster quality alone does not establish disease labels "
            "or model readiness."
        ),
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Quality report saved: {output}")
    print(f"Raster quality valid: {quality['valid']}")


if __name__ == "__main__":
    main()
