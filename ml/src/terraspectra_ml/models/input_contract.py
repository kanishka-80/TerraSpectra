"""Input contract validation for TerraSpectra 3D-CNN and Hybrid models.

Enforces the Day 2 5D tensor contract: [Batch, Channels, Depth, Height, Width]
([B, C, D, H, W]) before passing data into neural network layers.
Supports both NumPy arrays and PyTorch tensors.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Tuple
import numpy as np

try:
    import torch
    HAS_TORCH = True
except ImportError:
    torch = None  # type: ignore
    HAS_TORCH = False


class InputContractError(ValueError):
    """Raised when an input tensor violates the TerraSpectra 3D-CNN input contract."""


@dataclass(frozen=True)
class InputContractSpec:
    """Configurable specification for 5D hyperspectral patch tensors [B, C, D, H, W]."""

    expected_ndim: int = 5
    expected_channels: int = 1
    expected_depth: Optional[int] = None
    min_depth: int = 4
    expected_height: Optional[int] = 13
    expected_width: Optional[int] = 13
    min_spatial_size: int = 3
    require_odd_spatial: bool = True
    allowed_dtypes: Tuple[str, ...] = ("float32",)
    allow_nan: bool = False
    allow_inf: bool = False


def _is_torch_tensor(x: Any) -> bool:
    return HAS_TORCH and isinstance(x, torch.Tensor)


def _get_dtype_name(x: Any) -> str:
    if _is_torch_tensor(x):
        return str(x.dtype).replace("torch.", "")
    if isinstance(x, np.ndarray):
        return str(x.dtype)
    raise InputContractError(
        f"Unsupported input type '{type(x).__name__}'. Expected numpy.ndarray or torch.Tensor."
    )


def validate_model_input(
    x: Any,
    spec: Optional[InputContractSpec] = None,
) -> Tuple[int, int, int, int, int]:
    """Validate a 5D hyperspectral input tensor against the TerraSpectra contract.

    Args:
        x: Input tensor (numpy.ndarray or torch.Tensor) of shape [B, C, D, H, W].
        spec: Optional InputContractSpec override.

    Returns:
        Tuple of validated dimensions (B, C, D, H, W).

    Raises:
        InputContractError: If any dimensional, dtype, or numerical check fails.
    """
    if spec is None:
        spec = InputContractSpec()

    if not (_is_torch_tensor(x) or isinstance(x, np.ndarray)):
        raise InputContractError(
            f"Unsupported input type '{type(x).__name__}'. Expected numpy.ndarray or torch.Tensor."
        )

    # 1. Dimensionality check
    if x.ndim != spec.expected_ndim:
        raise InputContractError(
            f"Expected {spec.expected_ndim}D tensor [B, C, D, H, W], got {x.ndim}D with shape {tuple(x.shape)}."
        )

    b, c, d, h, w = (int(dim) for dim in x.shape)

    # 2. Non-empty check
    if b <= 0 or c <= 0 or d <= 0 or h <= 0 or w <= 0:
        raise InputContractError(
            f"Input tensor cannot have zero or negative dimensions; got shape {(b, c, d, h, w)}."
        )

    # 3. Channel check (C = 1 for volumetric hyperspectral scalar reflectance)
    if spec.expected_channels is not None and c != spec.expected_channels:
        raise InputContractError(
            f"Expected channel dimension C={spec.expected_channels}, got C={c}."
        )

    # 4. Spectral depth check (D)
    if d < spec.min_depth:
        raise InputContractError(
            f"Spectral depth D={d} is smaller than minimum required depth ({spec.min_depth})."
        )
    if spec.expected_depth is not None and d != spec.expected_depth:
        raise InputContractError(
            f"Expected spectral depth D={spec.expected_depth}, got D={d}."
        )

    # 5. Spatial patch dimensions check (H, W)
    if h < spec.min_spatial_size or w < spec.min_spatial_size:
        raise InputContractError(
            f"Spatial dimensions (H={h}, W={w}) must be at least {spec.min_spatial_size}x{spec.min_spatial_size}."
        )
    if spec.expected_height is not None and h != spec.expected_height:
        raise InputContractError(
            f"Expected spatial height H={spec.expected_height}, got H={h}."
        )
    if spec.expected_width is not None and w != spec.expected_width:
        raise InputContractError(
            f"Expected spatial width W={spec.expected_width}, got W={w}."
        )
    if spec.require_odd_spatial and (h % 2 == 0 or w % 2 == 0):
        raise InputContractError(
            f"Spatial patch dimensions (H={h}, W={w}) must be odd so the target pixel is centered."
        )

    # 6. Data type check
    dtype_name = _get_dtype_name(x)
    if spec.allowed_dtypes and dtype_name not in spec.allowed_dtypes:
        raise InputContractError(
            f"Unsupported data type '{dtype_name}'. Allowed dtypes: {spec.allowed_dtypes}."
        )

    # 7. NaN and Inf numerical checks
    if _is_torch_tensor(x):
        has_nan = bool(torch.isnan(x).any().item())
        has_inf = bool(torch.isinf(x).any().item())
    else:
        has_nan = bool(np.isnan(x).any())
        has_inf = bool(np.isinf(x).any())

    if not spec.allow_nan and has_nan:
        raise InputContractError("Input tensor contains NaN values, which are forbidden by the input contract.")
    if not spec.allow_inf and has_inf:
        raise InputContractError("Input tensor contains Infinite (Inf) values, which are forbidden by the input contract.")

    return b, c, d, h, w
