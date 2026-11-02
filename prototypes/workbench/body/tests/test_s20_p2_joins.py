"""Framework rule (owner, 2 Nov): every socket declares its join, 'soft' or 'hard', and nothing in between. SOFT: the appendage grows out of the parent's skin: footprint on the parent 1.5-1.8 x its width, a concave fillet over at least 3 loops, the radius never pinches below the mid width near the root,
no ridge, lip or notch (the normal test passes at the root). HARD: a separate closed shell sunk at least 0.03 H into the parent, no blending, tagged as a crease. Tested on one prick ear and one lop ear; the arms are re-checked against the soft rule."""
import os, sys, json, copy, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import schema as SC, s20build, s20p2 as P2, s20normals as NM, s20indiv as IN

RAW = IN.RAW


def build(fam, join):
    d = copy.deepcopy(RAW)
    d["parts"]["ear.L"]["socket"].update(join=join, bury=0.04)
    spec, _ = SC.load(raw=d)
    return s20build.make_s20(spec, upto="base", ear=fam)


class T(unittest.TestCase):
    def test_every_socket_declares_a_join(self):
        for k in ("leg.L", "ear.L", "arm.L"):
            self.assertIn(RAW["parts"][k]["socket"]["join"], ("soft", "hard"), k)
        d = copy.deepcopy(RAW); d["parts"]["ear.L"]["socket"]["join"] = "half"
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=d)
        d = copy.deepcopy(RAW); del d["parts"]["arm.L"]["socket"]["join"]
        with self.assertRaises(SC.SchemaError):
            SC.load(raw=d)
        self.assertEqual(RAW["parts"]["ear.L"]["socket"]["join"], "soft")           # Tuliko's ears are soft, like the legs and the tail

    def test_hard_join_is_a_buried_tagged_shell_for_both_ear_families(self):
        for fam in ("prick", "lop"):
            b = build(fam, "hard")
            r = P2.ear_join_report(b)
            print(fam, "hard", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()})
            self.assertEqual(r["join"], "hard")
            self.assertGreaterEqual(r["buried"], 0.03)
            self.assertTrue(r["tagged"])
            self.assertEqual(b.ctx["info"]["tubes"]["ear.L"]["loop"], [])             # nothing bridged, nothing blended
            self.assertEqual(b.ctx["log"]["limit"]["max_err"] <= 0.004, True)

    def test_soft_join_rule_footprint_pinch_and_normals(self):
        for fam in ("prick", "lop"):
            b = build(fam, "soft")
            r = P2.ear_join_report(b)
            print(fam, "soft", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()})
            self.assertGreaterEqual(r["loops"], 3)
            self.assertTrue(1.5 <= r["ratio"] <= 1.8, (fam, "footprint / mid width", r["ratio"]))
            self.assertGreaterEqual(r["narrowest_over_mid"], 0.97, (fam, "pinch"))

    def test_soft_ear_root_passes_the_normal_test(self):
        for fam in ("prick", "lop"):
            b = build(fam, "soft")
            V, F, at, fp2 = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp2, len(V))
            m = NM.measure(V, F, tag=at[:, 3], s=at[:, 1])
            ear = (part[m["E"][:, 0]] == b.parts["ear.L"]) & ~m["crease"]
            worst = float(m["ang"][ear].max()) if ear.any() else 0.0
            print(fam, "ear face angle max", round(worst, 1))
            self.assertLessEqual(worst, 20.0, fam)

    def test_arm_socket_against_the_soft_rule(self):
        c, b, R = IN.make(1)
        r = P2.ear_join_report(b, "arm.L")
        print("arm soft", {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()})
        self.assertGreaterEqual(r["loops"], 3)
        self.assertTrue(1.5 <= r["ratio"] <= 1.8, ("arm footprint / mid width", r["ratio"]))


if __name__ == "__main__":
    unittest.main()
