"""Model definitions and input contracts for TerraSpectra ML."""

from terraspectra_ml.models.cnn3d import (
    ClassificationHead,
    Conv3DBlock,
    SpatialSpectral3DExtractor,
    TerraSpectra3DCNN,
)
from terraspectra_ml.models.fusion import ConcatProjectionFusion
from terraspectra_ml.models.hybrid import TerraSpectraHybridCNNViT
from terraspectra_ml.models.input_contract import (
    InputContractError,
    InputContractSpec,
    adapt_4d_patch_batch_to_5d,
    resolve_target_device,
    validate_model_input,
)
from terraspectra_ml.models.transformer_blocks import (
    TransformerEncoderBlock,
    TransformerEncoderStack,
)
from terraspectra_ml.models.vit import (
    HyperspectralTokenEmbedding,
    LearnablePositionalEncoding,
    TerraSpectraViT,
    TerraSpectraViTStub,
    ViTArchitectureSpec,
    ViTClassificationHead,
    ViTTokenContract,
    validate_vit_token_tensor,
)

__all__ = [
    "ClassificationHead",
    "ConcatProjectionFusion",
    "Conv3DBlock",
    "HyperspectralTokenEmbedding",
    "InputContractError",
    "InputContractSpec",
    "LearnablePositionalEncoding",
    "SpatialSpectral3DExtractor",
    "TerraSpectra3DCNN",
    "TerraSpectraHybridCNNViT",
    "TerraSpectraViT",
    "TerraSpectraViTStub",
    "TransformerEncoderBlock",
    "TransformerEncoderStack",
    "ViTArchitectureSpec",
    "ViTClassificationHead",
    "ViTTokenContract",
    "adapt_4d_patch_batch_to_5d",
    "resolve_target_device",
    "validate_model_input",
    "validate_vit_token_tensor",
]
