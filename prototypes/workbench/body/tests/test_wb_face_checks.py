"""Language chunk 4: the house mibi eye as a decal at stations, and the ten face checks (checks/face.py) with their proofs.
S22 (the quadruped template) is green on all ten; seven broken copies are each red on the check that names them; an anchor's signed record turns one check amber and no other; the fixture (S20, /1) is never judged;
the decal code takes stations and a mesh and nothing else, so a sphere stands in for a body."""
import copy, json, os, sys, unittest, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import checks as CH
from checks import ctx as CX
import facedecal as FD
import quadruped as Q
from wb import facade as F, clayface as CF

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS = ["face.count", "face.front", "face.on-body", "face.flush", "face.size", "face.row", "face.lid", "face.mouth", "face.clear", "face.iris"]


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

    def rows(self, doc, stages=("file", "cage", "coat", "extremes")):
        cx = CX.Ctx(doc, self.body, dict(vertices_l1=len(self.mesh["V"])), self.mesh, doc=doc)
        out = {}
        for st in stages:
            for r in CH.run(st, cx):
                if r["id"].startswith("face."):
                    out[r["id"]] = r
        return out

    def changed(self, fn):
        d = copy.deepcopy(self.doc)
        fn(d)
        return d


class TestRegistry(unittest.TestCase):
    def test_ten_checks_with_stages_rules_and_limits(self):
        m = {x["id"]: x for x in CH.metas() if x["id"].startswith("face.")}
        self.assertEqual(sorted(m), sorted(IDS))
        self.assertEqual({i: m[i]["stage"] for i in IDS}, {"face.count": "file", "face.front": "cage", "face.on-body": "cage", "face.flush": "file", "face.size": "extremes", "face.row": "cage",
                                                           "face.lid": "file", "face.mouth": "file", "face.clear": "file", "face.iris": "coat"})
        for x in m.values():
            self.assertGreater(len(x["rule"]["words"]), 40)
            self.assertTrue(x["name"] and x["fail"] and x["limit"]["text"])


class TestGreen(Base):
    def test_s22_is_green_on_all_ten_with_a_proof_where_it_has_a_picture(self):
        rows = self.rows(self.doc)
        self.assertEqual(sorted(rows), sorted(IDS))
        for i, r in rows.items():
            self.assertEqual(r["state"], "pass", (i, r["measure"]))
        for i in IDS:
            if rows[i]["proof"]:
                ET.fromstring(PR_svg(rows[i]["proof"]["svg"]))
                self.assertIn(rows[i]["proof"]["az"], (0, 32))

    def test_the_decal_is_flush_and_the_eyes_are_a_seventh_of_the_head(self):
        rows = self.rows(self.doc)
        self.assertLess(rows["face.on-body"]["value"], 0.01)
        self.assertAlmostEqual(rows["face.size"]["value"], 0.145, places=2)
        self.assertLess(rows["face.front"]["value"], 40.0)

    def test_the_fixture_and_older_files_are_not_judged(self):
        import species_v1 as V1
        s20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
        self.assertEqual(s20["schema"], "mb-species/1")
        self.assertEqual([r["id"] for r in CH.run("file", CX.Ctx(s20)) if r["id"].startswith("face.")], [])
        self.assertEqual([r["id"] for r in CH.run("file", CX.Ctx(self.changed(lambda d: d.update(schema="mb-species/1")))) if r["id"].startswith("face.")], [])


def PR_svg(inner):
    return inner if inner.lstrip().startswith("<svg") else f'<svg xmlns="http://www.w3.org/2000/svg" width="608" height="780">{inner}</svg>'


