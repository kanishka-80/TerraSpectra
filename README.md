
# TerraSpectra – Machine Learning Module

### AI-Powered Hyperspectral Crop Stress Intelligence & Disease-Risk Forecasting

**Module Owner:** Harsh  
**Role:** ML Engineering Lead  
**Team:** Team Strangers  
**Status:** Initial Development

---

## 1. Overview

The Machine Learning module of TerraSpectra focuses on analyzing hyperspectral satellite imagery to identify crop stress patterns and assess potential crop disease risks.

Unlike traditional RGB-based crop monitoring systems, hyperspectral imaging captures information across numerous narrow spectral bands, allowing the model to investigate subtle changes in vegetation reflectance.

Our proposed approach combines:

- 3D Convolutional Neural Networks (3D-CNN)
- Vision Transformer (ViT)
- Spectral-Spatial Feature Extraction
- Explainable AI (XAI)
- Uncertainty Estimation

The objective is to develop an intelligent model that can process hyperspectral data and generate meaningful crop-health predictions.

---

## 2. My Responsibilities – Harsh (ML Lead)

As the ML Engineering Lead, my responsibilities include:

1. Designing the overall ML architecture.
2. Developing the 3D-CNN model.
3. Integrating the Vision Transformer architecture.
4. Building the 3D-CNN + ViT hybrid model.
5. Managing model training and optimization.
6. Implementing model evaluation techniques.
7. Exploring uncertainty estimation.
8. Integrating the trained model with the backend inference API.
9. Ensuring reproducibility of ML experiments.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| Python | Primary programming language |
| PyTorch | Deep learning framework |
| NumPy | Numerical computation |
| Rasterio | Geospatial raster processing |
| GDAL | Geospatial data handling |
| Scikit-learn | ML baselines and evaluation |
| Matplotlib | Data visualization |
| Pandas | Data analysis |
| Jupyter Notebook | Experimentation and analysis |

---

## 4. Proposed ML Architecture

The primary model architecture will combine spatial-spectral feature extraction with transformer-based feature learning.

### 4.1 3D-CNN

The 3D-CNN component will be responsible for extracting spatial and spectral features from hyperspectral image patches.

Key objectives:

- Learn spatial patterns.
- Extract spectral information.
- Identify vegetation reflectance variations.
- Generate meaningful feature representations.

### 4.2 Vision Transformer (ViT)

The Vision Transformer will be integrated to learn relationships between extracted spectral-spatial features.

Key objectives:

- Capture long-range feature dependencies.
- Learn relationships across spectral information.
- Improve feature representation.
- Support classification and risk-assessment tasks.

### 4.3 Hybrid 3D-CNN + ViT

The proposed hybrid architecture will combine both components.

**Workflow:**

Hyperspectral Input  
        ↓  
Data Preprocessing  
        ↓  
3D-CNN Feature Extraction  
        ↓  
Vision Transformer  
        ↓  
Feature Fusion  
        ↓  
Classification Head  
        ↓  
Prediction Output

---

## 5. Dataset Strategy

The project will use externally sourced hyperspectral datasets.

Potential data sources:

- EnMAP
- PRISMA
- NASA EMIT
- AVIRIS

Dataset selection will depend on:

- Availability of hyperspectral imagery.
- Number of spectral bands.
- Spatial resolution.
- Availability of crop-related labels.
- Availability of verified disease labels.
- Compatibility with the proposed model.

**Important:** General hyperspectral classification datasets and crop-disease datasets will be treated separately. A land-cover dataset alone cannot validate disease detection.

No manually fabricated sample dataset will be presented as real satellite data.

---

## 6. ML Development Workflow

The ML development process will follow these stages:

### Stage 1 – Data Understanding

- Research available hyperspectral datasets.
- Understand spectral bands and wavelengths.
- Inspect raster metadata.
- Analyze dataset labels.
- Understand image dimensions and spatial resolution.

### Stage 2 – Data Preprocessing

- Load hyperspectral images.
- Perform data quality checks.
- Handle invalid and missing values.
- Normalize spectral values.
- Perform spectral band selection.
- Explore PCA for dimensionality reduction.
- Extract spatial-spectral patches.

### Stage 3 – Baseline Models

Develop and evaluate simpler models before implementing the hybrid architecture.

Planned experiments:

- Random Forest
- Support Vector Machine (SVM)
- 2D-CNN
- 3D-CNN

### Stage 4 – Hybrid Model Development

