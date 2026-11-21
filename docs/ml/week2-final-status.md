# TerraSpectra ML — Week 2 Final Status

## Local engineering work
- Raster reading and metadata interfaces.
- Patch extraction and invalid-data filtering.
- Tiled, shard-based preparation workflow.
- Standard and spectral normalization.
- Spectral PCA implementation.
- Optional PyTorch DataLoader interface.
- Spatial row-band splitting with optional buffer.
- CSV label audit tooling.
- Automated tests and readiness documentation.

## Latest technical validation
- Separate Python 3.12.10 environment used for validation.
- CPU PyTorch 2.15.0+cpu installed in that environment.
- Full test command: `pytest ml/tests tests -q`
- Result: 43 passed, 1 skipped.
- Recorded runtime: 85.44 seconds.
- Dataset preparation CLI help check completed successfully.
- Git branch `khushi` was synchronized with `origin/khushi`.

## Skipped test explanation
- The skipped test is `test_loader_reports_missing_pytorch`.
- It tests the error path used when PyTorch is unavailable.
- PyTorch was installed during the validation run, so this test skipped its missing-dependency scenario.
- The available-PyTorch behavior is covered separately by loader batching and invalid batch-size tests.
- This is an environment-dependent skip, not a test failure.

## Not signed off
- No verified real raster scene is currently available in the repository.
- Label provenance, semantics, and sample alignment remain unconfirmed.
- Harsh and the ML team have not confirmed the proposed tensor and preprocessing contract.
- Real-scene end-to-end validation has not been performed.
- Supervised model training has not been performed.
- Geographic leakage review using actual scene geometry remains pending.

## Completion rule
Week 2 software implementation and the recorded automated test run are complete.
Scientific and data readiness remain pending until real data, label provenance,
geospatial requirements, and the external tensor contract are confirmed and reviewed.