class TestBroken(Base):
    """The seven copies of the done-picture."""

    def red(self, doc, cid, others_pass=()):
        rows = self.rows(doc)
        self.assertEqual(rows[cid]["state"], "fail", (cid, rows[cid]["measure"]))
        for o in others_pass:
            self.assertEqual(rows[o]["state"], "pass", (o, rows[o]["measure"]))
        return rows[cid]

    def test_one_eye(self):
        r = self.red(self.changed(lambda d: d["face"]["eyes"].update(count=1)), "face.count")
        self.assertIn("1 eye in the file, 2 for S22", r["measure"])

    def test_three_eyes_on_a_two_eyed_kind(self):
        r = self.red(self.changed(lambda d: d["face"]["eyes"].update(count=3)), "face.count", others_pass=("face.row",))
        self.assertIn("three eyes belong to S15 only", r["measure"])

    def test_an_eye_on_a_horn(self):
        r = self.red(self.changed(lambda d: d["face"].update(on="horn")), "face.on-body")
        self.assertIn("The eyes sit on the horn", r["measure"])

    def test_an_eye_on_the_side_of_the_head(self):
        r = self.red(self.changed(lambda d: d["face"]["eyes"].update(station=0.5, around=0.5)), "face.front")
        self.assertGreater(r["value"], 40.0)

    def test_eyes_at_a_third_of_the_head(self):
        r = self.red(self.changed(lambda d: d["face"]["eyes"].update(r=d["face"]["eyes"]["r"] * (1 / 3) / 0.145)), "face.size")
        self.assertEqual(r["extra"]["size"], "big")

    def test_blush(self):
        r = self.red(self.changed(lambda d: d["face"].update(cheeks=dict(station=0.2, around=0.4, r=0.075, alpha=0.3))), "face.clear")
        self.assertIn("face.cheeks", r["measure"])
        self.assertEqual(r["extra"]["thing"], "blush")

    def test_an_open_frog_mouth(self):
        r = self.red(self.changed(lambda d: d["face"]["mouth"].update(rest="open", width=0.5, shape="frog")), "face.mouth")
        self.assertIn("open at rest", r["measure"])
        self.assertIn("of the eye span", r["measure"])

    def test_each_broken_copy_also_leaves_the_other_checks_alone(self):
        rows = self.rows(self.changed(lambda d: d["face"]["mouth"].update(rest="open")))
        self.assertEqual({i for i, r in rows.items() if r["state"] != "pass"}, {"face.mouth"})


