# Week 2 Data Readiness Report

## Implemented locally

- Raster metadata inspection and window reading interfaces.
- Band-first patch extraction and patch metadata.
- Invalid-patch filtering.
- Standard and spectral normalization interfaces.
- PCA implementation with dedicated tests.
- Optional PyTorch DataLoader interface and dependency error handling.
- Tiled raster preparation with patch-sized overlap halos.
- Patch shards and a CSV manifest to avoid collecting the complete dataset in RAM.
- Contiguous spatial row-band split with an optional exclusion buffer.
- CSV label audit that reports missing labels and duplicate IDs.

## Validation performed

The automated test suite is run locally with:

`pytest ml/tests tests -q`

A passing test suite validates the tested code paths only. It does not establish real-scene model readiness.

## External requirements still pending

1. A selected, licensed real raster scene and its acquisition metadata.
2. Confirmation of Harsh's tensor and preprocessing contract.
3. Verified label source, label semantics, and sample alignment.
4. A real-scene preparation run and manual inspection of generated patches.
5. A leakage review using the actual patch geometry and study area.
6. A compatible PyTorch installation and actual DataLoader execution.

## Important limitations

- Labels are not generated or inferred by this pipeline.
- Label provenance is not established by CSV structure.
- Spatial row bands are a conservative baseline, not proof of independence for every study area.
- The optional spatial buffer must be selected using the actual patch dimensions and overlap.
- Tiled output is stored as multiple `.npy` shards plus a manifest, not as one in-memory array.

## Readiness decision

The software interfaces and automated tests can be developed without a real scene.
End-to-end scientific validation and supervised model training remain pending until
the external data, label, and tensor-contract requirements are confirmed.
