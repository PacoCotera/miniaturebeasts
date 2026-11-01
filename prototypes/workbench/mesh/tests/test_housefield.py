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
        for k, v in self.f["fp"].items():
            self.assertAlmostEqual(self.h.fp[k], v, delta=1e-9, msg=k)

    def test_clamps_move_two_numbers_by_under_a_thousandth(self):
        d = self.h.fp_unclamped_delta(self.f["fpClamped"])
        self.assertEqual(sorted(d), ["gap", "noseW"])
        self.assertLess(max(abs(v) for v in d.values()), 1e-3)

    def test_pose_scene_geometry(self):
        f, h = self.f, self.h
        for k in ("yawBody", "yawFace", "yawHead", "roll", "pitch", "cameraYaw", "headYawSigned", "rollSigned"):
            self.assertAlmostEqual(h.pose[k], f["pose"][k], delta=1e-9, msg=k)
        self.assertAlmostEqual(h.S, f["S"], delta=1e-9)
        for k, v in f["geometry"].items():      # mouthZ and noseHalfH carry the two sub-thousandth clamps (the SDF is clamped, the port is not)
            self.assertAlmostEqual(h.g[k], v, delta=2e-3 if k in ("mouthZ", "noseHalfH") else 1e-9, msg=k)
        np.testing.assert_allclose(h.M["c"], f["M"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.M["r"], f["M"]["r"], atol=1e-9)
        np.testing.assert_allclose(h.chest["c"], f["chest"]["c"], atol=1e-9)
        np.testing.assert_allclose(h.pelvis["r"], f["pelvis"]["r"], atol=1e-9)
        for e, fe in zip(h.eyes, f["eyes"]):
            np.testing.assert_allclose(e["c"], fe["c"], atol=1e-9)
            np.testing.assert_allclose(e["n"], fe["n"], atol=1e-6)
        np.testing.assert_allclose(h.nose["c"], f["nose"]["c"], atol=2e-3)
        np.testing.assert_allclose(h.nose["r"], f["nose"]["r"], atol=2e-3)

    def test_head_fields(self):
        a = np.array(self.f["samples"]["headLocal"])
        p = a[:, :3]
        np.testing.assert_allclose(self.h.dK(p), a[:, 3], atol=1e-9)
        np.testing.assert_allclose(self.h.dM(p), a[:, 4], atol=1e-9)
        np.testing.assert_allclose(self.h.d0(p), a[:, 5], atol=1e-9)

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
