# TerraSpectra – Week 1 Backend Handoff



## 1. Overview



Week 1 focused on establishing the foundational backend architecture for TerraSpectra, a hyperspectral crop stress intelligence platform.



The backend was developed using FastAPI and Python, with an emphasis on API structure, request validation, standardized responses, mock prediction integration, and automated testing.



## 2. Completed Work



The following tasks were completed during Week 1:



- Established the FastAPI backend application.

- Configured centralized application settings.

- Implemented centralized exception handling.

- Created request and response schemas using Pydantic.

- Added bounding box validation.

- Implemented health and system status endpoints.

- Developed a mock prediction service.

- Integrated the prediction endpoint with the FastAPI application.

- Created API examples and backend documentation.

- Added automated tests for schemas, API behavior, predictions, and API contract validation.



## 3. Implemented API Endpoints



| Method | Endpoint | Description |

|---|---|---|

| GET | / | Root API information |

| GET | /health | Health check |

| GET | /api/v1/status | System status |

| POST | /api/v1/predictions | Mock prediction response |



### Prediction Endpoint



**Endpoint:** POST /api/v1/predictions



The endpoint accepts validated analysis input, including:



- Dataset ID

- Sensor name

- Bounding box

- Uncertainty preference



Bounding box format:



[min_lon, min_lat, max_lon, max_lat]



The endpoint currently returns a simulated prediction response. No actual ML model is executed.



Refer to `api\_examples.md` for request and response examples.



## 4. Testing and Validation



Automated backend tests were executed successfully.



**Latest test result: 24 passed.**



Testing covered:



- Request schema validation.

- Bounding box validation.

- API endpoint behavior.

- Mock prediction response.

- API contract consistency.



## 5. Current Implementation Limitations



The following capabilities are not yet implemented:



- Actual ML model integration.

- Hyperspectral raster upload and processing.

- Background inference job management.

- Real prediction classes and confidence outputs.

- Geospatial raster output and storage.



These requirements depend on further technical discussions and integration decisions.



## 6. Pending Integration Questions



The following areas require confirmation from the ML and frontend teams:



### ML Team

- Input raster format and band selection.

- Model input dimensions and inference interface.

- Prediction classes and output format.

- Confidence and uncertainty representation.

- Model checkpoint and hardware requirements.



### Frontend Team

- Final prediction response structure.

- Dashboard metrics and visualization requirements.

- Map visualization and coordinate reference system.

- Upload workflow and error handling.

- Prediction history and asynchronous processing requirements.



Refer to `open\_questions.md` for the detailed list.



## 7. Week 2 Priorities



The proposed priorities for Week 2 are:



1. Finalize the ML model input and output contract.

2. Coordinate with the frontend team on API integration requirements.

3. Define raster upload and validation workflows.

4. Design the actual ML inference service interface.

5. Plan background processing for long-running predictions.

6. Improve API tests based on confirmed integration requirements.

7. Update API documentation as contracts evolve.



## 8. Handoff Summary



The Week 1 backend foundation is established with FastAPI, validated request schemas, standardized API responses, a mock prediction endpoint, documentation, and automated tests.



The backend is ready for initial frontend integration testing using simulated prediction responses.



Actual ML inference and geospatial processing will be developed after the relevant technical contracts are finalized with the ML and frontend teams.

