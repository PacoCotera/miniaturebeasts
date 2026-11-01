"""S20 chunk 0: the species file and the paths. S01 loads byte-identical; S20 validates and loads with no house; FK at yaw 0 is the old FK; the ear and tail joints land where concept.mjs puts them."""
import os, sys, json, math, unittest, hashlib, copy
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import paths as PA, schema as SC

HERE = os.path.dirname(os.path.abspath(__file__))
S20 = os.path.join(os.path.dirname(HERE), "species", "S20.json")
S01_HASH = "386d0bae1cfb7c362ce16046b253f4516a31254e4ff7b303c00c8739a9531e57"      # sha256 of the loaded S01 spec before S20 (resolved, forward kinematics expanded)


def old_fk(root, joints):
    P = [np.array(root, float)]
    for j in joints[1:]:
        a = math.radians(j["pitch"])
        P.append(P[-1] + j["len"] * np.array([math.cos(a), 0.0, math.sin(a)]))
    return np.array(P)


class T(unittest.TestCase):
    def test_s01_loads_byte_identical(self):
        spec, H = SC.load()
        spec.pop("_names", None)
        self.assertEqual(hashlib.sha256(json.dumps(spec, sort_keys=True, default=float).encode()).hexdigest(), S01_HASH)

    def test_fk_yaw0_is_the_old_fk(self):
        spec, _ = SC.load()
        for nm in ("fore.L", "hind.L"):
            js = spec["parts"][nm]["joints"]
            root = np.array(js[0]["at"], float)
            self.assertTrue(np.array_equal(PA.fk(root, js), old_fk(root, js)))
            self.assertTrue(np.array_equal(PA.fk(root, js, plane_yaw=0.0), old_fk(root, js)))

    def test_fk_yaw_is_a_rotation_about_the_vertical(self):
        js = [dict(at=[0, 0, 0]), dict(len=0.3, pitch=40), dict(len=0.2, pitch=-20)]
        P0, P1 = PA.fk([0, 0, 0], js), PA.fk([0, 0, 0], js, plane_yaw=100.0)
        c, s = math.cos(math.radians(100)), math.sin(math.radians(100))
        R = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
        self.assertLess(np.abs(P0 @ R.T - P1).max(), 1e-12)
        self.assertTrue(np.allclose(np.linalg.norm(np.diff(P1, axis=0), axis=1), [0.3, 0.2]))

    def test_s20_validates_and_loads_with_no_house(self):
        import housefield
        real = housefield.House
        def boom(*a, **k):
            raise AssertionError("House must not be called for S20")
        housefield.House = boom
        try:
            spec, H = SC.load(S20)
        finally:
            housefield.House = real
        self.assertIsNone(H)
        self.assertEqual(spec["species"], "S20")
        self.assertTrue(SC.validate(spec))
        t = spec["parts"]["torso"]
        self.assertEqual((t["path"]["key"], t["path"]["N"]), ("z", "back"))
        self.assertEqual(spec["parts"]["ear.L"]["kind"], "tube")
        self.assertEqual(spec["parts"]["tail"]["mirror"], "centre")

    def test_s20_rejects_bad_tubes(self):
        raw = json.load(open(S20))
        bad = copy.deepcopy(raw); bad["parts"]["tail"]["mirror"] = "sideways"
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=bad)
        bad = copy.deepcopy(raw); del bad["parts"]["ear.L"]["families"]["prick"]["joints"][1]["len"]
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=bad)
        bad = copy.deepcopy(raw); bad["parts"]["torso"]["path"]["key"] = "q"
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=bad)

    def test_ear_and_tail_joints_land_where_concept_puts_them(self):
        spec, _ = SC.load(S20)
        ref = json.load(open(os.path.join(HERE, "fixtures", "s20_ear_tail_fk.json")))
        for f in ("prick", "lop", "nub"):
            P = np.array(spec["parts"]["ear.L"]["families"][f]["P"])
            self.assertLess(np.abs(P - np.array(ref[f])).max(), 1e-6, f)
        self.assertLess(np.abs(np.array(spec["parts"]["tail"]["P"]) - np.array(ref["tail"])).max(), 1e-6)

    def test_leg_sole_on_floor(self):
        spec, _ = SC.load(S20)
        P = np.array(spec["parts"]["leg.L"]["P"])
        self.assertAlmostEqual(float(P[-1][2]), 0.0, 6)


if __name__ == "__main__":
    unittest.main()
