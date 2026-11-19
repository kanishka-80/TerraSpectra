import argparse
import json
from pathlib import Path
import numpy as np

from terraspectra_ml.data.raster_reader import read_window, inspect_raster
from terraspectra_ml.data.patch_dataset import (
    extract_patches, filter_invalid_patches
)
from terraspectra_ml.data.patch_manifest import write_manifest

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", default="data/processed/week2")
    parser.add_argument("--patch-size", type=int, default=16)
    parser.add_argument("--stride", type=int, default=8)
    parser.add_argument("--max-invalid", type=float, default=0.20)
    args = parser.parse_args()

    import rasterio
    source = Path(args.source)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    info = inspect_raster(source)
    records = []
    arrays = []

    with rasterio.open(source) as src:
        for _, window in src.block_windows(1):
            sample = read_window(source, window)
            patches, locations = extract_patches(
                sample["image"], args.patch_size, args.stride
            )
            patches, keep = filter_invalid_patches(
                patches, args.max_invalid
            )

            original = [loc for loc, valid in zip(locations, keep) if valid]
            for patch, (row, col) in zip(patches, original):
                patch_id = len(arrays)
                arrays.append(patch)
                records.append({
                    "patch_id": patch_id,
                    "source_id": str(source),
                    "row": int(window.row_off + row),
                    "col": int(window.col_off + col),
                    "crs": str(sample["crs"]),
                    "transform": str(sample["transform"]),
                    "label_source": "UNVERIFIED",
                    "label": None,
                })

    if not arrays:
        raise RuntimeError("No valid patches generated")

    np.save(output / "patches.npy", np.stack(arrays))
    write_manifest(records, output / "manifest.csv")
    (output / "source_metadata.json").write_text(
        json.dumps(info, indent=2), encoding="utf-8"
    )
    print(f"Generated {len(arrays)} patches in {output}")

if __name__ == "__main__":
    main()
