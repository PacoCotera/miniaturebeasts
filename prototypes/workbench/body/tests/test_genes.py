"""Chunk 7: genes. t = 0.5 is the type specimen bit for bit; canonical creature.json; two builds identical; the anchors (coat, crown) have wider bands than body and face; every one of the 12 passes the build checks (the folds check is the known failure)."""
import os, sys, json, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import genes, individuals, build, mquality as Q


class T(unittest.TestCase):
    def test_specimen_is_default_build_bit_for_bit(self):
        c = genes.creature(genes.specimen())
        b1, R, _ = individuals.build_creature(c)
        b2 = build.make_body(upto="base", crown=dict(family="fan", count=3, length=1.1, width=1.1, spread=0.0, curl=0.2, seed=41713, lean=0.0))
        self.assertTrue(np.array_equal(b1.cage.arr(), b2.cage.arr()))
        self.assertTrue(all(abs(v - 1.0) < 1e-12 for v in c["body"].values()))

    def test_canonical_json_and_determinism(self):
        for i in (1, 2, 7):
            c1 = genes.creature(genes.draw(i)); c2 = genes.creature(genes.draw(i))
            self.assertEqual(genes.dumps(c1), genes.dumps(c2))
            s = genes.dumps(c1)
            self.assertEqual(s, json.dumps(json.loads(s), sort_keys=True, separators=(",", ":")))
            self.assertEqual(genes.digest(c1), genes.digest(c2))
        self.assertNotEqual(genes.digest(genes.creature(genes.draw(2))), genes.digest(genes.creature(genes.draw(3))))

    def test_anchors_wide_body_face_tight(self):
        def width(k):
            kind, lo, hi, _ = genes.GENES[k]
            return abs(hi / lo - 1) if kind == "mult" else None
        wide = [width(k) for k, v in genes.GENES.items() if v[3] in ("crown", "coat") and v[0] == "mult"]
        tight = [width(k) for k, v in genes.GENES.items() if v[3] == "body" and v[0] == "mult"]
        self.assertGreater(min(wide), max(tight))

    def test_twelve_build_checks(self):
        from tests.test_base import pole_kinds
        fails = []
        for i in range(1, 13):
            c = genes.creature(genes.draw(i))
            b, R, _ = individuals.build_creature(c)
            V, F, _, _ = Q.full_topology(b)
            m = Q.manifold(V, F)
            if m["non_manifold_edges"] or m["inconsistent_winding"]:
                fails.append((i, "manifold"))
            if pole_kinds(b, V, F)[0]:
                fails.append((i, "poles"))
            if b.ctx["log"]["limit"]["max_err"] > 0.004:
                fails.append((i, "limit %.4f" % b.ctx["log"]["limit"]["max_err"]))
        self.assertEqual(fails, [], fails)


if __name__ == "__main__":
    unittest.main()
