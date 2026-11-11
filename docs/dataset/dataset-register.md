# TerraSpectra - Hyperspectral Dataset Register

Research date: 11 November 2026
Owner: Khushi - ML & Data Engineering

## 1. EnMAP

Sensor: Hyperspectral satellite
Spectral coverage: Approximately 420-2450 nm
Spatial resolution: 30 m
Bands: Product-dependent; nominal instrument specifications
report 242/246 channels depending on reference and product.

Official references:
https://www.enmap.org/mission/
https://www.enmap.org/data_access/

Access:
DLR EnMAP Data Access Portal and EOWEB GeoPortal.
Product levels include L1B, L1C and L2A.

Initial assessment:
Strong candidate for vegetation and land-surface spectral analysis.

Pending:
- Identify suitable agricultural scenes.
- Verify crop-stress ground truth.
- Check individual product quality masks.
- Confirm download and usage conditions.

## 2. PRISMA

Sensor: Hyperspectral satellite
Spectral coverage: Approximately 400-2505 nm
Spatial resolution: 30 m
Hyperspectral channels: 240 (66 VNIR + 174 SWIR).

Official references:
https://www.asi.it/en/earth-science/prisma/
https://prisma.asi.it/

Access:
PRISMA portal; user registration is required for dataset access.

Initial assessment:
Strong candidate for vegetation spectral analysis.

Pending:
- Identify agricultural scenes.
- Verify available crop labels.
- Inspect HDF5 product structure.
- Confirm access and usage conditions.

## 3. NASA EMIT

Sensor: Hyperspectral imaging spectrometer
Spectral coverage: Approximately 381-2493 nm
Spatial resolution: 60 m
Bands: 285.

Official references:
https://search.earthdata.nasa.gov/search?q=EMIT
https://lpdaac.usgs.gov/

Access:
NASA Earthdata Search / LP DAAC.

Initial assessment:
Useful secondary source for spectral research.
Its primary science focus is mineral dust and surface
composition, so crop disease suitability must be evaluated.

Pending:
- Identify relevant agricultural coverage.
- Inspect NetCDF4 product structure.
- Verify label availability and access conditions.

## 4. AVIRIS / AVIRIS-NG

Sensor: Airborne imaging spectrometer
Type: Hyperspectral imaging.

Official references:
https://aviris.jpl.nasa.gov/data/
https://aviris.jpl.nasa.gov/dataportal/
https://vedas.sac.gov.in/aviris/

Access:
JPL data portal and ISRO VEDAS portal.
Requirements differ by archive and product.

Initial assessment:
Potentially useful for detailed vegetation studies.
Specifications vary by instrument generation and campaign.

Pending:
- Select the exact AVIRIS instrument/version.
- Identify agricultural flight lines.
- Verify crop labels and field observations.
- Confirm product format and licensing.

## Preliminary Recommendation

EnMAP and PRISMA should be investigated first
as satellite hyperspectral candidates.

AVIRIS-NG should also be investigated for
higher-spatial-detail agricultural observations.

EMIT remains a secondary research candidate.

No final dataset has been selected yet.

## Label Audit Requirement

For every candidate, verify:
- Crop type
- Stress or disease category
- Ground-truth collection method
- Observation date
- Geographic coverage
- Label quality
- Alignment between imagery and labels

Hyperspectral imagery alone does not establish
that crop disease labels are available.
