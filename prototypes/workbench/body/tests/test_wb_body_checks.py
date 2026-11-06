"""Language chunk 6: the plan plug-ins, the family registry, the trotter template and the body checks (checks/body.py).
S22 and the trotter template are green on all six body checks; a lanky copy is red on body.mass, a copy with a 17% band is red on body.band15, a hoof on body.feet, unequal pairs on body.pairs, a rolled block on the twist checks;
a signed record turns one check amber; the fixture (S20, /1) is never judged."""
import copy, json, os, sys, unittest, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import checks as CH
from checks import ctx as CX
import plans
import quadruped as Q
import species_v1 as V1
from families import registry as FR
from wb import facade as F

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS = ["body.mass", "body.band15", "body.feet", "body.pairs", "body.twist", "body.twist.clip"]


def s22():
    return json.load(open(os.path.join(BODY, "species_v1", "S22.json")))


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = s22()
        r = F.build(cls.doc, "type", "base")
        cls.body = r.body
        cls.mesh = F.proxy_mesh(r.body, 1)
        cls.mesh["frame"] = Q.frame(cls.doc)

    def rows(self, doc, stages=("file", "cage", "rig"), body=None, mesh=None):
        cx = CX.Ctx(doc, body or self.body, dict(vertices_l1=len(self.mesh["V"])), mesh or self.mesh, doc=doc)
        out = {}
        for st in stages:
            for r in CH.run(st, cx):
                if r["id"].startswith("body."):
                    out[r["id"]] = r
        return out

    def changed(self, fn):
        d = copy.deepcopy(self.doc)
        fn(d)
        return d


class TestPlans(unittest.TestCase):
    def test_two_plan_modules_own_the_bands_and_the_neck_is_zero_to_a_fifth(self):
        self.assertEqual(sorted(plans.MODULES), ["biped", "quadruped"])
        for name, m in plans.MODULES.items():
            self.assertIs(V1.PLANS[name], m.BANDS)
            self.assertEqual(m.BANDS["range_len"]["neck"], (0.0, 0.2))
            self.assertTrue(callable(m.spine))
        self.assertEqual(plans.families_of("quadruped"), ["trotter", "shoulder-heavy", "hopper", "digger", "loaf", "bridge", "four-wing", "glider", "shell-carrier"])
        self.assertEqual(plans.families_of("biped"), ["sitter", "waddler", "climber", "flutterer"])

    def test_a_v1_file_keeps_the_older_neck_band_and_a_v2_file_gets_the_new_one(self):
        s20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
        self.assertEqual(V1.plan_for(s20)["range_len"]["neck"], (0.15, 0.4))
        self.assertEqual(V1.plan_for(s22())["range_len"]["neck"], (0.0, 0.2))
        self.assertEqual(V1.validate(s20), [])
        d = s22()
        for r in d["spine"]["ranges"]:
            if r["name"] == "neck":
                r["length"] = 0.0
        self.assertEqual(V1.validate(d), [])                             # a neck of 0 is allowed: the head may merge into the body
        for r in d["spine"]["ranges"]:
            if r["name"] == "neck":
                r["length"] = 0.25
        self.assertTrue(any("neck" in e[0] for e in V1.validate(d)))      # today's 0.25 goes


class TestFamilies(unittest.TestCase):
    def test_the_registry_has_twenty_families_each_with_a_path_an_armature_and_bands(self):
        fs = FR.families()
        self.assertEqual(len(fs), 20)
        for f in fs:
            self.assertIn(f["path"], ("mesh", "hybrid", "cage"))
            self.assertTrue(f["armature"]["layout"] and isinstance(f["armature"]["sockets"], list))
            self.assertEqual(f["bands"]["neck"], [0, 0.2])
            self.assertIn(f["plan"], ("quadruped", "biped", "mass", "legless", "hexapod", "radial"))
        paths = [f["path"] for f in fs]
        self.assertEqual((paths.count("mesh"), paths.count("hybrid"), paths.count("cage")), (12, 6, 2))

    def test_only_the_trotter_has_a_template_and_new_offers_cards_with_not_yet(self):
        self.assertEqual([f["id"] for f in FR.with_template()], ["trotter"])
        cards = FR.cards()
        self.assertEqual(len(cards), 21)
        self.assertEqual([c["state"] for c in cards].count("ready"), 1)
        self.assertEqual(cards[-1]["id"], "sculpt")
        self.assertEqual(cards[-1]["state"], "not yet")
        self.assertEqual(next(c for c in cards if c["id"] == "trotter")["template_path"], "cage")

    def test_new_species_from_the_trotter_is_green_and_other_families_are_refused(self):
        d = FR.new_species("S23", "trotter")
        self.assertEqual((d["id"], d["name"], d["family"]), ("S23", "", "trotter"))
        self.assertEqual(V1.validate(d), [])
        with self.assertRaises(ValueError) as e:
            FR.new_species("S23", "hopper")
        self.assertIn("no template yet", str(e.exception))
        with self.assertRaises(ValueError):
            FR.new_species("23", "trotter")
        self.assertEqual(json.load(open(os.path.join(BODY, "species_v1", "templates", "trotter.json")))["face"], s22()["face"])

    def test_the_template_is_s22_but_for_its_name(self):
        t, s = FR.template_doc("trotter"), s22()
        for k in ("id", "name"):
            t.pop(k, None)
            s.pop(k, None)
        self.assertEqual(t, s)


