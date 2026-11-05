"""Chunk 24: the export. The release refusal and its reasons, the viewer page, the review export of S20 (glb with parts, clips and the build stamp in asset.extras; viewer, creature.json, the game frame, the manifest of hashes),
the byte-determinism of the glb, a plan with no model export, and the Export job on a server (a release is refused before anything is queued; a review runs, and the second ask is the cache). Under the bpy venv."""
import copy
import hashlib
import json
import os
import shutil
import struct
import subprocess
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

from wb import export as EX, facade as F, server as SV, store as S, jobs as J

S20 = os.path.join(BODY, "species_v1", "S20.json")
QUAD = os.path.join(BODY, "species_v1", "templates", "quadruped.json")
SCRATCH = os.path.join(BODY, "scratch", "t_export")


def glb_json(path):
    with open(path, "rb") as fh:
        b = fh.read()
    n = struct.unpack("<I", b[12:16])[0]
    return json.loads(b[20:20 + n])


class TestRefusal(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = S.read_spec(S20)
        cls.rows = F.check_rows(cls.spec)

    def test_the_gate_is_the_reason_while_nothing_can_be_signed(self):
        why = EX.release_blockers(self.spec, self.rows)
        self.assertEqual(why[-1], "gate not signed")

    def test_a_failing_check_is_a_reason_and_a_waiver_takes_it_away(self):
        rows = copy.deepcopy(self.rows)
        rows[0].update(state="fail", measure="Tail too big for the body", value=0.29, limit=0.25)
        spec = copy.deepcopy(self.spec)
        self.assertIn("Tail too big for the body (0.29, limit 0.25)", EX.release_blockers(spec, rows))
        spec["waivers"] = [dict(check=rows[0]["id"], reason="r", by="lead", date="2026-11-05")]
        self.assertFalse([w for w in EX.release_blockers(spec, rows) if w.startswith("Tail too big")])
        self.assertEqual(EX.failing(spec, rows), [])

    def test_a_release_writes_nothing_when_refused(self):
        out = os.path.join(SCRATCH, "refused")
        shutil.rmtree(SCRATCH, ignore_errors=True)
        with self.assertRaises(EX.ExportRefused) as c:
            EX.make(S20, out, release=True, stands=False, log=lambda m: None)
        self.assertIn("gate not signed", c.exception.reasons)
        self.assertFalse(os.path.exists(out))
        shutil.rmtree(SCRATCH, ignore_errors=True)


class TestViewer(unittest.TestCase):
    def test_the_page_names_no_species_and_holds_the_glb(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        glb = os.path.join(BODY, "loika.glb")
        out = os.path.join(SCRATCH, "v.html")
        subprocess.run([sys.executable, os.path.join(BODY, "viewer.py"), glb, out], check=True)
        h = open(out).read()
        self.assertNotIn("Tuliko", h)
        for m in ("coat", "normal", "parts", "wire", "cage"):
            self.assertIn(f'data-m="{m}"', h)
        self.assertIn("bonesbtn", h)
        self.assertIn("window.__seek", h)
        shutil.rmtree(SCRATCH, ignore_errors=True)


class TestPipe(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.out = os.path.join(SCRATCH, "review")
        cls.man = EX.make(S20, cls.out, stands=False, log=lambda m: None)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_the_files_and_their_hashes(self):
        names = [f["name"] for f in self.man["files"]]
        self.assertEqual(names, ["S20.glb", "viewer.html", "creature.json", os.path.join("frame", "species-S20.json")])
        for f in self.man["files"]:
            p = os.path.join(self.out, f["name"])
            self.assertEqual(f["bytes"], os.path.getsize(p))
            self.assertEqual(f["sha256"], hashlib.sha256(open(p, "rb").read()).hexdigest())
        self.assertEqual(self.man["mode"], "review")

    def test_the_glb_carries_parts_clips_and_the_stamp(self):
        ex = glb_json(os.path.join(self.out, "S20.glb"))["asset"]["extras"]
        self.assertEqual(ex["species"], dict(id="S20", name="Tuliko"))
        self.assertTrue(ex["build"].startswith("built ") and "file " + self.man["file_hash"][:8] in ex["build"])
        self.assertEqual(ex["build"], self.man["build"])
        self.assertIn("lantern", ex["parts"])
        self.assertEqual(ex["clips"][:4], ["stand", "waddle", "breathe", "idle"])
        self.assertEqual(ex["review"]["failing"], [])
        self.assertEqual(ex["counts"]["level"], 1)

    def test_the_viewer_opens_that_glb(self):
        h = open(os.path.join(self.out, "viewer.html")).read()
        self.assertIn("Z2xURg", h)                                        # "glTF" in base64: the glb is inside the page
        self.assertNotIn("Tuliko", h)

    def test_creature_and_frame_are_the_species(self):
        c = json.load(open(os.path.join(self.out, "creature.json")))
        self.assertEqual((c["schema"], c["species"]), ("mb-creature/1", "S20"))
        fr = json.load(open(os.path.join(self.out, "frame", "species-S20.json")))
        self.assertEqual(fr["species"]["id"], "S20")
        self.assertTrue(fr["draft"])

    def test_the_glb_is_byte_deterministic(self):
        from wb import renderset as RSET
        spec = S.read_spec(S20)
        sc = os.path.join(SCRATCH, "det")
        os.makedirs(sc, exist_ok=True)
        subj = RSET.make_subject(spec, "type", sc)
        ex = glb_json(os.path.join(self.out, "S20.glb"))["asset"]["extras"]
        again = os.path.join(sc, "again.glb")
        EX.write_glb(subj, again, {k: ex[k] for k in ("species", "build", "review", "digest")})
        self.assertEqual(open(again, "rb").read(), open(os.path.join(self.out, "S20.glb"), "rb").read())


    def test_the_glb_reads_back_to_the_posed_mesh_the_render_draws(self):
        import numpy as np
        from wb import glbread, renderset as RSET
        g = glbread.read(os.path.join(self.out, "S20.glb"))
        M = g.posed("stand")
        subj = RSET.make_subject(S.read_spec(S20), "type", os.path.join(SCRATCH, "rb"))
        live = subj.posed()
        self.assertEqual(M["V"].shape, np.asarray(live["V"]).shape)
        self.assertLess(float(np.abs(M["V"] - np.asarray(live["V"])).max()), 2e-3)
        self.assertLess(float(np.abs(M["N"] - np.asarray(live["N"])).max()), 5e-2)


class TestNoModelYet(unittest.TestCase):
    def test_a_plan_without_a_model_writer_says_so_and_writes_nothing(self):
        out = os.path.join(SCRATCH, "quad")
        shutil.rmtree(SCRATCH, ignore_errors=True)
        with self.assertRaises(EX.ExportRefused) as c:
            EX.make(QUAD, out, stands=False, log=lambda m: None)
        self.assertEqual(c.exception.reasons, ["no model export yet"])
        self.assertEqual([f for f in os.listdir(out)] if os.path.exists(out) else [], [])
        shutil.rmtree(SCRATCH, ignore_errors=True)


class TestJob(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        cls.file = os.path.join(cls.sp, "S20.json")
        shutil.copy(S20, cls.file)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_a_export_is_a_p3_job(self):
        self.assertEqual(J.PRIORITY["export"], 3)

    def test_a_release_is_refused_with_its_reasons_and_nothing_is_queued(self):
        n = len(self.srv.queue.jobs)
        with self.assertRaises(S.ApiError) as c:
            self.srv.submit("S20", "export", dict(mode="release"), dict(name="t", role="maker"))
        self.assertEqual(c.exception.field, "release")
        self.assertIn("gate not signed", c.exception.extra["reasons"])
        self.assertTrue(c.exception.message.startswith("Release export is blocked: "))
        self.assertEqual(len(self.srv.queue.jobs), n)

    def test_b_a_mode_that_is_not_one_is_refused(self):
        with self.assertRaises(S.ApiError) as c:
            self.srv.submit("S20", "export", dict(mode="beta"), dict(name="t", role="maker"))
        self.assertEqual(c.exception.field, "mode")

    def test_c_a_review_runs_and_the_second_ask_is_the_cache(self):
        a = dict(mode="review", stands=False)
        j = self.srv.submit("S20", "export", a, dict(name="t", role="maker"))
        self.assertEqual(j.priority, 3)
        self.srv.wait(j, 600)
        self.assertEqual(j.state, "done", j.error)
        self.assertEqual([f["name"] for f in j.result["files"]][:3], ["S20.glb", "viewer.html", "creature.json"])
        self.assertTrue(os.path.exists(os.path.join(j.result["dir"], "S20.glb")))
        j2 = self.srv.submit("S20", "export", a, dict(name="t", role="maker"))
        self.assertTrue(j2.cached)
        self.assertEqual(j2.result["files"], j.result["files"])


if __name__ == "__main__":
    unittest.main()
