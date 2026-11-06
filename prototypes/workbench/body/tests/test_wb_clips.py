"""Chunk 16: clips. The walk and idle loops are poses of the rig (six frames of one loop each), the strip is the frames side by side, and a strip has its own key in the cache. No Blender: the poses are numpy; the pictures are drawn by the workers."""
import copy, json, os, shutil, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
from wb import clips as CL, renders as RS, server as SV, store as S, facade as F

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_clips")


class TestPoses(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import s20rig
        cls.R = s20rig.Rig(F.build(S20, "type", "base").body.ctx)

    def verts(self, clip, i, n=None):
        M, br = CL.pose_at(self.R, S20, clip, i, n)
        return M, br

    def test_each_clip_is_six_frames_of_one_loop_and_the_loop_closes(self):
        for clip in ("walk", "idle"):
            self.assertEqual(CL.frames(clip), 6)
            a, b = self.verts(clip, 0)[0], self.verts(clip, 6, 6)[0]                          # frame 6 is frame 0 again: the loop closes
            for k in a:
                np.testing.assert_allclose(a[k], b[k], atol=1e-9, err_msg=f"{clip} {k}")
        with self.assertRaises(ValueError):
            CL.frames("dance")

    def test_every_frame_of_a_clip_is_its_own_pose(self):
        for clip in ("walk", "idle"):
            ms = [self.verts(clip, i)[0] for i in range(6)]
            for i in range(6):
                for j in range(i + 1, 6):
                    self.assertTrue(any(not np.allclose(ms[i][k], ms[j][k]) for k in ms[i]), f"{clip} frames {i} and {j} are the same pose")

    def test_the_walk_lifts_one_foot_at_a_time_and_the_feet_swap_over_the_loop(self):
        st = [self.R.waddle_pose(i / 6)[1] for i in range(6)]
        self.assertTrue(all(a or b for a, b in ((x["L"], x["R"]) for x in st)), "a frame with both feet off the floor")
        self.assertTrue(any(not x["L"] for x in st) and any(not x["R"] for x in st))
        self.assertTrue(st[0]["L"] and st[0]["R"], "the first frame stands on both feet (the shadow is laid from it)")

    def test_the_walk_takes_the_files_period_and_the_idle_breathes_in_zero_to_one(self):
        self.assertEqual(CL.period(S20, "walk"), 0.9)
        self.assertEqual(CL.timings(S20, "walk", None)["frame_s"], 0.15)
        d = copy.deepcopy(S20)
        d["motion"]["walk"]["period"] = 1.2
        self.assertEqual(CL.timings(d, "walk", None)["frame_s"], 0.2)
        br = [self.verts("idle", i)[1] for i in range(6)]
        self.assertTrue(all(0.0 <= b <= 1.0 for b in br) and max(br) - min(br) > 0.5)
        self.assertTrue(all(self.verts("walk", i)[1] == 0.0 for i in range(6)))


class TestKeys(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [os.path.join(BODY, "species_v1"), os.path.join(BODY, "species_play")], static=None, proxy_workers=0, plush_workers=0)
        cls.sp = cls.srv.get_species("S71")

    def test_a_strip_has_a_key_of_its_own_per_clip_style_and_genome(self):
        s, sp = self.srv, self.sp
        keys = {s.clip_key(sp.spec, "type", c, st) for c in ("walk", "idle") for st in ("clay", "plush")}
        self.assertEqual(len(keys), 4)
        self.assertNotIn(s.plush_key(sp.spec, "type"), keys)
        self.assertEqual(s.clip_key(sp.spec, "type", "walk", "clay"), s.clip_key(copy.deepcopy(sp.spec), "type", "walk", "clay"))
        self.assertNotEqual(s.clip_key(sp.spec, "type", "walk", "plush"), s.clip_key(sp.spec, "set:form.tail-length=1.3", "walk", "plush"))
        d = copy.deepcopy(sp.spec)
        d["motion"]["walk"]["period"] = 1.1
        self.assertNotEqual(s.clip_key(d, "type", "walk", "plush"), s.clip_key(sp.spec, "type", "walk", "plush"))

    def test_asking_for_a_clip_queues_the_clay_and_the_plush_and_asking_again_adds_nothing(self):
        s, sp = self.srv, self.sp
        c = s.clip_of(sp, copy.deepcopy(sp.spec), "type", "walk")
        self.assertEqual((c["frames"], c["frame_s"], c["size"]), (6, 0.15, [304, 312]))
        self.assertFalse(c["clay"]["ready"] or c["plush"]["ready"])
        again = s.clip_of(sp, copy.deepcopy(sp.spec), "type", "walk")
        self.assertEqual((again["clay"]["job"], again["plush"]["job"]), (c["clay"]["job"], c["plush"]["job"]))
        kinds = sorted(j.kind for j in s.queue.jobs.values() if j.state == "queued")
        self.assertEqual(kinds.count("clayclip"), 1)
        self.assertEqual(kinds.count("plush"), 1)
        look = s.clip_of(sp, copy.deepcopy(sp.spec), "type", "walk", ask=False)
        self.assertEqual(look["clay"]["job"], None)


class TestSet(unittest.TestCase):
    def test_the_walk_of_the_grown_body_is_in_the_set_and_the_young_one_is_owed(self):
        rows = [r for r in RS.expand(S20) if r["output"] == "walk"]
        self.assertEqual({(r["age"], r["state"]) for r in rows}, {("adult", "ready"), ("juvenile", "owed")})
        r = next(x for x in rows if x["state"] == "ready")
        self.assertEqual((r["kind"], r["size"], r["pose"]), ("strip", (304, 312), "walk"))


class TestDrawn(unittest.TestCase):
    """The strips drawn for real in child processes: the clay (a few seconds) and the plush of the set (about 40 s)."""
    def run_py(self, args, **kw):
        import subprocess
        r = subprocess.run([sys.executable] + args, cwd=BODY, capture_output=True, text=True, timeout=600, env=dict(os.environ, PYTHONPATH=BODY), **kw)
        if r.returncode != 0 and "No module named 'bpy'" in r.stderr:
            self.skipTest("no Blender python")
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        return r

    def frames_of(self, strip):
        from wb import clips as C
        n = C.frames("walk")
        self.assertEqual(strip.shape, (312, 304 * n, 4))
        return [strip[:, k * 304:(k + 1) * 304] for k in range(n)]

    def feet_rows(self, frames):
        return [int(np.where(f[..., 3] > 128)[0].max()) for f in frames]

    def test_the_clay_walk_is_six_frames_one_figure_inside_each_with_the_feet_on_one_floor(self):
        from wb import pngio
        out = os.path.join(SCRATCH, "clay")
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        code = ("import json,sys;from wb import renderset as R,pngio;spec=json.load(open(sys.argv[1]));sub=R.Subject(spec,'type',sys.argv[2]);px=R.Proxy(sys.argv[2]);"
                "fr,ms=R.clay_clip(px,sub,'walk',(304,312),sys.argv[2]);pngio.write(sys.argv[3],R.strip_of(fr));print(json.dumps(ms))")
        r = self.run_py(["-c", code, os.path.join(BODY, "species_v1", "S20.json"), out, os.path.join(out, "strip.png")])
        fr = self.frames_of(pngio.read(os.path.join(out, "strip.png")))
        for f in fr:
            ys, xs = np.where(f[..., 3] > 0)
            self.assertGreater(len(ys), 8000)
            self.assertTrue(xs.min() > 0 and xs.max() < 303 and ys.min() > 0 and ys.max() < 311, "the figure touches the frame")
        self.assertTrue(max(self.feet_rows(fr)) - min(self.feet_rows(fr)) <= 8, self.feet_rows(fr))             # the lifted foot rises a few px; the planted one stays
        self.assertTrue(all(not np.array_equal(fr[0], f) for f in fr[1:]))
        self.assertTrue(all(float(json.loads(r.stdout.strip().splitlines()[-1])[k]) < 3000 for k in range(6)))
        shutil.rmtree(out, ignore_errors=True)

    def test_the_plush_walk_of_the_set_is_a_strip_with_one_shadow_for_all_six_frames(self):
        from wb import pngio
        out = os.path.join(SCRATCH, "plush")
        shutil.rmtree(out, ignore_errors=True)
        self.run_py(["-m", "wb.renderset", os.path.join(BODY, "species_v1", "S20.json"), out, "--only", "walk", "--scratch", os.path.join(out, "_s")])
        m = json.load(open(os.path.join(out, "manifest.json")))
        row = next(x for x in m["rows"] if x["output"] == "walk")
        self.assertEqual((row["kind"], row["frames"], len(row["frame_ms"])), ("strip", 6, 6))
        fr = self.frames_of(pngio.read(os.path.join(out, row["file"])))
        under = [f[300:312, :, 3] for f in fr]                                                                    # the floor shadow lies below the soles
        a = [(u > 0).sum() for u in under]
        self.assertGreater(min(a), 100)
        self.assertLess((max(a) - min(a)) / max(a), 0.5)
        shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
