# Label Audit

## Automated checks
The audit script checks:
- Total CSV records
- Missing labels
- Unique class count
- Class frequency
- Duplicate sample IDs, when an ID column is provided

## Run

```bash
./.venv/Scripts/python.exe ml/scripts/audit_labels.py path/to/labels.csv --label-column disease --id-column sample_id
```

## Manual verification still required
- Original label source and license
- Label definition and class mapping
- Sample-to-label alignment
- Geographic and temporal validity
- Class distribution and imbalance
- Spatial leakage between data splits

A structurally valid CSV is not proof of correct ground truth.
The script intentionally does not mark labels as verified.
