# TerraSpectra – Week 2 Backend Open Questions

**Module:** Backend Engineering  
**Owner:** Kanishka  
**Stakeholders:** Harsh (ML Lead), Khushi (ML & Data Engineering), Ritik (Frontend Lead)  
**Week:** 18–24 November 2026  
**Status:** Active – Awaiting Team Confirmation  
**Version:** 0.1.0  
**Updated:** 22 November 2026

---

## 1. Purpose

This document tracks the specific technical questions that must be resolved during Week 2 to prepare the TerraSpectra backend inference service for ML integration.

It complements the existing `open_questions.md` and does not replace the main integration decision register.

No unconfirmed model dimensions, class labels, preprocessing assumptions or output structures will be implemented.

## 2. Questions for Harsh – ML Model Integration

| ID | Question | Why It Matters | Status |
|---|---|---|---|
| H-01 | What is the exact Python function or class used to execute 3D-CNN inference? | Defines the backend service interface | Pending |
| H-02 | What input representation should the backend provide: NumPy array, PyTorch tensor or file path? | Determines data handoff format | Pending |
| H-03 | What are the confirmed input tensor dimensions? | Required for input validation | TBD |
| H-04 | What output does the model return: logits, probabilities, class indices or prediction masks? | Determines response formatting | Pending |
| H-05 | What are the confirmed model class labels and their ordering? | Required for mapping predictions to labels | TBD |
| H-06 | What checkpoint format and loading procedure should be used? | Required for model initialization | Pending |
| H-07 | Can the model run on CPU, or is CUDA/GPU required? | Determines execution configuration | Pending |
| H-08 | How should model loading and inference failures be reported? | Required for controlled API errors | Pending |

## 3. Questions for Khushi – Dataset and Data Integration

| ID | Question | Why It Matters | Status |
|---|---|---|---|
| K-01 | Which prepared dataset and sensor will be used for initial integration? | Identifies the supported input source | Pending |
| K-02 | What metadata fields accompany each prepared sample? | Defines the request context | Pending |
| K-03 | Is preprocessing already completed before the backend receives the sample? | Prevents duplicate preprocessing | Pending |
| K-04 | What are the spectral band count and wavelength ordering? | Required for model compatibility | TBD |
| K-05 | How are NoData, cloud and invalid pixels represented? | Required for safe data handling | Pending |
| K-06 | How are scene IDs, tile IDs and spatial references represented? | Required for geospatial context preservation | Pending |
| K-07 | Who is responsible for scene tiling and prediction stitching? | Defines backend versus ML responsibilities | Pending |

## 4. Questions for Ritik – Frontend Integration

| ID | Question | Why It Matters | Status |
|---|---|---|---|
| R-01 | Can the frontend continue using the existing `/api/v1/predictions` endpoint? | Maintains API compatibility | Pending |
| R-02 | Which prediction summary metrics are required in the dashboard? | Defines response fields | Pending |
| R-03 | Does the frontend require GeoJSON, raster output or an image overlay? | Determines spatial response format | Pending |
| R-04 | Should the existing synchronous HTTP 200 workflow remain for Phase 1, or is asynchronous job processing required? | Determines request lifecycle | Pending |
| R-05 | Which scene/tile identifiers and geospatial metadata should be returned? | Maintains frontend integration compatibility | Pending |

## 5. Backend Implementation Decisions

The following decisions will guide Week 2 implementation.

| ID | Decision | Current Direction | Status |
|---|---|---|---|
| B-01 | Prediction route architecture | Move orchestration into an inference service | Planned |
| B-02 | Mock inference | Keep a separate mock adapter | Planned |
| B-03 | Real model execution | Add a replaceable model adapter after interface confirmation | Pending |
| B-04 | Model readiness | Separate inference readiness from API health | Planned |
| B-05 | Request validation | Preserve existing Pydantic validation | Existing |
| B-06 | Error handling | Use controlled, structured errors | Existing / Improve |
| B-07 | Geospatial context | Preserve confirmed scene, tile and spatial metadata | Pending |
| B-08 | Integration testing | Test route-to-service-to-response flow | Planned |

## 6. Required Information Before Real Model Integration

The following information must be confirmed before implementing the real model adapter:

- [ ] Confirmed Python inference interface.
- [ ] Model input representation.
- [ ] Spectral band count and ordering.
- [ ] Spatial patch dimensions.
- [ ] Preprocessing ownership.
- [ ] Model output structure.
- [ ] Classification labels and class ordering.
- [ ] Confidence and uncertainty definitions.
- [ ] Model checkpoint location and loading method.
- [ ] CPU/GPU requirements.
- [ ] Scene and tile metadata contract.
- [ ] Tiling and stitching responsibilities.

Until these items are confirmed, the backend will use a clearly labelled mock or stub implementation.

## 7. Week 2 Daily Tracking

| Day | Focus | Expected Outcome | Status |
|---|---|---|---|
| Day 1 | Review existing API and align integration contract | Documented API contract and open questions | In Progress |
| Day 2 | Separate API route from inference service | Replaceable service interface | Pending |
| Day 3 | Model adapter and readiness | Model loading and readiness foundation | Pending |
| Day 4 | Validation and response hardening | Reliable request and response handling | Pending |
| Day 5 | Geospatial and tile context | Metadata-preserving request handling | Pending |
| Day 6 | Integration testing and documentation | Tested route-to-service workflow | Pending |
| Day 7 | Review and handoff | Week 2 integration handoff | Pending |

## 8. Team Confirmation Log

| Date | Team Member | Decision / Information Received | Follow-up |
|---|---|---|---|
| TBD | Harsh | Awaiting confirmation | ML interface |
| TBD | Khushi | Awaiting confirmation | Prepared-data contract |
| TBD | Ritik | Awaiting confirmation | Frontend response requirements |

Update this table only after receiving actual team confirmation.

## 9. Completion Criteria

Week 2 integration preparation will be considered complete when:

1. The inference service interface is documented.
2. Mock and real inference execution are clearly separated.
3. API health and model readiness are independently represented.
4. Agreed ML input/output requirements are documented.
5. Geospatial request context is preserved according to the agreed contract.
6. Validation and error handling are covered by tests.
7. Route-to-service integration tests pass.
8. API examples and handoff documentation are updated.

**Current Overall Status:** Existing FastAPI backend and mock prediction workflow are available. Real ML integration remains dependent on confirmation from the ML and data teams.
