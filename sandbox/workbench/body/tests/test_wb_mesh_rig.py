"""Chunk 31: the mesh body source 2. Loika's proportion loci move the sculpt's armature and scripted keys (rig.bones[...], keys[...] in genomeapply), the feet stay round and on the floor, the checks that read the armature are green at the type and at both ends of every
proportion locus (the band's and the range's), and the trotter's four-beat walk keeps the feet under the hips and the weights keep a strong key from splaying a leg. Under the bpy venv (the checks load the sculpt and draw its silhouette)."""
import copy, json, math, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import genomeapply as GA
import meshbody as MB
import meshrig as MR
import species_v1 as V1
from wb import facade as F
from wb import variety as VY

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def s01():
    with open(os.path.join(BODY, "species_v1", "S01.json")) as fh:
        return json.load(fh)


class Rig(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = s01()
        cls.type = MB.MeshBody(cls.doc)
        cls.rig = cls.type.rig

    def test_the_file_with_its_rig_keys_and_five_loci_is_valid(self):
        self.assertEqual(V1.validate(self.doc), [])
        self.assertEqual([e["locus"] for e in self.doc["genome"]["loci"]], ["form.head", "form.torso-girth", "form.torso-length", "form.leg-length", "form.leg-girth"])

    def test_the_type_is_the_sculpt_with_its_feet_on_the_floor(self):
        self.assertLess(float(np.abs(self.type.Vw - self.rig.V).max()), 1e-9)
        self.assertAlmostEqual(float(self.type.Vw[:, 2].min()), 0.0, places=6)

    def test_a_glob_move_reaches_the_leg_bones_and_only_them(self):
        d, vals = F.mesh_individual(self.doc, "value:form.leg-length=1.15")
        ln = {b["id"]: b["len"] for b in d["rig"]["bones"]}
        self.assertTrue(all(abs(ln[k] - 1.15) < 1e-9 for k in ln if ".upper." in k or ".lower." in k))
        self.assertTrue(all(ln[k] == 1.0 for k in ln if ".paw." in k or k in ("rear", "front", "head")))

    def test_each_locus_moves_the_body_and_the_feet_stay_round_and_on_the_floor(self):
        t = self.type.Vw
        for locus, hi in (("form.head", 1.15), ("form.torso-length", 1.15), ("form.torso-girth", 1.15), ("form.leg-length", 1.15), ("form.leg-girth", 1.15)):
            d, _ = F.mesh_individual(self.doc, f"value:{locus}={hi}")
            b = MB.MeshBody(d)
            self.assertGreater(float(np.abs(b.Vw - t).max()), 0.01, locus)                      # it moved
            self.assertAlmostEqual(float(b.Vw[:, 2].min()), 0.0, places=6)                        # the feet are on the floor
            for kind in ("hind.L", "fore.R"):                                                     # a sole is rigid: its size is the sculpt's
                s = self.rig.W[:, self.rig.idx(f"{kind.split('.')[0]}.paw.{kind.split('.')[1]}")] > 0.99
                self.assertAlmostEqual(float(np.ptp(b.Vw[s][:, 0])), float(np.ptp(t[s][:, 0])), places=6, msg=locus)

    def test_the_head_carries_the_eyes_and_the_crest(self):
        d, _ = F.mesh_individual(self.doc, "value:form.head=1.15")
        b = MB.MeshBody(d)
        e0 = self.type.carry([1.31431, 0.42086, 1.65492])[0]
        e1 = b.carry([1.31431, 0.42086, 1.65492])[0]
        self.assertGreater(float(np.linalg.norm(e1 - e0)), 0.02)
        top0 = max(p["V"][:, 2].max() for p in self.type.placed)
        self.assertGreater(max(p["V"][:, 2].max() for p in b.placed), top0 - 0.05)               # the crest rides the head (its size is the signature's)

    def test_seeds_draw_inside_the_bands_and_the_same_each_time(self):
        a, b = VY.mesh_draw(self.doc, 3, 2026), VY.mesh_draw(self.doc, 3, 2026)
        self.assertEqual(a, b)
        for e in self.doc["genome"]["loci"]:
            self.assertGreaterEqual(a[e["locus"]], e["band"]["lo"] - 1e-9)
            self.assertLessEqual(a[e["locus"]], e["band"]["hi"] + 1e-9)
        self.assertNotEqual(VY.mesh_draw(self.doc, 4, 2026), a)
        F.build(self.doc, "seed:3")

    def test_a_locus_the_file_does_not_have_is_refused_naming_the_loci(self):
        with self.assertRaises(F.BuildError):
            F.build(self.doc, "high:form.tail-length")


class Weights(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = MB.MeshBody(s01())
        cls.rig = cls.body.rig

    def test_a_leg_follows_only_its_own_leg_and_its_girdle(self):
        R = self.rig
        for kind, side in MR.FEET:
            own = {R.idx(f"{kind}.{b}.{side}") for b in ("upper", "lower", "paw")} | {R.idx("rear" if kind == "hind" else "front")}
            sel = R.V[:, 0] * (1 if kind == "fore" else -1) > 0.2
            for b in range(len(R.names)):
                if R.names[b].split(".")[0] in ("fore", "hind") and b not in own:
                    self.assertLess(float(R.W[(R.V[:, 1] * (1 if side == "L" else -1) > 0.4) & sel][:, b].max(initial=0.0)), 0.5, (kind, side, R.names[b]))

    def test_a_strong_key_on_one_leg_moves_no_other_foot(self):
        R = self.rig
        mats = R.matrices(None, {"hind.upper.L": (0.0, math.radians(60), 0.0)})
        V = R.skin(mats)
        f0, f1 = R.feet(R.skin(R.matrices())), R.feet(V)
        for k in ("hind.R", "fore.L", "fore.R"):
            self.assertLess(float(np.linalg.norm(f1[k] - f0[k])), 1e-6, k)
        self.assertLess(R.splay(V, mats), 0.03)


class Walk(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = MB.MeshBody(s01())
        cls.rig = cls.body.rig

    def test_four_beats_a_quarter_apart_three_feet_down(self):
        import meshrig
        down = []
        for i in range(meshrig.FRAMES):
            V, mats, _ = self.rig.walk(i)
            b = self.rig.balance(V)
            down.append(b["down"])
            self.assertTrue(b["inside"], i)
        self.assertGreaterEqual(min(down), 3)

    def test_the_feet_stay_under_the_hips_and_the_blocks_do_not_twist(self):
        for i in range(MR.FRAMES):
            V, mats, _ = self.rig.walk(i)
            self.assertLess(self.rig.splay(V, mats), 0.03, i)
            self.assertLess(self.rig.twist_deg(mats), 3.0, i)

    def test_the_posed_proxy_carries_the_crest(self):
        M, mats, dz = self.body.posed("walk", 4)
        self.assertEqual(len(M["V"]), len(self.body.proxy(with_parts=True)["V"]))
        self.assertGreater(float(np.abs(M["V"] - self.body.proxy(with_parts=True)["V"]).max()), 0.01)


class Checks(unittest.TestCase):
    def test_every_check_is_green_at_the_type_and_at_both_ends_of_every_locus(self):
        doc = s01()
        rows = F.check_rows(doc)
        self.assertIn("rig.splay", {r["id"] for r in rows})
        self.assertEqual([r["id"] for r in rows if r["state"] != "pass"], [])
        for e in doc["genome"]["loci"]:
            for v in (e["band"]["lo"], e["band"]["hi"], e["range"][0], e["range"][1]):
                d, _ = F.mesh_individual(doc, f"value:{e['locus']}={v}")
                bad = [(r["id"], r["measure"]) for r in F.check_rows(d) if r["state"] != "pass"]
                self.assertEqual(bad, [], (e["locus"], v))

    def test_the_splay_row_carries_every_key_of_the_walk(self):
        r = {x["id"]: x for x in F.check_rows(s01())}["rig.splay"]
        self.assertEqual(len(r["extra"]["keys"]), MR.FRAMES)

    def test_the_cage_plans_are_not_asked_the_new_check(self):
        import checks as CH
        from checks import ctx as CX
        for sid in ("S22",):
            with open(os.path.join(BODY, "species_v1", sid + ".json")) as fh:
                d = json.load(fh)
            self.assertNotIn("rig.splay", {r["id"] for r in CH.run("rig", CX.Ctx(d, doc=d))})


if __name__ == "__main__":
    unittest.main()
