# Week 2 — External Team Handoff Requirements

Owner: Khushi — ML & Data Engineering

This checklist records external information required before real-data
integration. Items must be confirmed by the relevant team member; they must
not be assumed from the current implementation.

## Dataset / GIS handoff
- [ ] Approved real raster scene supplied.
- [ ] Dataset source and license supplied.
- [ ] Scene ID and acquisition date supplied.
- [ ] CRS, spatial resolution, and affine transform confirmed.
- [ ] Band indices, band order, and wavelength units supplied.
- [ ] NoData representation confirmed.

## ML tensor contract — confirmation requested from Harsh
- [ ] Patch height and width confirmed.
- [ ] Tensor axis order confirmed.
- [ ] Data type confirmed.
- [ ] Normalization method and fitting rules confirmed.
- [ ] Label encoding and expected shape confirmed.
- [ ] Required per-patch metadata confirmed.

## Label handoff
- [ ] Original label source and license supplied.
- [ ] Label definitions and class mapping supplied.
- [ ] Sample-to-label alignment explained.
- [ ] Geographic and temporal validity reviewed.
- [ ] Duplicate IDs and class distribution reviewed.

## Acceptance checks after handoff
- [ ] Inspect real raster metadata.
- [ ] Run preparation on the approved scene.
- [ ] Inspect generated patch samples and manifest.
- [ ] Review spatial split and geographic leakage.
- [ ] Run end-to-end validation with confirmed labels.
- [ ] Record limitations and review results before model training.

## Current decision
Software implementation is complete for the recorded Week 2 scope.
Real-data acceptance and supervised model readiness are pending.
No synthetic data or unverified labels may be represented as real validation.