class TestRegistryOfChecks(unittest.TestCase):
    def test_six_checks_with_stages_rules_and_limits(self):
        m = {x["id"]: x for x in CH.metas() if x["id"].startswith("body.")}
        self.assertEqual(sorted(m), sorted(IDS))
        self.assertEqual({i: m[i]["stage"] for i in IDS}, {"body.mass": "cage", "body.band15": "file", "body.feet": "file", "body.pairs": "file", "body.twist": "cage", "body.twist.clip": "rig"})
        for x in m.values():
            self.assertGreater(len(x["rule"]["words"]), 40)
            self.assertTrue(x["name"] and x["fail"] and x["limit"]["text"])


class TestGreen(Base):
    def test_s22_is_green_on_all_six(self):
        rows = self.rows(self.doc)
        self.assertEqual(sorted(rows), sorted(IDS))
        for i, r in rows.items():
            self.assertEqual(r["state"], "pass", (i, r["measure"]))
            if r["proof"]:
                ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">' + r["proof"]["svg"] + "</svg>")


class TestRed(Base):
    def test_a_lanky_copy_is_red_on_mass(self):
        def lanky(d):
            for r in d["spine"]["ranges"]:
                if r["name"] == "neck":
                    r["length"] = 0.4
        d = self.changed(lanky)
        r = self.rows(d, ("cage",))["body.mass"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("neck 0.40", r["measure"])

    def test_long_legs_are_red_on_mass(self):
        m = dict(self.mesh)
        V = np.array(self.mesh["V"], float)
        tor = np.isin(np.asarray(self.mesh["part"]), [k for k, v in self.mesh["names"].items() if v == "torso"])
        V[tor, 2] += 0.6                                                  # the body lifted off the floor on longer legs
        m["V"] = V
        r = self.rows(self.doc, ("cage",), None, m)["body.mass"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("legs", r["measure"])

    def test_a_wide_band_a_hoof_unequal_pairs(self):
        d = self.changed(lambda x: x.update(genome=dict(x["genome"], loci=[dict(locus="form.leg-length", op="blend", type=1.0, band=dict(form="mult", lo=0.8, hi=1.2))])))
        r = self.rows(d, ("file",))["body.band15"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("form.leg-length", r["measure"])
        d = self.changed(lambda x: x["parts"][0]["end"].update(kind="hoof"))
        r = self.rows(d, ("file",))["body.feet"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("hoof", r["measure"])

        def pair(x):
            q = copy.deepcopy(x["parts"][0])
            q["id"] = "fore.R"
            q["chain"][0]["len"] += 0.1
            x["parts"].append(q)
        r = self.rows(self.changed(pair), ("file",))["body.pairs"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("fore", r["measure"])

    def test_a_signed_record_turns_one_check_amber(self):
        d = self.changed(lambda x: x["parts"][0]["end"].update(kind="hoof"))
        d["waivers"] = [dict(check="body.feet", reason="test", by="art desk", date="2026-11-06", until="repaint")]
        rows = self.rows(d, ("file",))
        self.assertEqual(rows["body.feet"]["state"], "warn")
        self.assertEqual(rows["body.band15"]["state"], "pass")

    def test_a_rolled_block_reads_as_twist_and_a_pitched_one_does_not(self):
        from checks import body as BO
        t = np.radians(5.0)
        rolled = np.array([[1, 0, 0], [0, np.cos(t), -np.sin(t)], [0, np.sin(t), np.cos(t)]])      # 5 degrees about the spine axis
        pitched = np.array([[np.cos(t * 30), 0, np.sin(t * 30)], [0, 1, 0], [-np.sin(t * 30), 0, np.cos(t * 30)]])
        self.assertAlmostEqual(BO._roll_deg(rolled), 5.0, places=3)
        self.assertAlmostEqual(BO._roll_deg(pitched), 0.0, places=6)

    def test_the_fixture_is_not_judged(self):
        s20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
        cx = CX.Ctx(s20, None, None, None, doc=s20)
        self.assertEqual([r["id"] for r in CH.run("file", cx) if r["id"].startswith("body.")], [])


if __name__ == "__main__":
    unittest.main()
