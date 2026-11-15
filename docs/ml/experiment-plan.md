# TerraSpectra — ML Evaluation, Leakage Prevention & Uncertainty Plan

**Version:** 1.0.0  
**Date:** November 16, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Stakeholders:** Khushi (ML & Data Engineering), Kanishka (Backend Engineering), Ritvik (Frontend & GIS)  
**Status:** Research & Evaluation Specification (No models trained yet)

---

## 1. Evaluation Metrics Strategy (Task 1)

### 1.1 Why Overall Accuracy Alone Is Insufficient
In precision agriculture and crop stress monitoring, healthy vegetation typically dominates the spatial area while early-stage stressed zones represent a minority fraction. Under class imbalance, a trivial classifier predicting only the majority class achieves high overall accuracy while failing completely on early stress detection.

### 1.2 Selected Metrics & Justification
All evaluation runs must report the following metrics across validation and held-out test splits:

| Metric | What It Measures | Why Relevant to TerraSpectra | When Used | Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **Macro F1-Score** | Unweighted arithmetic mean of per-class F1 scores. | Treats minority stressed classes and majority healthy classes with equal importance. | Primary model selection criterion across experiments. | Sensitive to very small noisy classes if sample counts are tiny. |
| **Per-Class Precision** | $\frac{TP}{TP + FP}$ for each class. | Quantifies false alarms (healthy fields flagged as stressed, causing unnecessary scouting). | Per-class diagnostic reporting. | Ignores missed stress events (false negatives). |
| **Per-Class Recall** | $\frac{TP}{TP + FN}$ for each class. | Quantifies sensitivity to early crop stress; missing stressed zones is costly for farmers. | Per-class diagnostic reporting (critical for alert classes). | Can be artificially inflated by over-predicting stress. |
| **Weighted F1-Score** | Support-weighted average of per-class F1 scores. | Reflects aggregate performance weighted by real class prevalence. | Secondary summary metric alongside Macro F1. | Dominated by majority class under heavy imbalance. |
| **Confusion Matrix** | Exact counts/rates of true vs. predicted class pairs. | Reveals specific inter-class confusions (e.g., mild vs. severe stress or soil background bleed). | Every validation and test evaluation checkpoint. | Does not summarize performance in a single scalar. |
| **ROC-AUC** | Area under Receiver Operating Characteristic curve across thresholds. | Measures ranking quality of predicted probabilities independent of decision threshold. | Binary (`healthy` vs. `stressed`) or One-vs-Rest multiclass evaluation. | Can appear overly optimistic under extreme class imbalance (supplement with PR-AUC). |
| **Overall Accuracy** | Fraction of all correctly classified samples. | Standard baseline reference for literature comparison. | Secondary reference only; never sole selection metric. | Misleading when class distributions are skewed. |

---

## 2. Baseline vs. Hybrid Model Comparison Strategy (Task 2)

Complex hybrid architectures must earn their computational cost experimentally rather than being assumed superior.

