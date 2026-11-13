"""Optional PyTorch loader adapter."""

def create_torch_loader(
    dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0,
):
    try:
        from torch.utils.data import DataLoader
    except ImportError as exc:
        raise ImportError(
            "PyTorch is optional. Install torch to use this loader."
        ) from exc

    if batch_size < 1:
        raise ValueError("batch_size must be positive.")

    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
    )
