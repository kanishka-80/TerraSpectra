# TerraSpectra ML Tensor Contract

## Proposed input convention

| Field | Convention |
|---|---|
| Input image | bands, rows, columns |
| Patch batch | samples, bands, height, width |
| Data type | float32 after preprocessing |
| NoData | Mask or exclude; never silently treat as valid |
| Wavelengths | Preserve ordered wavelength metadata |
| Labels | Separate from image tensor |
| CRS | Preserve source CRS |
| Transform | Preserve source affine transform |
| Source ID | Retain scene and source provenance |

## Model handoff

The ML team should confirm:
- Expected band order and wavelength units
- Patch dimensions
- Channel-first or channel-last convention
- Data type and normalization
- NoData handling
- Label encoding
- Metadata required for each patch

## Status

This is a proposed contract. Harsh and the ML team must confirm it
before integration. Do not treat this document as an agreed API.
