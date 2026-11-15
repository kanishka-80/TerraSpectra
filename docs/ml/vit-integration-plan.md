# TerraSpectra — Vision Transformer (ViT) Integration & Attention Plan

**Version:** 1.0.0  
**Date:** November 16, 2026  
**Author:** Harsh (ML Engineering Lead)  
**Status:** Conceptual Architecture Specification (Implementation scheduled for Week 2)

---

## 1. Architectural Motivation
The 3D-CNN backbone extracts localized spectral-spatial features across adjacent wavelengths (`k_d`) and immediate spatial neighborhoods (`3 x 3`). However, plant physiological stress often manifests as **non-local cross-band relationships** (e.g., simultaneous changes in visible chlorophyll absorption at ~670 nm, red-edge slope at ~710 nm, and SWIR canopy water absorption at ~1450/1950 nm) alongside multi-pixel canopy texture patterns. A Vision Transformer (ViT) encoder placed downstream of the 3D-CNN models global self-attention across these extracted feature tokens.

---

## 2. Conceptual 3D-CNN to ViT Feature Flow

    Input Patch Tensor: [B, 1, D, H, W]   (e.g., [B, 1, D, 13, 13], float32)
           |
           v
    3D-CNN Feature Extractor (Blocks 1 -> 2 -> 3)
    Output Feature Volume: [B, C_3d, D_2, H_2, W_2]   (e.g., [B, 32, D_2, 11, 11])
           |
           v
    Adaptive Spectral-Spatial Pooling: AdaptiveAvgPool3d((D_p, H_p, W_p))
    Standardized Volume: [B, 32, D_p, H_p, W_p]   (candidate: [B, 32, 4, 5, 5])
           |
           v
    Tokenization & Linear Projection
    - Collapse (C_3d * D_p) per spatial grid cell -> [B, H_p * W_p, C_3d * D_p] ([B, 25, 128])
    - Linear Projection to Transformer Embedding Dim E -> [B, N, E] ([B, 25, 128])
           |
           v
    Prepend Learnable [CLS] Token & Add Positional Encoding
    Token Sequence: [B, N + 1, E]   (e.g., [B, 26, 128])
           |
           v
    Transformer Encoder Stack (L layers, H attention heads, MLP dim 2*E)
    Encoded Sequence: [B, N + 1, E]
           |
           v
    Extract [CLS] Representation: [B, E] ([B, 128])
           |
           v
    Classification Head: Dropout(0.2) -> Linear(E, K) -> Logits [B, K] -> Softmax [B, K]

---

## 3. Detailed Stage Specifications (Task 4)

### 3.1 Token Generation & Embedding Projection
- **Sensor-Agnostic Pooling:** `AdaptiveAvgPool3d((D_p, H_p, W_p))` normalizes variable input band counts (`D`) into a fixed spectral-spatial feature grid `[B, 32, 4, 5, 5]`.
- **Spatial-Spectral Tokenization:** Each of the $N = H_p \times W_p = 25$ spatial positions holds a spectral-channel feature vector of length $32 \times 4 = 128$. A linear projection maps this vector to embedding dimension $E = 128$, yielding sequence `[B, 25, 128]`.
- **Alternative Tokenization (Week 2 Ablation):** Spectral-band tokenization (treating compressed spectral groups as tokens) may be compared against spatial-spectral tokenization during Week 2 experiments.

### 3.2 Positional Encoding
- Because self-attention is permutation-equivariant, learnable 1D positional embeddings $\mathbf{E}_{\text{pos}} \in \mathbb{R}^{(N+1) \times E}$ are added to the token sequence so the transformer retains relative spatial layout across the `5 x 5` pooled patch grid.

### 3.3 Multi-Head Self-Attention & Feed-Forward Layers
- With $E = 128$ and `num_heads = 4`, each attention head operates on $d_k = 128 / 4 = 32$ dimensions.
- Multi-head attention computes:
  $$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
- Followed by Pre-LayerNorm, residual connections, and a 2-layer GELU MLP (`128 -> 256 -> 128`).

### 3.4 Design Trade-Offs & Constraints
- **Sequence Length ($N + 1 = 26$):** Self-attention scales as $O(N^2)$. Keeping $N = 25$ keeps attention matrices tiny ($26 \times 26$), ensuring fast inference and minimal VRAM overhead on a 6 GB GPU.
- **Information Loss Risk:** Aggressive pooling (`11 x 11 -> 5 x 5` spatially, `D_2 -> 4` spectrally) compresses fine-grained details. Week 2 ablations must verify whether `D_p = 4` preserves sufficient spectral discrimination compared to the standalone 3D-CNN.

---

## 4. Attention Interpretation Research & Scientific Limitations (Task 5)

### 4.1 What Attention Weights Represent
In each transformer layer, the attention matrix $\mathbf{A} \in \mathbb{R}^{H \times (N+1) \times (N+1)}$ captures normalized dot-product similarity weights indicating how strongly each token attends to every other token (and how strongly the `[CLS]` token aggregates information from specific spatial patch sub-regions).

### 4.2 Potential Diagnostic Use in TerraSpectra
- **Spatial Attention Rollout:** Aggregating `[CLS]` attention weights across layers and reshaping back to the `5 x 5` grid (upsampled to `13 x 13`) highlights which spatial sub-regions inside an agricultural patch contributed most to a stress prediction.
- **Dashboard Concept (Future Phase):** Could be surfaced alongside Khushi's SHAP/Grad-CAM spectral band importance curves in Ritvik's zone inspector panel.

### 4.3 Critical Scientific Limitations
1. **Attention Is Not Causal Explanation:** High attention weight on a token does not prove that token caused the classification decision; value vectors (`V`) may carry small norms or be canceled out in subsequent residual layers.
2. **Spatial Coarse-Graining:** Because tokens represent pooled `3D-CNN` feature maps rather than raw individual wavelengths, ViT spatial attention alone cannot isolate narrow physical absorption bands (e.g., 710 nm red-edge) without gradient-based or perturbation attribution (SHAP / Integrated Gradients).
3. **Engineering Guardrail:** Attention maps must be presented strictly as diagnostic inspection aids for researchers, never as standalone agronomic proof of disease pathology.
