"""Chunk 0 tests: limbpath's checks reproduce A s3.2; FK mirror exact; the schema rejects a missing joint; the sole lands on the floor; the fold-free numbers of the species' own limbs."""
import os, sys, json, unittest, copy
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import paths as PA, schema as SC

LIMBPATH = "/home/mb/mb/iwq/results/T-20261101-mesh/anatomy"
A32 = {"fore.L": ([[0.45, 0.58, 0.80], [0.41, 0.60, 0.58], [0.48, 0.60, 0.34], [0.53, 0.62, 0.00]], [[0.40, 0.42], [0.34, 0.36], [0.31, 0.30], [0.42, 0.46]]),
       "hind.L": ([[-0.50, 0.56, 0.86], [-0.42, 0.60, 0.58], [-0.54, 0.60, 0.30], [-0.50, 0.62, 0.00]], [[0.46, 0.46], [0.32, 0.33], [0.29, 0.29], [0.36, 0.40]])}


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec, cls.H = SC.load()

    def test_reproduces_A32(self):
        ref = {r["limb"]: r for r in json.load(open(os.path.join(LIMBPATH, "limbpath-loika.json")))}
        for k, (P, R) in A32.items():
            r = PA.check_path(k, ["j0", "j1", "j2", "j3"], P, R)
            e = ref[k]
            self.assertEqual(r["rings"], e["rings"])
            self.assertAlmostEqual(r["length_H"], e["length_H"], 3)
            self.assertAlmostEqual(r["max_ring_ratio"], e["max_ring_ratio"], 2)
            self.assertAlmostEqual(r["max_kappa_r"], e["max_kappa_r"], 2)
            self.assertAlmostEqual(r["min_inner_gap_H"], e["min_inner_gap_H"], 2)
            self.assertLessEqual(r["max_twist_deg_per_ring"], 1.0)

    def test_species_limbs_fold_free(self):
        for k in ("fore.L", "hind.L"):
            p = self.spec["parts"][k]
            r = PA.check_path(k, [j["name"] for j in p["joints"]], p["P"], p["R"], p["fillet"], exact=True)
            self.assertTrue(all(f["ok"] for f in r["fillets"]), (k, r["fillets"]))
            self.assertLessEqual(r["max_ring_ratio"], 1.5)
            self.assertLessEqual(r["max_kappa_r"], 0.85)
            self.assertGreater(r["min_inner_gap_H"], 0)
            self.assertLessEqual(r["max_twist_deg_per_ring"], 1.0)

    def test_sole_on_floor(self):
        for k in ("fore.L", "hind.L"):
            p = self.spec["parts"][k]
            self.assertAlmostEqual(p["P"][-1][2], 0.0, 9)
            self.assertLessEqual(abs(p["solve"]["dpitch"]), 10.0)
            self.assertLessEqual(abs(p["solve"]["root_dz"]), 0.02)

    def test_fk_mirror_exact(self):
        p = self.spec["parts"]["fore.L"]
        js = [dict(j) for j in p["joints"]]
        L = PA.fk(p["joints"][0]["at"], js)
        root_r = np.array(p["joints"][0]["at"]) * np.array([1, -1, 1])
        R = PA.fk(root_r, js)
        self.assertTrue(np.array_equal(L * np.array([1, -1, 1]), R))

    def test_schema_rejects_missing_joint(self):
        with open(SC.SPECIES) as fh:
            s = json.load(fh)
        s2 = copy.deepcopy(s)
        del s2["parts"]["fore.L"]["joints"][1]["len"]
        with self.assertRaises(SC.SchemaError):
            SC.validate(s2)
        s3 = copy.deepcopy(s)
        s3["parts"]["fore.L"]["joints"] = s3["parts"]["fore.L"]["joints"][:2]
        with self.assertRaises(SC.SchemaError):
            SC.validate(s3)
        s4 = copy.deepcopy(s)
        s4["parts"]["head"]["parent"] = "nope"
        with self.assertRaises(SC.SchemaError):
            SC.validate(s4)

    def test_house_refs_resolved(self):
        self.assertAlmostEqual(self.spec["parts"]["head"]["path"]["joints"][1]["at"][1], 1.6406, 3)
        self.assertAlmostEqual(self.spec["parts"]["head"]["path"]["tilt"], 9.45, 2)

    def test_rmf_twist_zero_straight(self):
        pts = np.stack([np.linspace(0, 1, 20), np.zeros(20), np.zeros(20)], -1)
        T, F = PA.rmf(pts)
        self.assertTrue(np.allclose(F, F[0]))


if __name__ == "__main__":
    unittest.main()
