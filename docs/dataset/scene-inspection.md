# Scene Inspection

## Purpose
Record metadata from an accessible hyperspectral raster scene.

## Inspection fields
- Width and height
- Band count and data types
- CRS and affine transform
- Bounds and pixel resolution
- NoData value
- Band descriptions and wavelength metadata

## Execution
```bash
python ml/scripts/inspect_scene.py path/to/scene.tif
```

## Evidence policy
Do not report measurements until a real scene has been inspected.
A missing scene is a pending data-access task, not a successful inspection.
