"""Run a window-based raster quality audit."""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml" / "src"))

from terraspectra_ml.data.quality_checks import validate_raster_file


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("scene")
    parser.add_argument("--output", default="data-quality-report.json")
    parser.add_argument("--window-size", type=int, default=512)
    args = parser.parse_args()

    quality = validate_raster_file(
        args.scene,
        window_size=args.window_size,
    )

    report = {
        "scene": quality["metadata"],
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
    print("Model readiness: not established by raster quality alone.")


if __name__ == "__main__":
    main()