### 2.1 Model Comparison Ladder
1. **Classical Spectral Baseline (Khushi's Scope):** Random Forest / RBF-SVM trained on pixel-level spectral vectors (and/or PCA features). Tests pure spectral separability without spatial neighborhood context.
2. **2D-CNN Spatial-Spectral Baseline:** Standard 2D convolutions treating spectral bands as flat channels `[B, D, H, W]`. Tests spatial-spectral learning without explicit 3D spectral-axis convolutions.
3. **Standalone 3D-CNN (`cnn3d`):** Volumetric 3D convolutions `[B, 1, D, H, W] -> [B, 128] -> Linear`. Tests whether preserving local inter-band spectral derivatives improves over 2D-CNN and classical baselines.
4. **Proposed Hybrid 3D-CNN + ViT:** 3D-CNN local feature extractor coupled with Vision Transformer global self-attention. Tests whether global token relationships improve generalization over local 3D convolutions alone.

### 2.2 Experimental Fairness & Resource Accounting
- **Identical Data Splits:** Every model is trained and evaluated on the exact same spatial train/validation/test index manifests.
- **Identical Preprocessing:** Same band filtering, normalization scale, and random seed (`42`).
- **Resource & Cost Tracking:** Alongside Macro F1 and per-class metrics, every model logs trainable parameter count, peak GPU VRAM usage (target ceiling: 6 GB RTX 3050), training wall-clock time, and per-tile inference latency.
- **Result Persistence:** Metrics, confusion matrices, and config snapshots will be saved as structured JSON/YAML reports in `ml/artifacts/reports/`.

---

## 3. Spatial Data Leakage & Dataset Splitting Strategy (Task 3)

### 3.1 Why Random Pixel Splitting Fails in Hyperspectral Imagery
1. **Spatial Autocorrelation:** Adjacent pixels in agricultural fields share soil moisture, canopy geometry, illumination, and atmospheric conditions.
2. **Overlapping Patch Leakage:** Because TerraSpectra extracts `13 x 13` spatial patches centered on target pixels, randomly assigning neighboring pixels to train and test splits causes up to ~95% pixel overlap between training and test inputs—producing artificially inflated accuracy (often >98%) that fails completely on new fields.

### 3.2 Leakage-Free Splitting Protocol
Depending on the final dataset confirmed by Khushi:
- **Multi-Scene / Multi-Field Datasets (Preferred):** Group-based splitting by disjoint field polygon, acquisition date, or geographical tile so no field/scene appears in more than one split.
- **Single-Scene Benchmark Cubes (e.g., Indian Pines / Salinas):** Disjoint spatial block partitioning (contiguous rectangular blocks assigned to train, validation, and test) separated by a **buffer exclusion zone of at least $\lfloor P / 2 \rfloor = 6$ pixels** (for `13 x 13` patches) so zero receptive-field pixels overlap across split boundaries.
- **Normalization Fit Rule:** Scalers (mean/std or min/max) are computed strictly on the training partition and applied without refitting to validation and test partitions.

---

## 4. Predictive Uncertainty Estimation Research (Task 6)

### 4.1 Model Confidence vs. Predictive Reliability
A standard Softmax output `max(p)` represents relative class affinity within a closed set of training classes; neural networks frequently assign high Softmax confidence (>0.90) to out-of-distribution spectra (e.g., clouds, bare soil, unseen crop varieties, or sensor noise). TerraSpectra separates class probability from uncertainty so analysts can filter unreliable alerts.

### 4.2 Comparison of Uncertainty Approaches

| Approach | Basic Concept | TerraSpectra Application | Advantages | Limitations | Compute Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Softmax Max Probability** | Uses `1 - max(p)` as heuristic uncertainty. | Baseline confidence score in Tier 2/3 output. | Zero extra forward passes. | Poorly calibrated; overconfident on OOD spectra. | Negligible (1 pass). |
| **Predictive Entropy** | $H(\mathbf{p}) = -\sum_{k=1}^K p_k \log(p_k)$ across predicted distribution. | Captures ambiguity when probabilities spread across multiple stress states. | Well-defined information-theoretic measure; works with MC-Dropout. | Still relies on quality of underlying probability distribution. | Negligible on top of probabilities. |
| **Monte Carlo (MC) Dropout** | Keeps dropout active at inference (`T` stochastic forward passes) and measures mean prediction + predictive entropy/variance. | Reuses existing `Dropout(0.2)` in classification head and `Dropout3d(0.1)` in 3D-CNN. | No model duplication; low memory overhead; captures epistemic uncertainty. | Requires `T` forward passes (`T=10..20`) during tile inference. | Moderate (`T`x inference time, fits 6 GB VRAM). |
| **Deep Ensembles** | Trains `M` independent models with different random seeds and aggregates predictions. | Run `M=3..5` checkpoints on high-priority scenes. | Gold-standard calibration and OOD detection. | `M`x training time and `M`x checkpoint storage. | High (`M`x train & inference). |
| **Temperature Scaling** | Learns a single scalar $T > 0$ on validation logits (`z / T`) post-training to align confidence with empirical accuracy. | Calibrates Softmax probabilities before emitting `confidence_map`. | Fast post-hoc calibration; preserves top-1 accuracy. | Does not detect out-of-distribution inputs alone. | Negligible post-hoc step. |

### 4.3 Week 2 / Phase 3 Recommendation
Investigate **MC-Dropout (`T = 10` passes) + Predictive Entropy**, optionally paired with **post-hoc Temperature Scaling** on the validation split. This leverages layers already designed into `hybrid_3dcnn_vit.yaml` without exceeding single-GPU memory limits, and produces a clean `float32` `uncertainty_map` for Kanishka's backend COG export.
