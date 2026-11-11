# TerraSpectra — Machine Learning Module

## 1. Module Overview
The `ml/` module is the core analytical engine of TerraSpectra, responsible for extracting spectral-spatial signatures from hyperspectral imagery to detect early crop stress patterns and forecast disease risks.

## 2. Core Responsibilities (ML Engineering Lead: Harsh)
- **Model Architecture:** Design and implementation of the 3D-CNN feature extractor and Vision Transformer (ViT) backbone.
- **Tensor Contracts:** Specification of standardized input tensors `[B, C, D, H, W]` and output prediction/uncertainty formats.
- **Inference Pipeline:** Patch-based inference, geospatial tiling, and artifact reconstruction for backend integration.
- **Optimization & Uncertainty:** Model checkpointing, ONNX optimization, and predictive uncertainty quantification (MC-dropout/ensembles).

## 3. Technology Stack
- **Framework:** PyTorch (CUDA-enabled)
- **Geospatial & Array Computing:** NumPy, Rasterio, GDAL
- **Data & Evaluation:** Scikit-learn, SciPy
- **Integration Layer:** Interfaces with FastAPI backend worker routines and Deck.gl frontend layers.

## 4. Current Status: Week 1 — Day 1
- **Phase:** Environment setup, repo alignment, and hyperspectral architecture specification.
- **Branch:** `Harsh`
- **Hardware Profile:** NVIDIA GeForce RTX 3050 (6 GB VRAM), CUDA 12.4.
- **Next Milestone:** Day 2 Tensor Input/Output Specifications.