class TestOtherChecks(Base):
    def test_lid(self):
        r = self.rows(self.changed(lambda d: d["face"]["eyes"].update(attitude="knowing")))["face.lid"]
        self.assertEqual((r["state"], r["value"]), ("pass", 0.3))
        r = self.rows(self.changed(lambda d: d["face"]["eyes"].update(lid=dict(closes=0.5, edge="straight"))))["face.lid"]
        self.assertEqual(r["state"], "fail")
        r = self.rows(self.changed(lambda d: d["face"]["eyes"].update(frames=["open", "sleepy"])))["face.lid"]
        self.assertEqual(r["state"], "fail")
        r = self.rows(self.changed(lambda d: d["face"]["eyes"].update(lid=dict(closes=0.2, edge="curved"))))["face.lid"]
        self.assertIn("not straight", r["measure"])

    def test_flush_names_rims_and_the_house_eye_numbers(self):
        self.assertEqual(self.rows(self.changed(lambda d: d["face"]["eyes"].update(rim=0.02)))["face.flush"]["state"], "fail")
        self.assertEqual(self.rows(self.changed(lambda d: d["face"]["eyes"]["iris"].update(share=0.6)))["face.flush"]["state"], "fail")
        self.assertEqual(self.rows(self.changed(lambda d: d["face"]["eyes"]["iris"].update(pupil=0.6)))["face.flush"]["state"], "fail")
        self.assertEqual(self.rows(self.changed(lambda d: d["face"]["eyes"].update(catch=[{"at": [0, 0], "r": .2}, {"at": [1, 1], "r": .1}])))["face.flush"]["state"], "fail")

    def test_size_at_the_ends_of_the_bands(self):
        def loci(d, size, spacing=None):
            d["genome"] = dict(d.get("genome") or {}, loci=[dict(locus="form.eye-size", band=dict(form="mult", lo=size[0], hi=size[1]))]
                               + ([dict(locus="form.eye-spacing", band=dict(form="off", lo=spacing[0], hi=spacing[1]))] if spacing else []))
        ok = self.rows(self.changed(lambda d: loci(d, (0.85, 1.15), (-0.03, 0.03))))["face.size"]
        self.assertEqual(ok["state"], "pass", ok["measure"])
        big = self.rows(self.changed(lambda d: loci(d, (0.85, 1.4))))["face.size"]
        self.assertEqual((big["state"], big["extra"]["size"]), ("fail", "big"))
        wide = self.rows(self.changed(lambda d: loci(d, (1.0, 1.0), (-0.03, 0.2))))["face.size"]
        self.assertEqual(wide["state"], "fail")
        self.assertIn("type's gap", wide["measure"])

    def test_row_is_judged_on_the_decal_as_placed(self):
        cx = CX.Ctx(self.doc, self.body, {}, self.mesh, doc=self.doc)
        st = [dict(s) for s in CH.face.stations(cx)]
        eyes = [s for s in st if s["kind"] == "eye"]
        eyes[0]["point"] = eyes[0]["point"] + np.array([0.0, 0.0, 0.08])          # one eye 0.08 H high: 6% of the head's width
        cx2 = CX.Ctx(self.doc, self.body, {}, self.mesh, doc=self.doc, stations=st)
        r = [x for x in CH.run("cage", cx2) if x["id"] == "face.row"][0]
        self.assertEqual(r["state"], "fail")

    def test_iris_against_the_land_body(self):
        d = self.changed(lambda x: x.update(land="woods"))
        self.assertIn(self.rows(d)["face.iris"]["state"], ("pass", "fail"))
        for name in ("honey", "slate"):
            r = self.rows(self.changed(lambda x, n=name: (x.update(land="woods"), x["face"]["eyes"]["iris"].update(colour=n))))["face.iris"]
            self.assertIn("iris L", r["measure"])
        dark = self.rows(self.changed(lambda x: (x.update(land="woods"), x["face"]["eyes"]["iris"].update(colour="olive"))))["face.iris"]
        light = self.rows(self.changed(lambda x: (x.update(land="woods"), x["face"]["eyes"]["iris"].update(colour="honey"))))["face.iris"]
        self.assertNotEqual((dark["state"], round(dark["value"], 2)), (light["state"], round(light["value"], 2)))

    def test_a_template_with_no_land_is_not_judged_on_iris(self):
        self.assertIn("No land yet", self.rows(self.doc)["face.iris"]["measure"])


class TestExceptions(Base):
    """An anchor's record covers one check by name; every other check applies in full."""

    def test_a_signed_record_turns_that_one_check_amber(self):
        d = self.changed(lambda x: (x.update(id="S17"), x["face"]["eyes"].update(r=x["face"]["eyes"]["r"] * 1.6)))
        rows = self.rows(d)
        self.assertEqual(rows["face.size"]["state"], "warn")
        self.assertIn("Wickle's long-fur face", rows["face.size"]["measure"])
        self.assertEqual(rows["face.size"]["extra"]["waiver"]["kind"], "S17")

    def test_the_same_record_does_not_cover_another_check(self):
        d = self.changed(lambda x: (x.update(id="S17"), x["face"]["eyes"].update(count=3)))
        self.assertEqual(self.rows(d)["face.count"]["state"], "fail")
        d = self.changed(lambda x: (x.update(id="S01"), x["face"]["eyes"].update(rim=0.02, r=x["face"]["eyes"]["r"] * 1.6), x["face"]["mouth"].update(rest="open")))
        rows = self.rows(d)
        self.assertEqual((rows["face.flush"]["state"], rows["face.size"]["state"], rows["face.mouth"]["state"]), ("warn", "warn", "fail"))

    def test_a_kind_with_no_record_gets_none(self):
        d = self.changed(lambda x: (x.update(id="S02"), x["face"]["eyes"].update(r=x["face"]["eyes"]["r"] * 1.6)))
        self.assertEqual(self.rows(d)["face.size"]["state"], "fail")

    def test_the_file_may_carry_its_own_signed_waiver(self):
        d = self.changed(lambda x: (x["face"]["eyes"].update(r=x["face"]["eyes"]["r"] * 1.6), x.update(waivers=[dict(check="face.size", reason="test", by="art desk", date="2026-11-06", until="repaint")])))
        self.assertEqual(self.rows(d)["face.size"]["state"], "warn")


