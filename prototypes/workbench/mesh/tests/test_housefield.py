"""The Python house equals the SDF's, at the pinned commit: fixtures/S01-sdf.json is dumped by tools/dump-house.mjs from foundation/ (read only).
Run: PY=/home/mb/mb/tools-3d/bpyvenv/bin/python; $PY -m unittest discover -s mesh/tests   (from prototypes/workbench)"""
import json, os, sys, unittest
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from housefield import House


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.h = House("S01")
        with open(os.path.join(HERE, "fixtures/S01-sdf.json")) as fh:
            cls.f = json.load(fh)

    def test_face_params_equal_the_sdfs(self):
        for k, v in self.f["fp"].items():                 # the bands' own values
            self.assertAlmostEqual(self.h.fp_raw[k], v, delta=1e-9, msg=k)
        for k, v in self.f["fpClamped"].items():          # and after the clamps: only nose-fit moves this specimen, and it is ported
            self.assertAlmostEqual(self.h.fp[k], v, delta=1e-12, msg=k)

    def test_clamps_move_one_number_by_under_a_third_of_a_percent_of_W(self):
        d = {k: self.h.fp[k] - self.h.fp_raw[k] for k in self.h.fp if abs(self.h.fp[k] - self.h.fp_raw[k]) > 0}
        self.assertEqual(sorted(d), ["noseW"])
        self.assertLess(max(abs(v) for v in d.values()), 4e-3)      # noseW: 0.2570 -> 0.2540 (of W)

    def test_pose_scene_geometry(self):
        f, h = self.f, self.h
        for k in ("yawBody", "yawFace", "yawHead", "roll", "pitch", "cameraYaw", "headYawSigned", "rollSigned"):
            self.assertAlmostEqual(h.pose[k], f["pose"][k], delta=1e-9, msg=k)
        self.assertAlmostEqual(h.S, f["S"], delta=1e-9)
        for k, v in f["geometry"].items():
            self.assertAlmostEqual(h.g[k], v, delta=1e-9, msg=k)
        np.testing.assert_allclose(h.M["c"], f["M"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.M["r"], f["M"]["r"], atol=1e-9)
        np.testing.assert_allclose(h.chest["c"], f["chest"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.pelvis["r"], f["pelvis"]["r"], atol=1e-9)
        for e, fe in zip(h.eyes, f["eyes"]):
            np.testing.assert_allclose(e["c"], fe["c"], atol=1e-9)
            np.testing.assert_allclose(e["n"], fe["n"], atol=1e-6)
        np.testing.assert_allclose(h.nose["c"], f["nose"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.nose["r"], f["nose"]["r"], atol=1e-9)
        np.testing.assert_allclose(h.J["c"], f["J"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.J["r"], f["J"]["r"], atol=1e-9)

    def test_head_fields(self):
        a = np.array(self.f["samples"]["headLocal"])
        p = a[:, :3]
        np.testing.assert_allclose(self.h.dK(p), a[:, 3], atol=1e-9)
        np.testing.assert_allclose(self.h.dM(p), a[:, 4], atol=1e-9)
        np.testing.assert_allclose(self.h.d0(p), a[:, 5], atol=1e-9)
        behind = p[:, 0] < 0.0          # away from the eyes, the nose and the mouth: the SDF's carved head is the house head with the crown's rise
        self.assertGreater(behind.sum(), 100)
        np.testing.assert_allclose(self.h.dh(p[behind]), a[behind, 6], atol=1e-9)

    def test_frozen_dome_to_1e6(self):
        """The AD's frozen dome (fix 7 ruling 1): the skull's section, width and depth, the eyes' places and the roll's sign, equal the SDF's to 1e-6."""
        self.assertAlmostEqual(self.h.W, self.f["W"], delta=1e-6)
        self.assertAlmostEqual(self.h.D, self.f["D"], delta=1e-6)
        for k in ("a", "b", "c", "n"):
            self.assertAlmostEqual(self.h.K[k], self.f["K"][k], delta=1e-6, msg=k)
        self.assertAlmostEqual(self.h.rig["chin-overhang"], 0.26, delta=1e-12)      # fix round 8 (frozen)
        self.assertEqual(self.h.house["kinds"]["head"][self.h.kinds["head"]]["rear-exponent"], 3.2)
        self.assertEqual(self.h.house["solver"]["roll-sign"], -1)
        self.assertAlmostEqual(self.h.pose["rollSigned"], self.f["pose"]["rollSigned"], delta=1e-9)
        pts = np.array(self.f["samples"]["headLocal"])[:, :3]
        np.testing.assert_allclose(self.h.dK(pts), np.array(self.f["samples"]["headLocal"])[:, 3], atol=1e-6)
        for e, fe in zip(self.h.eyes, self.f["eyes"]):
            np.testing.assert_allclose(e["c"], fe["c"], atol=1e-6)
            self.assertAlmostEqual(e["Reye"], fe["Reye"], delta=1e-6)
        # the eyes sit 0.98 H apart in the head frame, the far ring on the outline
        self.assertAlmostEqual(2 * self.h.g["yE"], 0.985, delta=0.01)

    def test_body_fields(self):
        a = np.array(self.f["samples"]["world"])
        p = a[:, :3]
        np.testing.assert_allclose(self.h.dC(p), a[:, 3], atol=1e-9)
        for i, lg in enumerate(self.h.legs):
            np.testing.assert_allclose(lg["d"](p), a[:, 4 + i], atol=1e-9, err_msg=lg["name"])
            np.testing.assert_allclose(lg["d_paw"](p), a[:, 8 + i], atol=1e-9, err_msg=lg["name"])
        core, hb = self.h.d_core_far(p)
        far = hb > 0.35
        self.assertGreater(far.sum(), 20)
        np.testing.assert_allclose(core[far], a[far, 12], atol=1e-9)
        np.testing.assert_allclose(self.h.leg_weight(p), a[:, 13], atol=1e-9)

    def test_leaf_placement(self):
        for l, fl in zip(self.h.leaves, self.f["leaves"]):
            np.testing.assert_allclose(l["c"], fl["c"], atol=1e-9)
            np.testing.assert_allclose(l["aw"], fl["aw"], atol=1e-9)


if __name__ == "__main__":
    unittest.main()
