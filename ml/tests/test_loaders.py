import numpy as np
import pytest

from terraspectra_ml.data.loaders import make_dataloader


def test_loader_reports_missing_pytorch():
    try:
        import torch  # noqa: F401
    except ImportError:
        with pytest.raises(RuntimeError, match="PyTorch is required"):
            make_dataloader(np.ones((2, 3, 4, 4)))
    else:
        pytest.skip("PyTorch is installed; loader behavior tested separately")


def test_loader_batches_when_pytorch_available():
    pytest.importorskip("torch")
    x = np.ones((5, 3, 4, 4), dtype=np.float32)
    y = np.array([0, 1, 0, 1, 0])
    loader = make_dataloader(x, y, batch_size=2)

    batches = list(loader)
    assert len(batches) == 3
    assert batches[0][0].shape == (2, 3, 4, 4)
    assert batches[0][1].dtype.name == "int64" if hasattr(
        batches[0][1].dtype, "name"
    ) else str(batches[0][1].dtype) == "torch.int64"


def test_loader_rejects_invalid_batch_size_when_pytorch_available():
    pytest.importorskip("torch")
    with pytest.raises(ValueError):
        make_dataloader(np.ones((2, 3, 4, 4)), batch_size=0)
