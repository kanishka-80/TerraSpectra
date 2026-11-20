import argparse
import csv
import json
from datetime import datetime
from pathlib import Path

import numpy as np
from affine import Affine

from terraspectra_ml.data.patch_dataset import (
    extract_patches,
    filter_invalid_patches,
)
from terraspectra_ml.data.raster_reader import inspect_raster


def main():
    parser = argparse.ArgumentParser(
        description="Prepare raster patches using bounded-memory tiles."
    )
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", default="data/processed/week2")
    parser.add_argument("--patch-size", type=int, default=16)
    parser.add_argument("--stride", type=int, default=8)
    parser.add_argument("--tile-size", type=int, default=256)
    parser.add_argument("--max-invalid", type=float, default=0.20)
    args = parser.parse_args()

    import rasterio
    from rasterio.windows import Window

    if args.patch_size < 1 or args.stride < 1:
        parser.error("patch-size and stride must be positive")
    if args.tile_size < args.patch_size:
        parser.error("tile-size must be at least patch-size")
    if args.tile_size % args.stride:
        parser.error("tile-size must be divisible by stride")
    if not 0 <= args.max_invalid <= 1:
        parser.error("max-invalid must be between 0 and 1")

    source = Path(args.source)
    if not source.is_file():
        parser.error(f"Source raster does not exist: {source}")

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)

    run_name = datetime.now().strftime("run_%Y%m%d_%H%M%S")
    run_dir = output / run_name
    run_dir.mkdir(parents=True, exist_ok=False)

    manifest_path = run_dir / "manifest.csv"
    fields = [
        "patch_id", "shard", "shard_index", "source_id",
        "row", "col", "crs", "transform",
        "label_source", "label",
    ]

    total_patches = 0
    shard_number = 0

    with rasterio.open(source) as src:
        if src.count < 1:
            raise RuntimeError("Raster contains no bands")

        raster_info = {
            "source": str(source.resolve()),
            "width": src.width,
            "height": src.height,
            "band_count": src.count,
            "dtype": list(src.dtypes),
            "crs": str(src.crs) if src.crs else None,
            "transform": str(src.transform),
            "nodata": src.nodata,
            "patch_size": args.patch_size,
            "stride": args.stride,
            "tile_size": args.tile_size,
            "label_semantics": "UNCONFIRMED",
        }

        with manifest_path.open(
            "w", newline="", encoding="utf-8"
        ) as manifest_file:
            writer = csv.DictWriter(manifest_file, fieldnames=fields)
            writer.writeheader()

            for row_start in range(0, src.height, args.tile_size):
                core_height = min(args.tile_size, src.height - row_start)

                for col_start in range(0, src.width, args.tile_size):
                    core_width = min(args.tile_size, src.width - col_start)

                    read_height = min(
                        core_height + args.patch_size - 1,
                        src.height - row_start,
                    )
                    read_width = min(
                        core_width + args.patch_size - 1,
                        src.width - col_start,
                    )

                    window = Window(
                        col_start, row_start, read_width, read_height
                    )

                    masked = src.read(
                        window=window,
                        masked=True,
                        out_dtype="float32",
                    )
                    image = np.asarray(masked.filled(np.nan), dtype=np.float32)

                    patches, locations = extract_patches(
                        image,
                        args.patch_size,
                        args.stride,
                        return_locations=True,
                    )

                    core_indices = [
                        index
                        for index, (r, c) in enumerate(locations)
                        if r < core_height and c < core_width
                    ]

                    if not core_indices:
                        continue

                    patches = patches[core_indices]
                    locations = [locations[i] for i in core_indices]

                    patches, keep = filter_invalid_patches(
                        patches, args.max_invalid
                    )
                    kept_locations = [
                        loc for loc, valid in zip(locations, keep) if valid
                    ]

                    if len(patches) == 0:
                        continue

                    shard_number += 1
                    shard_name = f"patches_{shard_number:05d}.npy"
                    np.save(run_dir / shard_name, patches)

                    tile_transform = src.window_transform(window)

                    for shard_index, (r, c) in enumerate(kept_locations):
                        writer.writerow({
                            "patch_id": total_patches,
                            "shard": shard_name,
                            "shard_index": shard_index,
                            "source_id": str(source),
                            "row": int(row_start + r),
                            "col": int(col_start + c),
                            "crs": str(src.crs) if src.crs else "",
                            "transform": str(tile_transform * Affine.translation(c, r)),
                            "label_source": "UNVERIFIED",
                            "label": "",
                        })
                        total_patches += 1

                    manifest_file.flush()

    if total_patches == 0:
        raise RuntimeError(
            "No valid patches generated. Check raster, patch size and "
            "invalid-data threshold."
        )

    raster_info["patch_count"] = total_patches
    raster_info["shard_count"] = shard_number

    (run_dir / "source_metadata.json").write_text(
        json.dumps(raster_info, indent=2),
        encoding="utf-8",
    )

    print(f"Generated patches: {total_patches}")
    print(f"Patch shards: {shard_number}")
    print(f"Manifest: {manifest_path}")
    print("Labels remain unverified; no labels were fabricated.")


if __name__ == "__main__":
    main()
