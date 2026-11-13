# Label Audit

## Current status
Ground-truth labels must be verified before supervised training.

## Required checks
- Original label source and license
- Label definition and class mapping
- Sample-to-label alignment
- Missing and invalid labels
- Class distribution and imbalance
- Spatial overlap and potential leakage
- Independent validation and test regions

## Restrictions
Do not infer disease labels from visual appearance without validated
ground truth. Do not create fabricated labels and present them as real.

Baseline model training remains disabled until this audit is complete.
