"""TerraSpectra ML Models Package.

Exports the validated input contract interfaces. Neural network modules
(cnn3d, vit_spectral, hybrid_model) are scheduled for Week 2 implementation.
"""

from terraspectra_ml.models.input_contract import (
    InputContractError,
    InputContractSpec,
    validate_model_input,
)

__all__ = [
    "InputContractError",
    "InputContractSpec",
    "validate_model_input",
]
