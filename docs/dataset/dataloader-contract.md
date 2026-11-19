# DataLoader Contract

Default image batch layout: N, C, H, W.
Image dtype: float32.
Labels are optional and must be verified before use.
Training may shuffle; validation and test should not shuffle.
The final 3D-CNN axis order must be confirmed with Harsh.