class TestDecalIsPlanAgnostic(unittest.TestCase):
    """The decal takes stations and a mesh. A sphere (no cage, no plan) stands in for a sculpted body."""

    @staticmethod
    def sphere(n=48, m=24, R=1.0):
        V, Fq = [], []
        for j in range(m + 1):
            th = np.pi * j / m
            for i in range(n):
                ph = 2 * np.pi * i / n
                V.append([R * np.sin(th) * np.cos(ph), R * np.sin(th) * np.sin(ph), R * np.cos(th)])
        for j in range(m):
            for i in range(n):
                a, b = j * n + i, j * n + (i + 1) % n
                Fq.append([a, b, b + n, a + n])
        return np.array(V), np.array(Fq)

    def test_eyes_and_mouth_land_flush_on_a_sphere(self):
        V, Fq = self.sphere()
        s = FD.Surface(V, Fq)
        st = []
        for k, y in enumerate((-0.35, 0.35)):
            p = np.array([np.sqrt(1 - y * y - 0.1 ** 2), y, 0.1])
            hit = FD.place(s, p, p)
            st.append(FD.station("eye", hit[0], hit[1], 0.14, f"eye.{k}"))
        hit = FD.place(s, np.array([0.9, 0.0, -0.4]), np.array([0.9, 0.0, -0.4]))
        st.append(FD.station("mouth", hit[0], hit[1], 0.3, "mouth"))
        Vd, Fd, L = FD.build(s, st, dict(lid=0.0))
        self.assertEqual(set(L.tolist()), {0, 1, 2, 3, 4})
        off = np.abs(np.linalg.norm(Vd, axis=1) - 1.0)
        self.assertLess(off.max(), 0.01 + 0.0035)                  # the sphere's facets sit a little inside it; the decal is lifted 0.003-0.005
        self.assertGreater(off.min(), -1)
        self.assertLess(FD.max_lift(s, Vd).max(), 0.01)

    def test_the_lid_cuts_a_straight_edge(self):
        V, Fq = self.sphere()
        s = FD.Surface(V, Fq)
        p = np.array([1.0, 0.0, 0.0])
        hit = FD.place(s, p, p)
        st = [FD.station("eye", hit[0], hit[1], 0.2, "eye")]
        Vd, Fd, L = FD.build(s, st, dict(lid=0.3))
        top = Vd[:, 2].max()
        self.assertAlmostEqual(top, 0.2 * (1 - 0.6), delta=0.02)

    def test_the_house_eye_proportions(self):
        self.assertGreaterEqual(FD.HOUSE["iris"], 0.70)
        self.assertTrue(0.40 <= FD.HOUSE["pupil"] <= 0.50)
        self.assertEqual(len([l for l in FD.LAYERS if l == "catch"]), 1)
        self.assertLess(FD.HOUSE["catch_at"][0], 0)                  # upper left
        self.assertGreater(FD.HOUSE["catch_at"][1], 0)
        self.assertEqual(max(FD.LIFT.values()) < 0.01, True)


if __name__ == "__main__":
    unittest.main()
