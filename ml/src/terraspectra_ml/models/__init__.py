"""TerraSpectra ML Models Package.

Exports validated input contract and DataLoader batch adaptation utilities.
"""

from terraspectra_ml.models.input_contract import (
    InputContractError,
    InputContractSpec,
    adapt_4d_patch_batch_to_5d,
    resolve_target_device,
    validate_model_input,
)

__all__ = [
    "InputContractError",
    "InputContractSpec",
    "adapt_4d_patch_batch_to_5d",
    "resolve_target_device",
    "validate_model_input",
]
