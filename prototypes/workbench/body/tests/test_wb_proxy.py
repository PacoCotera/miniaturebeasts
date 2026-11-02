"""Workbench chunk 2: the warm proxy renderer on a small box (needs the bpy venv)."""
import os, sys, unittest, shutil, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from wb import proxy as P, hashing as H

SCRATCH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scratch", "t_proxy")


def box(dx=0.0):
    V = np.array([[-.3, -.2, .9], [.3, -.2, .9], [.3, .2, .9], [-.3, .2, .9], [-.3, -.2, 1.5], [.3, -.2, 1.5], [.3, .2, 1.5], [-.3, .2, 1.5]], float)
    V[:, 0] += dx
    F = np.array([[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
    return dict(V=V, F=F, part=np.array([0, 0, 0, 0, 1, 1, 1, 1]))


def png_size(path):
    d = open(path, "rb").read(32)
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    return int.from_bytes(d[16:20], "big"), int.from_bytes(d[20:24], "big")


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.makedirs(SCRATCH, exist_ok=True)
        cls.pr = P.ProxyRenderer()
        cls.pr.warm(os.path.join(SCRATCH, "w.png"))
        cls.pr.set_mesh(box(), "box")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def png(self, mode, az, size):
        p = os.path.join(SCRATCH, f"{mode}-{az}-{size}.png")
        ms = self.pr.render(mode, az, size, p)
        return p, ms

    def test_every_mode_and_size_gives_the_house_pixel_size(self):
        for size, (w, h, _) in P.SIZES.items():
            for mode in P.MODES:
                p, ms = self.png(mode, 32, size)
                self.assertEqual(png_size(p), (w, h))
                self.assertGreater(ms, 0)

    def test_the_modes_differ(self):
        raw = {m: open(self.png(m, 32, 96)[0], "rb").read() for m in P.MODES}
        self.assertEqual(len(set(raw.values())), 4)

    def test_same_view_same_bytes(self):
        a = open(self.png("clay", 90, 96)[0], "rb").read()
        self.pr.render("normal", 0, 96, os.path.join(SCRATCH, "x.png"))
        b = open(self.png("clay", 90, 96)[0], "rb").read()
        self.assertEqual(H.hash_of(a.hex()), H.hash_of(b.hex()))

    def test_a_new_mesh_replaces_the_old_and_the_same_key_is_free(self):
        self.assertEqual(self.pr.set_mesh(box(), "box"), 0.0)
        a = open(self.png("clay", 0, 96)[0], "rb").read()
        self.assertGreater(self.pr.set_mesh(box(0.4), "box2"), 0.0)
        b = open(self.png("clay", 0, 96)[0], "rb").read()
        self.assertNotEqual(a, b)
        self.pr.set_mesh(box(), "box")
        self.assertEqual(a, open(self.png("clay", 0, 96)[0], "rb").read())

    def test_bad_mode_and_size_are_refused(self):
        with self.assertRaises(ValueError):
            self.pr.render("plush", 0, 96, os.path.join(SCRATCH, "n.png"))
        with self.assertRaises(ValueError):
            self.pr.render("clay", 0, 100, os.path.join(SCRATCH, "n.png"))


if __name__ == "__main__":
    unittest.main()
