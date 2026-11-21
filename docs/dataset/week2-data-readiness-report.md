# Week 2 Data Readiness Report

## Implemented locally
- Raster metadata inspection and window reading interfaces.
- Band-first patch extraction and patch metadata.
- Invalid-patch filtering.
- Standard and spectral normalization interfaces.
- PCA implementation with dedicated tests.
- Optional PyTorch DataLoader interface.
- Tiled raster preparation with patch-sized overlap halos.
- Patch shards and a CSV manifest to avoid collecting the complete dataset in RAM.
- Contiguous spatial row-band split with an optional exclusion buffer.
- CSV label audit for missing labels and duplicate IDs.

## Validation performed
- Automated suite executed using the separate Python 3.12.10 environment with CPU PyTorch 2.15.0+cpu.
- Command: `pytest ml/tests tests -q`
- Result: 43 passed, 1 skipped in 85.44 seconds.
- `ml/scripts/prepare_dataset.py --help` completed successfully.
- One skipped test remains to be investigated; its reason is not yet confirmed.

A passing test suite validates tested code paths only. It does not establish real-scene model readiness.

## External requirements still pending
1. A selected, licensed real raster scene and its acquisition metadata.
2. Confirmation of Harsh's tensor and preprocessing contract.
3. Verified label source, label semantics, and sample alignment.
4. A real-scene preparation run and manual inspection of generated patches.
5. A leakage review using actual patch geometry and study area.
6. End-to-end validation using the confirmed real dataset and labels.

## Important limitations
- Labels are not generated or inferred by this pipeline.
- Label provenance is not established by CSV structure.
- Spatial row bands are a conservative baseline, not proof of independence for every study area.
- The optional spatial buffer must be selected using actual patch dimensions and overlap.
- Tiled output is stored as multiple `.npy` shards plus a manifest, not as one in-memory array.
- Synthetic or unit-test inputs, if used, must not be represented as real satellite-scene validation.

## Readiness decision
Week 2 software implementation and the current automated test run are complete.
Real-scene scientific validation and supervised model training remain pending until
the external data, label, and tensor-contract requirements are confirmed.

## Skipped test clarification
The recorded skipped test is the missing-PyTorch error-path test in
`ml/tests/test_loaders.py`. It skips when PyTorch is installed because that
environment cannot exercise the missing-dependency branch. Loader batching
and invalid batch-size behavior are covered by separate tests. The skip is
environment-dependent and is not a test failure.
