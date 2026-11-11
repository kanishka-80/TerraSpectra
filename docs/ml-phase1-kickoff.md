# TerraSpectra - Phase 1 ML Kickoff

## 1. Objective
Establish the initial Machine Learning and Data Engineering workflow for TerraSpectra. The focus is on understanding hyperspectral data, verifying available labels, and preparing a reproducible foundation for model development.

## 2. Dataset Research
- Identify suitable public hyperspectral datasets.
- Record the original data source and access conditions.
- Verify sensor information, spectral bands, wavelengths, and spatial resolution.
- Check whether the available labels represent land cover, vegetation stress, or confirmed crop disease.
- Document dataset limitations before selecting a primary dataset.

## 3. Data Quality and Label Audit
- Inspect raster readability, dimensions, band count, and metadata.
- Verify coordinate reference system and geospatial alignment.
- Check missing values, NoData regions, and label consistency.
- Keep disease labels separate from general land-cover labels.
- Record the evidence and limitations of each candidate dataset.

## 4. Spectral Preprocessing Plan
- Review spectral band order and wavelength information.
- Evaluate suitable band selection and filtering methods.
- Plan normalization and patch extraction.
- Preserve the original spectral information for comparison.
- Record preprocessing configurations to support reproducibility.

## 5. Baseline Model Evaluation
- Investigate Random Forest and SVM as initial spectral-feature baselines.
- Consider suitable 2D-CNN and 3D-CNN comparisons.
- Evaluate models using precision, recall, F1-score, and confusion matrix.
- Use ROC-AUC where applicable.
- Prefer spatially separated or cross-date evaluation when the dataset permits.

## 6. Explainability
- Investigate SHAP-based spectral band attribution.
- Review Grad-CAM-style spatial explanations for suitable models.
- Keep explanations linked to the model outputs and available evidence.

## 7. Phase 1 Deliverables
- Dataset source and feasibility notes.
- Initial label audit.
- Spectral preprocessing plan.
- Baseline experiment plan.
- Evaluation and explainability requirements.

## 8. Scientific Limitations
Land-cover classification must not be presented as confirmed crop-disease detection. Any simulated stress data must be clearly identified as synthetic. Forecasting and disease-risk claims require appropriate verified labels and supporting observations.

## Status
Initial planning documentation. Dataset selection, preprocessing, and model experiments remain subject to validation during Phase 1.
