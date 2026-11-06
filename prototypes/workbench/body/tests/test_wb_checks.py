"""Workbench chunk 5: the check registry (the 12 checks of the file and cage stages with the copywriter's word list's names and fail lines and the owner's words), their measures on S20 and on a copy with a tail 1.6 times as long,
the proof pictures as SVG (well formed, every label 15 px or more), and a real job through the server: rows, the cache, the proof PNGs, the same counts for the pill and the drawer."""
import copy, json, os, sys, shutil, unittest, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import checks as CH
from checks import ctx as CX
from wb import facade as F, server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = json.load(open(os.path.join(BODY, "tests", "fixtures", "wb_s20_baseline.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_checks")
# the copywriter's word list 5.12: id -> (name, fail line)
WORDS = {"ranges": ("Spine ranges", "Spine ranges don't match the plan"), "joins": ("Joins", "{part} join is half-blended"), "head.attach": ("Head on the spine", "Head sits off the end of the spine"),
         "head.neck": ("Head, neck and chest", "Neck band too wide"), "tail.taper": ("Tail taper", "Tail bulges on the way down"), "tail.size": ("Tail size", "Tail too big for the body"), "balance": ("Balance", "Tips over at {end}"),
         "limbs": ("Shoulders and hips", "{limb} floats off its girdle"), "verts": ("Vertex budget", "{n} vertices, over 3,500"), "normals": ("Smooth normals", "Sharp crease in {part}"), "mesh": ("Mesh quality", "Thin or bent faces in the {range}"),
         "midline": ("Tail on the midline", "Tail swings to one side in {clip}"), "breath": ("Breathing", "Breathing moves the {part}"), "waddle": ("Waddle", "Feet lift in the waddle"), "coat": ("Coat", "Coat stretches on {part}")}


def s20():
    return S.read_spec(os.path.join(BODY, "species", "S20.json"))


def long_tail(k=1.6):
    d = s20()
    for j in d["parts"]["tail"]["joints"][1:]:
        j["len"] = round(j["len"] * k, 4)
    return d


def run_cage(spec):
    r = F.build(spec, "type", "base")
    m = F.proxy_mesh(r.body, 1)
    ctx = CX.Ctx(spec, r.body, dict(r.summary(), vertices_l1=len(m["V"])), m)
    return r, {x["id"]: x for x in CH.run("file", CX.Ctx(spec)) + CH.run("cage", ctx)}


class TestRegistry(unittest.TestCase):
    def test_twelve_checks_with_the_owners_words(self):
        metas = {m["id"]: m for m in CH.metas()}
        self.assertEqual(len(metas), 43)                              # (chunk 4 adds the ten face checks of the language, chunk 6 the six body checks, chunk 30 the eight mesh checks) thirteen of the file and cage stages (chunk 9 adds the expressions check), the extremes stage's limits (chunk 8), and the rig and coat checks (chunk 23)
        self.assertEqual([m for m in metas if metas[m]["stage"] == "extremes"], ["limits", "face.size"])
        for i, (name, fail) in WORDS.items():
            self.assertEqual((metas[i]["name"], metas[i]["fail"]), (name, fail), i)
        for m in metas.values():
            self.assertRegex(m["rule"]["date"], r"^2026-11-0[12456]( \d\d:\d\d)?$")
            self.assertGreater(len(m["rule"]["words"]), 40, m["id"])
            self.assertIn(m["stage"], ("file", "cage", "rig", "coat", "extremes"))
        self.assertEqual({m["id"] for m in metas.values() if m["play"]}, {"head.neck", "tail.taper", "tail.size", "balance"})        # the copywriter's word list 5.2: the limit sentences

    def test_file_stage_on_s20(self):
        rows = CH.run("file", CX.Ctx(s20()))
        self.assertEqual([(r["id"], r["state"]) for r in rows], [("schema", "pass"), ("express", "pass"), ("ranges", "pass")])

    def test_a_check_that_raises_is_a_failing_row_not_a_crash(self):
        rows = CH.run("cage", CX.Ctx(s20()))                # no body: every cage check raises
        self.assertTrue(rows and all(r["state"] == "fail" for r in rows))

    def test_a_broken_range_names_the_ranges(self):
        d = s20()
        d["parts"]["torso"]["spine"]["ranges"]["neck"] = [0.93, 1.9]
        r = CH.run("file", CX.Ctx(d), only=["ranges"])[0]
        self.assertEqual(r["state"], "fail")
        self.assertIn("neck 0.97 H (band 0.15-0.4)", r["measure"])


class TestMeasures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ok_r, cls.ok = run_cage(s20())
        cls.bad_r, cls.bad = run_cage(long_tail())

    def test_s20_type_passes_every_check_and_the_vertex_budget_has_room(self):
        self.assertEqual(self.ok_r.cage_hash, BASE["type_cage_hash"])
        st = {i: r["state"] for i, r in self.ok.items()}
        self.assertEqual({i for i, s in st.items() if s != "pass"}, set())
        self.assertEqual(self.ok["verts"]["value"], 3382)             # 3,446 until the cat ear of 3 Nov 2026 (the ear tube is slimmer); spec 9: Tuliko was 3,606 and amber; the stalk on 8 columns (V5) and the shells at cage level (V2) bring it under 3,500
        self.assertEqual(self.ok["balance"]["value"], round(self.ok_r.balance["margin"], 4))

    def test_head_to_height_is_judged_per_plan_with_a_proof(self):
        r = self.ok["head.size"]
        self.assertEqual((r["state"], r["extra"]["band"], r["extra"]["plan"]), ("pass", [0.35, 0.5], "biped"))
        self.assertTrue(0.40 < r["value"] < 0.48 and r["proof"]["svg"])
        m = F.proxy_mesh(self.ok_r.body, 1)
        quad = CH.run("cage", CX.Ctx(s20(), self.ok_r.body, dict(self.ok_r.summary(), vertices_l1=len(m["V"])), m, doc=dict(plan="quadruped")), only=["head.size"])[0]
        self.assertEqual((quad["state"], quad["extra"]["band"], quad["extra"]["fail"]), ("fail", [0.45, 0.6], "Head too small for the body"))

    def test_the_long_tail_fails_tail_size_with_its_numbers(self):
        r = self.bad["tail.size"]
        self.assertEqual(r["state"], "fail")
        self.assertGreater(r["value"], 0.25)
        self.assertAlmostEqual(r["value"], 0.2874, delta=0.003)
        self.assertEqual(r["measure"], f"Side area {r['extra']['share']:.3f} of the trunk, limit 0.25")
        self.assertEqual(self.bad["verts"]["state"], "pass")          # amber since V2 and V5 (it was over 3,850); under the 3,500 budget with the cat ear of 3 Nov 2026
        self.assertEqual(self.bad["balance"]["state"], "pass")
        self.assertEqual(self.ok["tail.size"]["state"], "pass")

    def test_a_file_may_tighten_a_limit_never_loosen_it(self):
        d = s20()
        d["limits"] = dict(tail_side_area=0.15, vertices=9999)
        r, rows = run_cage(d)
        self.assertEqual(rows["tail.size"]["state"], "fail")           # 0.15 is tighter than the plan's 0.25
        self.assertEqual(rows["verts"]["limit"], 3500)                 # 9999 would loosen: ignored

    def test_proofs_are_well_formed_and_labelled(self):
        for rows in (self.ok, self.bad):
            for r in rows.values():
                p = r["proof"]
                if r["id"] in ("schema", "express"):                       # file checks with no picture: the field is named instead
                    self.assertIsNone(p)
                    continue
                self.assertIn(p["mode"], ("clay", "wire", "normal"), r["id"])
                root = ET.fromstring(f'<svg xmlns="http://www.w3.org/2000/svg">{p["svg"]}</svg>')
                texts = [t for t in root.iter("{http://www.w3.org/2000/svg}text")]
                self.assertGreater(len(texts), 0, r["id"])
                for t in texts:
                    self.assertGreaterEqual(float(t.get("font-size")), 15, (r["id"], t.text))        # every number carries a label, on the 608 frame (about 12 px at 1x on a hero scaled to 480; the design's 14 px on screens is for the page)
        txt = " ".join(t.text for t in ET.fromstring(f'<svg xmlns="http://www.w3.org/2000/svg">{self.bad["tail.size"]["proof"]["svg"]}</svg>').iter("{http://www.w3.org/2000/svg}text"))
        for word in ("trunk", "tail", "limit"):
            self.assertIn(word, txt)                                                    # the bars say what they are


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        d = long_tail()
        d["species"] = "S20x"
        S.write_spec(os.path.join(sp, "S20x.json"), d)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=1)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_check_job_rows_cache_proofs_and_one_count(self):
        j = self.srv.submit("S20x", "check", dict(stage="all"), None)
        self.srv.wait(j, 180)
        self.assertEqual(j.state, "done", j.error)
        rows = j.result["rows"]
        self.assertEqual(len(rows), 18)
        self.assertEqual(j.result["counts"], dict(total=18, fail=2, warn=0, need=2, passed=16))          # the long tail is too big for the trunk (tail size), and its UV island runs over another in the atlas (coat); the rig checks pass
        j2 = self.srv.submit("S20x", "check", dict(stage="all"), None)
        self.assertEqual((j2.state, j2.cached), ("done", True))
        import time
        end = time.time() + 90
        sp = self.srv.species["S20x"]
        while time.time() < end:
            cur = self.srv.current_checks(sp)
            if cur and all(r["proof"]["ready"] for r in cur["rows"] if r.get("proof")):
                break
            time.sleep(0.5)
        self.assertTrue(cur["fresh"])
        self.assertEqual(cur["counts"]["need"], sum(1 for r in cur["rows"] if r["state"] in ("fail", "warn")))        # the pill and the drawer read this one number
        for r in cur["rows"]:
            if r.get("proof"):
                self.assertTrue(r["proof"]["ready"], r["id"])
                self.assertEqual(open(r["proof"]["path"], "rb").read(8), b"\x89PNG\r\n\x1a\n")
        self.assertEqual(len(self.srv.current_checks(sp)["rows"]), 18)                  # the file and cage checks, then the rig and coat checks of the background tier

    def test_the_rig_and_coat_stages_exist_and_an_unknown_one_is_refused(self):
        from wb import server as SV
        self.assertEqual(self.srv.norm_args("check", dict(stage="rig"), None)["stage"], "rig")
        self.assertEqual(self.srv.norm_args("check", dict(stage="coat"), None)["stage"], "coat")
        with self.assertRaises(SV.ApiError):
            self.srv.norm_args("check", dict(stage="later"), None)


if __name__ == "__main__":
    unittest.main()
