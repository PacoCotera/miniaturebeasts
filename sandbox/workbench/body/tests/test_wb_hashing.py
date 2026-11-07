"""Workbench chunk 1: canonical hashing. No Blender and no build."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import hashing as H


class T(unittest.TestCase):
    def test_key_order_and_whitespace_do_not_matter(self):
        self.assertEqual(H.hash_of({"a": 1, "b": [1, 2]}), H.hash_of({"b": [1, 2], "a": 1}))

    def test_whole_floats_are_ints_and_tuples_are_lists(self):
        self.assertEqual(H.canonical({"x": 1.0, "y": (1, 2)}), H.canonical({"x": 1, "y": [1, 2]}))

    def test_float_noise_below_12_digits_is_ignored_but_a_real_edit_is_not(self):
        self.assertEqual(H.hash_of({"v": 0.1 + 0.2}), H.hash_of({"v": 0.3}))
        self.assertNotEqual(H.hash_of({"v": 1.10}), H.hash_of({"v": 1.24}))

    def test_numpy_values_hash_like_python_ones(self):
        self.assertEqual(H.hash_of({"v": np.float64(1.5), "w": np.array([1, 2])}), H.hash_of({"v": 1.5, "w": [1, 2]}))

    def test_parts_are_ordered_and_framed(self):
        self.assertNotEqual(H.hash_of("a", "b"), H.hash_of("b", "a"))
        self.assertNotEqual(H.hash_of("ab", "c"), H.hash_of("a", "bc"))

    def test_non_finite_and_unknown_types_are_refused(self):
        with self.assertRaises(ValueError):
            H.canonical({"v": float("nan")})
        with self.assertRaises(TypeError):
            H.canonical({"v": object()})

    def test_the_framework_id_is_stable_and_short(self):
        self.assertEqual(H.framework_id(), H.framework_id())
        self.assertEqual(len(H.framework_id()), 12)

    def test_cage_hash_ignores_negative_zero(self):
        class B:
            def __init__(self, v):
                self.v = v
            def full(self):
                return self.v, [(0, 1, 2, 3)], None, [0], None, None
        a = np.array([[0.0, 1, 2], [1, 0, 0], [0, 1, 0], [1, 1, 1]])
        b = a.copy(); b[0, 0] = -0.0
        self.assertEqual(H.cage_hash(B(a)), H.cage_hash(B(b)))
        c = a.copy(); c[3, 2] += 1e-4
        self.assertNotEqual(H.cage_hash(B(a)), H.cage_hash(B(c)))


if __name__ == "__main__":
    unittest.main()