- Implement 3D-CNN.
- Develop Vision Transformer components.
- Integrate both architectures.
- Implement feature fusion.
- Develop the classification head.
- Train and evaluate the hybrid model.

### Stage 5 – Model Evaluation

Evaluation metrics:

- Accuracy
- Precision
- Recall
- F1-Score
- Confusion Matrix
- ROC-AUC (where applicable)

Spatially separated and cross-date evaluation will be considered to avoid misleading results.

### Stage 6 – Advanced ML Features

Planned enhancements:

- Spectral Explainability using SHAP.
- Spatial Explainability using Grad-CAM.
- Uncertainty Estimation using MC Dropout.
- Weather-aware risk analysis.
- Temporal forecasting, subject to suitable multi-date data and verified labels.

---

## 7. Project Directory Structure

```text
ml/
│
├── README.md
│
├── configs/
│   ├── data.yaml
│   ├── baseline.yaml
│   └── hybrid_3dcnn_vit.yaml
│
├── notebooks/
│   ├── 01_dataset_audit.ipynb
│   ├── 02_spectral_eda.ipynb
│   └── 03_model_experiments.ipynb
│
├── src/
│   └── terraspectra_ml/
│       ├── data/
│       │   ├── loaders.py
│       │   ├── raster_reader.py
│       │   ├── quality_checks.py
│       │   ├── preprocessing.py
│       │   └── patch_dataset.py
│       │
│       ├── features/
│       │   ├── spectral_indices.py
│       │   └── dimensionality_reduction.py
│       │
│       ├── models/
│       │   ├── baselines.py
│       │   ├── cnn3d.py
│       │   ├── vit_spectral.py
│       │   └── hybrid_model.py
│       │
│       ├── training/
│       │   ├── train.py
│       │   └── losses.py
│       │
│       ├── evaluation/
│       │   ├── metrics.py
│       │   ├── spatial_split.py
│       │   └── reports.py
│       │
│       ├── explainability/
│       │   ├── band_attribution.py
│       │   └── spatial_explanations.py
│       │
│       ├── uncertainty/
│       │   └── estimation.py
│       │
│       └── inference/
│           ├── predict.py
│           ├── tiling.py
│           └── stitch.py
│
├── scripts/
│   ├── inspect_scene.py
│   ├── prepare_dataset.py
│   ├── train_baseline.py
│   └── train_hybrid.py
│
├── artifacts/
│   ├── checkpoints/
│   └── reports/
│
└── tests/
    ├── test_preprocessing.py
    ├── test_tensor_shapes.py
    └── test_inference.py
```

---

## 8. Four-Week ML Development Roadmap

| Week | Development Focus |
|---|---|
| Week 1 | Dataset research, spectral analysis and preprocessing |
| Week 2 | Baseline models and 3D-CNN development |
| Week 3 | Vision Transformer integration and hybrid model evaluation |
| Week 4 | Optimization, explainability, uncertainty and backend integration |

---

## 9. Expected ML Outputs

The ML module is expected to provide:

- Processed hyperspectral image patches.
- Trained ML model checkpoints.
- Crop-stress classification outputs.
- Georeferenced prediction results.
- Model evaluation reports.
- Spectral feature explanations.
- Prediction uncertainty information.

These outputs will be integrated with the TerraSpectra backend and GIS dashboard.

---

## 10. Current Development Status

| Component | Status |
|---|---|
| ML architecture planning | Completed |
| ML repository structure | Initial setup |
| Dataset investigation | Planned |
| Hyperspectral preprocessing | Planned |
| Baseline models | Planned |
| 3D-CNN | Planned |
| Vision Transformer | Planned |
| Hybrid model | Planned |
| Explainable AI | Planned |
| Uncertainty estimation | Planned |
| Backend integration | Planned |

---

## 11. Development Philosophy

TerraSpectra follows a research-driven ML development approach.

Our priorities are:

- Use genuine externally sourced datasets.
- Maintain reproducible experiments.
- Compare complex models with simpler baselines.
- Avoid data leakage during evaluation.
- Focus on meaningful spectral-spatial learning.
- Communicate model uncertainty and limitations honestly.

---

## Team TerraSpectra

**Harsh** – ML Engineering Lead  
**Khushi** – ML & Data Engineering  
**Kanishka** – Backend Engineering  
**Ritvik** – Frontend & GIS Engineering

---

**TerraSpectra**

*SEE. PREDICT. ACT.*
