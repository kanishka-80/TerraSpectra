# TerraSpectra - Hyperspectral Dataset Evaluation

## 1. Research Objective
Identify and evaluate publicly available hyperspectral datasets
that may support agricultural monitoring and crop-health research.

## 2. Dataset Evaluation Criteria
- Dataset name and original source.
- Sensor and acquisition details.
- Number of spectral bands.
- Wavelength range and spatial resolution.
- Ground-truth labels and annotation quality.
- Geographic and seasonal coverage.
- Data format and accessibility.
- Usage license and research limitations.

## 3. Candidate Dataset Categories
- Agricultural hyperspectral imagery.
- Crop-specific spectral datasets.
- Plant disease hyperspectral datasets.
- Vegetation stress monitoring datasets.

## 4. Validation Checklist
- [ ] Verify original dataset source.
- [ ] Confirm download and usage permissions.
- [ ] Inspect raster dimensions and spectral bands.
- [ ] Verify wavelength metadata.
- [ ] Check NoData values and missing regions.
- [ ] Examine ground-truth labels.
- [ ] Determine whether disease labels are independently verified.
- [ ] Record dataset limitations.

## 5. Dataset Comparison
No dataset has been selected as the primary dataset yet.
Candidates must be evaluated using the criteria above.

## 6. Selection Decision
The primary dataset will be selected only after verifying
its metadata, label quality, accessibility, and suitability
for the intended agricultural monitoring task.

## Status
Research framework prepared. Dataset verification is pending.

## 7. Research Update - 15 November 2026

### Candidate A: Rice_Blast_Hyper_Image
Source:
https://zenodo.org/records/20791118

- Rice leaf hyperspectral observations.
- Three susceptible rice cultivars.
- VNIR wavelength range: 366-1016 nm.
- Greenhouse observations after inoculation.
- Explicit license still requires verification.
- Not satellite imagery.

Status: Promising research candidate; not approved for use.

### Candidate B: Rice Salinity Hyperspectral Dataset
Source:
https://datadryad.org/dataset/doi:10.5061/dryad.2jm63xsrm

- Rice salinity stress observations.
- 243 spectral image bands.
- Wavelength range: 550-1700 nm.
- Six rice genotypes with control and salinity treatments.
- Dataset size approximately 39.36 GB.
- Exact reuse terms must be recorded before redistribution.

Status: Useful for abiotic stress research; not disease or satellite data.

### Candidate C: NCHU Rice Disease Hyperspectral Dataset
Source:
https://aidata.nchu.edu.tw/smarter/en/dataset/smarter_06_group3_0_seed_20230314_7a11_bb150u

- HDR hyperspectral images and XML annotations.
- Wavelength range: 470-900 nm.
- Rice seed nematode infection.
- Academic-use restrictions and redistribution limitations apply.

Status: Permission and suitability verification required.

### Candidate D: Albino Rice Seedlings
Source:
https://data.mendeley.com/datasets/f8zr2kzrcx/1

- Leaf spectral measurements.
- Absorbance, reflectance and transmittance.
- Natural cold stress.
- CC BY 4.0 listed on the dataset page.
- Not a satellite raster dataset.

Status: Secondary spectral research candidate.

### Important Decision

None of these candidates is yet approved as the primary
satellite dataset for TerraSpectra.

Do not claim satellite validation, disease ground-truth
verification or GIS compatibility until actual source
files and metadata have been inspected.
