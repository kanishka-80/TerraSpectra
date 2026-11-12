# TerraSpectra - Dataset Intake & Quality Checklist

Date: 12 November 2026
Owner: Khushi - ML & Data Engineering

## 1. Dataset Information

- [ ] Dataset name and source recorded
- [ ] Sensor and acquisition details recorded
- [ ] Dataset access permissions confirmed
- [ ] Usage and licensing conditions reviewed
- [ ] Original files preserved

## 2. File and Raster Inspection

- [ ] File format identified (GeoTIFF, HDF5, NetCDF, etc.)
- [ ] Raster width and height inspected
- [ ] Number of spectral bands recorded
- [ ] Data type and data dimensions checked
- [ ] Wavelength metadata inspected
- [ ] Band ordering documented

## 3. Geospatial Metadata

- [ ] Coordinate Reference System (CRS) recorded
- [ ] Affine transform inspected
- [ ] Spatial resolution recorded
- [ ] Geographic bounds recorded
- [ ] NoData values identified

## 4. Data Quality

- [ ] Missing values checked
- [ ] NaN and infinite values checked
- [ ] Invalid pixels identified
- [ ] Cloud and quality masks reviewed
- [ ] Reflectance scaling verified
- [ ] Data quality observations documented

## 5. Label Audit

- [ ] Crop types identified
- [ ] Stress or disease labels inspected
- [ ] Ground-truth source verified
- [ ] Observation dates checked
- [ ] Label-to-image alignment reviewed
- [ ] Label limitations documented

## 6. Model Integration Coordination

- [ ] Expected tensor dimensions discussed with Harsh
- [ ] Patch size confirmed
- [ ] Spectral band requirements discussed
- [ ] Normalization approach agreed
- [ ] Geospatial metadata shared with Kanishka

## 7. Final Readiness

Dataset status:
PENDING - Awaiting team-provided dataset.

No inspection or validation is marked complete
until the actual dataset has been received and checked.

Prepared by: Khushi
Role: ML & Data Engineering
Project: TerraSpectra
