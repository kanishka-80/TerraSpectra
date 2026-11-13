import unittest

try:
    import numpy as np
    from terraspectra_ml.data.preprocessing import SpectralNormalizer
    AVAILABLE = True
except ImportError:
    AVAILABLE = False


@unittest.skipUnless(AVAILABLE, "NumPy is not installed")
class TestPreprocessing(unittest.TestCase):

    def test_fit_transform(self):
        values = np.array([[1., 10.], [3., 20.], [5., 30.]])
        normalizer = SpectralNormalizer()
        transformed = normalizer.fit_transform(values)
        self.assertEqual(transformed.shape, values.shape)
        self.assertTrue(np.allclose(transformed.mean(axis=0), 0))

    def test_transform_before_fit(self):
        with self.assertRaises(RuntimeError):
            SpectralNormalizer().transform([[1., 2.]])

    def test_nonfinite_rejected(self):
        with self.assertRaises(ValueError):
            SpectralNormalizer().fit([[1., float("nan")]])


if __name__ == "__main__":
    unittest.main()
