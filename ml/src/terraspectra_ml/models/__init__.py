"""TerraSpectra ML Models Package.

Exports validated input contract helpers and the initial 3D-CNN architecture.
"""

from terraspectra_ml.models.cnn3d import (
    ClassificationHead,
    Conv3DBlock,
    SpatialSpectral3DExtractor,
    TerraSpectra3DCNN,
)
from terraspectra_ml.models.input_contract import (
    InputContractError,
    InputContractSpec,
    adapt_4d_patch_batch_to_5d,
    resolve_target_device,
    validate_model_input,
)

__all__ = [
    "ClassificationHead",
    "Conv3DBlock",
    "InputContractError",
    "InputContractSpec",
    "SpatialSpectral3DExtractor",
    "TerraSpectra3DCNN",
    "adapt_4d_patch_batch_to_5d",
    "resolve_target_device",
    "validate_model_input",
]
