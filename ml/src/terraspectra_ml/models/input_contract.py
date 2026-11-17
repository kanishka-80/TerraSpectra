"""Input contract validation and DataLoader batch adaptation for TerraSpectra 3D-CNN.

Enforces the 5D tensor contract: [Batch, Channels, Depth, Height, Width]
([B, C, D, H, W]) before passing data into 3D-CNN layers, and provides an
explicit adapter for 4D [B, D, H, W] batches emitted by Khushi's PatchDataset/DataLoader.
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
    expected_height: Optional[int] = 9
    expected_width: Optional[int] = 9
    min_spatial_size: int = 5
    require_odd_spatial: bool = True
    allowed_dtypes: Tuple[str, ...] = ("float32",)
    allow_nan: bool = False
    allow_inf: bool = False
    expected_device: Optional[str] = None


def resolve_target_device(requested_device: str = "auto") -> str:
    """Resolve explicit execution device string without silent fallbacks."""
    normalized = requested_device.strip().lower()
    cuda_available = bool(HAS_TORCH and torch.cuda.is_available())

    if normalized == "auto":
        return "cuda" if cuda_available else "cpu"
    if normalized == "cpu":
        return "cpu"
    if normalized.startswith("cuda"):
        if not cuda_available:
            raise InputContractError(
                f"Device '{requested_device}' was explicitly requested, but CUDA/PyTorch GPU is unavailable."
            )
        return normalized

    raise InputContractError(
        f"Unsupported device specification '{requested_device}'. Expected 'auto', 'cpu', or 'cuda'."
    )


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


def adapt_4d_patch_batch_to_5d(
    batch: Any,
    spec: Optional[InputContractSpec] = None,
) -> Any:
    """Adapt a 4D DataLoader batch [B, D, H, W] into a validated 5D tensor [B, 1, D, H, W].

    Bridges Khushi's PatchDataset/DataLoader output shape (samples, bands, height, width)
    with the 3D-CNN volumetric input contract (Batch, Channels=1, Depth, Height, Width).
    """
    is_tensor = _is_torch_tensor(batch)
    is_ndarray = isinstance(batch, np.ndarray)

    if not (is_tensor or is_ndarray):
        raise InputContractError(
            f"Unsupported batch type '{type(batch).__name__}'. Expected numpy.ndarray or torch.Tensor."
        )

    if batch.ndim != 4:
        raise InputContractError(
            f"adapt_4d_patch_batch_to_5d expects a 4D batch [B, D, H, W], got {batch.ndim}D with shape {tuple(batch.shape)}."
        )

    adapted = batch.unsqueeze(1) if is_tensor else np.expand_dims(batch, axis=1)
    validate_model_input(adapted, spec=spec)
    return adapted


def validate_model_input(
    x: Any,
    spec: Optional[InputContractSpec] = None,
) -> Tuple[int, int, int, int, int]:
    """Validate a 5D hyperspectral input tensor against the TerraSpectra contract."""
    if spec is None:
        spec = InputContractSpec()

    is_tensor = _is_torch_tensor(x)
    is_ndarray = isinstance(x, np.ndarray)

    if not (is_tensor or is_ndarray):
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

    # 3. Channel check (C = 1)
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

    # 7. Device check
    if spec.expected_device is not None:
        expected_dev = spec.expected_device.strip().lower()
        if is_tensor:
            actual_dev = str(x.device).lower()
            if not (actual_dev == expected_dev or actual_dev.startswith(expected_dev + ":")):
                raise InputContractError(
                    f"Tensor device mismatch: expected '{spec.expected_device}', got '{x.device}'."
                )
        elif expected_dev != "cpu":
            raise InputContractError(
                f"NumPy arrays reside on host CPU memory and cannot satisfy expected_device='{spec.expected_device}'."
            )

    # 8. NaN and Inf numerical checks
    if is_tensor:
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
