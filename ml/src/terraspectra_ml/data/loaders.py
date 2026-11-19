import numpy as np

def make_dataloader(patches, labels=None, batch_size=8,
                    shuffle=False, seed=42):
    try:
        import torch
        from torch.utils.data import TensorDataset, DataLoader
    except ImportError as exc:
        raise RuntimeError("PyTorch is required for DataLoader") from exc

    x = np.asarray(patches, dtype=np.float32)
    if x.ndim != 4:
        raise ValueError("Expected patches shaped (N, C, H, W)")
    if len(x) == 0:
        raise ValueError("Dataset is empty")
    if not np.isfinite(x).all():
        raise ValueError("Patches contain invalid values")

    tensors = [torch.from_numpy(x)]
    if labels is not None:
        y = np.asarray(labels)
        if len(y) != len(x):
            raise ValueError("Image and label counts differ")
        tensors.append(torch.as_tensor(y, dtype=torch.long))

    dataset = TensorDataset(*tensors)
    generator = torch.Generator()
    generator.manual_seed(seed)
    return DataLoader(
        dataset, batch_size=batch_size,
        shuffle=shuffle, generator=generator
    )
