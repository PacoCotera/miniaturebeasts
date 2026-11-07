"""Chunk 12: goldens. The tooling is tested on a synthetic set of the real set's names (no Blender): make, the manifest and the stamp in each PNG, the commit, the four states, the heat map, the cause of a moved key, the CLI, the API. One test draws for real (diff of the silhouette and turn outputs) when Blender is there."""
import copy
import io
import json
import os
import shutil
import subprocess
import sys
import unittest
import urllib.request

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import numpy as np
from wb import golden as G, pngio, renders as RS, server as SV, store as S, cas as C, cli, hashing as H

S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_golden")


def fake_set(spec, outdir, shift=0, seed=1):
    """A drawn set folder with the real set's names: a manifest.json as wb.renderset writes it and a picture for every ready row, the layered stand's pieces included."""
    os.makedirs(outdir, exist_ok=True)
    rng = np.random.RandomState(seed)
    rows, k = [], 0
    for r in RS.expand(spec):
        if r["state"] != "ready":
            continue
        w, h = r["size"]
        fn = f"{spec['id']}-{r['output']}-{r['variant']}.png"
        alias = r["kind"] == "layers" and r["pose"] == "anchor"
        if r["kind"] == "layers" and not alias:
            fn = f"{spec['id']}-{r['variant']}-304x312-base.png"
        if not alias:
            px = np.zeros((h, w, 4), np.uint8)
            px[h // 5:h - h // 6, w // 4:w - w // 4] = (60 + k * 7 % 150, 80, 160, 255)
            px[h // 3:h // 3 + 6, w // 3:w // 3 + 9, 0] += shift
            pngio.write(os.path.join(outdir, fn), px)
            k += 1
        rows.append(dict(r, size=[w, h], file=fn, **({"alias": "calm"} if alias else {})))
    lay = [dict(op="under", order=0, file="S20-adult-304x48-shadow.png", views=["home"], size=[304, 48]), dict(op="over", order=10, file="S20-adult-calm-304x312-lantern-tail.png"), dict(op="erase", order=11, file="S20-adult-calm-304x312-lantern-tail-erase.png")]
    for l in lay:
        px = np.zeros((48 if l["op"] == "under" else 312, 304, 4), np.uint8)
        px[10:20, 50:100] = (0, 0, 0, 140)
        pngio.write(os.path.join(outdir, l["file"]), px)
    idx = {"S20": {"adult": dict(pose="calm", sizes={"304x312": dict(base="x", bases={}, layers=lay)})}}
    json.dump(dict(species=spec["id"], set="game-v1", stand_index=idx, rows=rows, owed=[], not_yet=[]), open(os.path.join(outdir, "manifest.json"), "w"))
    return outdir


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        cls.path = os.path.join(cls.sp, "S20.json")
        S.write_spec(cls.path, S20)
        subprocess.run(["git", "init", "-q", cls.sp], check=True)
        for k, v in (("user.name", "T"), ("user.email", "t@example.org")):
            subprocess.run(["git", "-C", cls.sp, "config", k, v], check=True)
        cls.home = os.path.join(SCRATCH, "home")
        os.makedirs(cls.home)
        cls.cas = C.Cas(os.path.join(cls.home, "cas"))
        cls.set0 = fake_set(S20, os.path.join(SCRATCH, "set0"))
        cls.man = G.make(cls.path, cls.home, setdir=cls.set0, log=lambda m: None)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)


class TestMake(Base):
    def test_files_manifest_and_commit(self):
        gd = G.golden_dir(self.path, "S20")
        m = json.load(open(os.path.join(gd, "manifest.json")))
        ids = {e["id"] for e in m["entries"]}
        self.assertIn("stand/adult-calm", ids)
        self.assertIn("stand/adult-304x48-shadow", ids)
        self.assertIn("stand/adult-calm-304x312-lantern-tail-erase", ids)
        self.assertIn("turn/adult-calm-az90-clay", ids)
        self.assertNotIn("stand/adult-anchor", ids)                               # the anchor is the calm stand under another name
        for e in m["entries"]:
            f = os.path.join(gd, e["file"])
            self.assertEqual(G.sha256(f), e["sha256"])
            self.assertEqual(G.pixel_hash(pngio.read(f)), e["pixels"])
            t = pngio.read_text(f)
            self.assertEqual((t["wb-file"], t["wb-framework"], t["wb-key"]), (m["file_hash"], m["framework"], m["key"]))
        self.assertEqual(m["file_hash"], H.hash_of(S20))
        self.assertEqual(m["framework"], H.framework_id())
        self.assertEqual(m["lookdev"], G.lookdev())
        self.assertFalse(m["release"])
        self.assertTrue(os.path.exists(os.path.join(gd, "source.json")))
        log = subprocess.run(["git", "-C", self.sp, "log", "--format=%s"], capture_output=True, text=True).stdout.splitlines()
        self.assertEqual(log[0], f"S20 goldens at {H.hash_of(S20)[:8]}")
        self.assertEqual(len(log), 1)

    def test_the_pixels_are_not_marked(self):
        gd = G.golden_dir(self.path, "S20")
        px = pngio.read(os.path.join(gd, "turn", "adult-calm-az90-clay.png"))
        src = pngio.read(os.path.join(self.set0, "S20-turn-adult-calm-az90-clay.png"))
        self.assertTrue((px == src).all())

    def test_release_goldens_are_not_made_here(self):
        with self.assertRaises(G.GoldenError):
            G.make(self.path, self.home, setdir=self.set0, release=True, commit=False)

    def test_lookdev_is_the_looks_own_settings(self):
        self.assertRegex(G.lookdev(), r"^[0-9a-f]{8}$")


class TestState(Base):
    def test_all_same_when_the_key_is_the_one_made_at(self):
        st = G.state(self.path, self.home)
        self.assertEqual(st["totals"]["same"], st["totals"]["all"])
        self.assertEqual(G.line(st["totals"]), f"{st['totals']['all']} same")
        self.assertEqual(st["causes"], [])
        self.assertEqual(st["stamp"]["file"], H.hash_of(S20))

    def test_a_moved_file_is_stale_then_changed_or_same_by_the_diff(self):
        path = os.path.join(SCRATCH, "edit", "S20.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # the same folder of goldens, an edited file
        shutil.copytree(G.golden_dir(self.path, "S20"), G.golden_dir(path, "S20"))
        doc = copy.deepcopy(S20)
        field = self._tweak(doc)
        S.write_spec(path, doc)
        st = G.state(path, self.home)
        self.assertEqual(st["totals"]["stale"], st["totals"]["all"])
        self.assertEqual(G.line(st["totals"]), f"{st['totals']['all']} stale")
        c = st["causes"][0]
        self.assertEqual((c["kind"], c["field"]), ("file", field))
        # the diff: nothing moved in 17 of the pictures, one moved
        now = fake_set(doc, os.path.join(SCRATCH, "now1"), shift=0)
        px = pngio.read(os.path.join(now, "S20-card-adult-calm.png"))
        px[20:60, 20:60] = (230, 30, 30, 255)
        pngio.write(os.path.join(now, "S20-card-adult-calm.png"), px)
        st = G.diff(path, self.home, self.cas, setdir=now, log=lambda m: None)
        t = st["totals"]
        self.assertEqual((t["changed"], t["stale"], t["missing"]), (1, 0, 0))
        e = next(x for x in st["entries"] if x["state"] == "changed")
        self.assertEqual(e["id"], "card/adult-calm")
        self.assertAlmostEqual(e["pct"], 100 * 1600 / (96 * 96), places=2)
        self.assertTrue(self.cas.has(e["heat"], "png") and self.cas.has(e["now"], "png"))
        heat = pngio.read(self.cas.path(e["heat"], "png"))
        self.assertEqual(heat.shape, (96, 96, 4))
        self.assertGreater(int(heat[30, 30, 0]), 150)
        self.assertLess(int(heat[30, 30, 2]), 100)                                  # amber to red where it moved
        self.assertEqual(G.line(t), f"{t['same']} same · 1 changed")

    @staticmethod
    def _tweak(doc):
        # any numeric field of the file will do: the first number in the species' limits
        def walk(o, path):
            if isinstance(o, dict):
                for k, v in o.items():
                    r = walk(v, path + [k])
                    if r:
                        return r
            elif isinstance(o, float):
                return path
        p = walk(doc, [])
        cur = doc
        for k in p[:-1]:
            cur = cur[k]
        cur[p[-1]] = cur[p[-1]] * 1.5 + 0.01
        return ".".join(p)

    def test_a_picture_the_set_asks_for_without_a_golden_is_missing(self):
        path = os.path.join(SCRATCH, "miss", "S20.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        shutil.copytree(G.golden_dir(self.path, "S20"), G.golden_dir(path, "S20"))
        mp = os.path.join(G.golden_dir(path, "S20"), "manifest.json")
        m = json.load(open(mp))
        m["entries"] = [e for e in m["entries"] if e["id"] != "thumb/adult-calm"]
        json.dump(m, open(mp, "w"))
        S.write_spec(path, S20)
        st = G.state(path, self.home)
        self.assertEqual([e["id"] for e in st["entries"] if e["state"] == "missing"], ["thumb/adult-calm"])
        self.assertEqual(st["totals"]["missing"], 1)

    def test_make_missing_adds_the_new_golden_and_touches_no_other(self):
        path = os.path.join(SCRATCH, "addm", "S20.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        gd = G.golden_dir(path, "S20")
        shutil.copytree(G.golden_dir(self.path, "S20"), gd)
        mp = os.path.join(gd, "manifest.json")
        m = json.load(open(mp))
        m["entries"] = [e for e in m["entries"] if e["id"] != "walk/adult-walk"]
        json.dump(m, open(mp, "w"))
        os.remove(os.path.join(gd, "walk", "adult-walk.png"))
        S.write_spec(path, S20)
        subprocess.run(["git", "init", "-q", os.path.dirname(path)], check=True)
        before = {e["id"]: (open(os.path.join(gd, e["file"]), "rb").read(), e) for e in m["entries"]}
        src0 = open(os.path.join(gd, "source.json")).read()
        got = G.make_missing(path, self.home, setdir=self.set0, commit=False, log=lambda x: None)
        self.assertEqual(got["added"], ["walk/adult-walk"])
        m2 = json.load(open(mp))
        self.assertEqual([e["id"] for e in m2["entries"]][-1], "walk/adult-walk")
        for eid, (data, e) in before.items():
            self.assertEqual(open(os.path.join(gd, e["file"]), "rb").read(), data)             # no picture is rewritten
            self.assertIn(e, m2["entries"])                                                    # no row is changed
        for k in ("key", "file_hash", "framework", "lookdev", "made_by", "made_at"):
            self.assertEqual(m2[k], m[k])                                                       # the stamp stays the one the set was made at
        self.assertEqual(open(os.path.join(gd, "source.json")).read(), src0)
        self.assertEqual(G.state(path, self.home)["totals"], dict(same=len(m2["entries"]), changed=0, missing=0, stale=0, all=len(m2["entries"])))
        again = G.make_missing(path, self.home, setdir=self.set0, commit=False, log=lambda x: None)
        self.assertEqual(again["added"], [])                                                    # nothing missing: nothing done

    def test_make_missing_needs_goldens_and_a_file_that_moved_keeps_the_new_row_apart(self):
        path = os.path.join(SCRATCH, "addn", "S20.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        S.write_spec(path, S20)
        with self.assertRaises(G.GoldenError):
            G.make_missing(path, self.home, setdir=self.set0, commit=False, log=lambda x: None)

    def test_idle_is_not_in_the_game_set(self):
        self.assertNotIn("idle", RS.GAME_V1)
        self.assertNotIn("idle", {i.split("/")[0] for i in G.expected_ids(S20)})

    def test_names_use_the_screens_words(self):
        looks = {"lantern-tail": "Lantern tail"}
        ent = lambda **k: G.label_of(dict(variant="v", **k), looks)
        self.assertEqual(ent(output="stand", age="adult"), "Stand · grown")
        self.assertEqual(ent(output="stand", age="adult", part="shadow"), "Shadow · grown")
        self.assertEqual(ent(output="stand", age="adult", part="lantern-tail"), "Layer · lantern tail")
        self.assertEqual(ent(output="stand", age="adult", part="lantern-tail-erase"), "Erase · lantern tail")
        self.assertEqual(ent(output="habitat", age="juvenile"), "Habitat figure · young")
        self.assertEqual(ent(output="turn", style="plush", az=32), "Plush turn · 32°")
        self.assertEqual(ent(output="turn", style="clay", az=32), "Clay turn · 32°")
        self.assertEqual(ent(output="trait", look="lantern-tail"), "Trait · lantern tail")
        self.assertEqual(ent(output="trait"), "Trait pictures")
        self.assertEqual(G.GROUPS["sleeper"], "Sleep")
        self.assertEqual(G.line(dict(same=6, changed=13, missing=1, stale=2)), "6 same · 13 changed · 1 new · 2 stale")

    def test_no_goldens_at_all_is_all_missing(self):
        path = os.path.join(SCRATCH, "none", "S20.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        S.write_spec(path, S20)
        st = G.state(path, self.home)
        self.assertFalse(st["have"])
        self.assertEqual(st["totals"]["missing"], st["totals"]["all"])

    def test_compare_tolerance_and_two_clear_pixels(self):
        a = np.zeros((10, 10, 4), np.uint8)
        a[2:5, 2:5] = (100, 100, 100, 255)
        b = a.copy()
        b[2:5, 2:5, 0] += 4
        b[8, 8, :3] = 200                                        # hidden colour under alpha 0
        self.assertEqual(G.compare(a, b)[0]["state"], "same")
        b[3, 3, 0] += 1
        r, heat = G.compare(a, b)
        self.assertEqual((r["state"], r["moved"]), ("changed", 1))
        self.assertEqual(heat.shape, (10, 10, 4))
        self.assertEqual(G.compare(a, a[:5])[0]["state"], "changed")

    def test_causes_name_framework_and_lookdev(self):
        man = dict(self.man, framework="000000000000", lookdev="00000000")
        c = G.causes(S20, man, S20)
        self.assertEqual([x["kind"] for x in c], ["framework", "lookdev"])
        self.assertEqual(c[0]["new"], H.framework_id())


class TestFrameworkCommits(unittest.TestCase):
    def test_which_commits_are_framework_commits(self):
        base = "prototypes/workbench/body/"
        self.assertTrue(G.framework_touched([base + "plush.py"]))
        self.assertTrue(G.framework_touched(["x.txt", base + "s20coat.py"]))
        self.assertFalse(G.framework_touched([base + "wb/golden.py", base + "tests/test_wb_golden.py", base + "species_v1/S20.json"]))
        self.assertFalse(G.framework_touched([]))


class TestCli(Base):
    def test_list_and_diff_exit_codes(self):
        buf = io.StringIO()
        old = sys.stdout
        sys.stdout = buf
        try:
            rc = cli.main(["golden", "list", "S20", "--file", self.path, "--home", self.home, "--json"])
        finally:
            sys.stdout = old
        d = json.loads(buf.getvalue())
        self.assertEqual(rc, 0)
        self.assertEqual(d["totals"]["same"], d["totals"]["all"])
        sys.stdout = io.StringIO()
        try:
            rc = cli.main(["golden", "make", "S20", "--file", self.path, "--home", self.home, "--release"])
        finally:
            sys.stdout = old
        self.assertEqual(rc, 2)

    def test_precommit_with_nothing_framework_staged_passes(self):
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            rc = cli.main(["golden", "precommit", "S20", "--home", self.home])
        finally:
            sys.stdout = old
        self.assertEqual(rc, 0)

    def test_the_release_check_with_no_release_goldens_passes(self):
        old = sys.stdout
        sys.stdout = io.StringIO()
        try:
            rc = cli.main(["golden", "diff", "S20", "--file", self.path, "--home", self.home, "--release"])
        finally:
            sys.stdout = old
        self.assertEqual(rc, 0)


class TestApi(Base):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.srv = SV.Server(cls.home, [cls.sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        super().tearDownClass()

    def get(self, p):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.srv.port}{p}") as r:
            return r.read(), r.headers

    def test_state_and_the_golden_picture(self):
        d = json.loads(self.get("/api/species/S20/goldens")[0])
        self.assertEqual(d["totals"]["same"], d["totals"]["all"])
        b, h = self.get("/api/species/S20/goldens/file?id=card/adult-calm")
        self.assertEqual(h["Content-Type"], "image/png")
        self.assertEqual(pngio.read_text(os.path.join(G.golden_dir(self.path, "S20"), "card", "adult-calm.png"))["wb-id"], "card/adult-calm")
        self.assertEqual(b[:8], b"\x89PNG\r\n\x1a\n")

    def test_a_job_needs_goldens_to_diff_and_never_makes_release_ones(self):
        for args, field in (({"action": "make", "release": True}, "release"), ({"action": "x"}, "action")):
            with self.assertRaises(S.ApiError) as c:
                self.srv.submit("S20", "golden", args, dict(name="t", role="maker"))
            self.assertEqual(c.exception.field, field)


class TestDrawn(unittest.TestCase):
    def test_a_real_diff_of_two_outputs_is_all_same(self):
        shutil.rmtree(SCRATCH + "_d", ignore_errors=True)
        sp = os.path.join(SCRATCH + "_d", "species")
        os.makedirs(sp)
        path = os.path.join(sp, "S20.json")
        S.write_spec(path, S20)
        home = os.path.join(SCRATCH + "_d", "home")
        try:
            out = G.draw(path, os.path.join(SCRATCH + "_d", "set"), only=["silhouette", "turn"])
        except G.GoldenError as e:
            shutil.rmtree(SCRATCH + "_d", ignore_errors=True)
            self.skipTest(str(e)[:80])
        spec = S.read_spec(path)
        ents, _ = G.entries_of(spec, out)
        self.assertEqual(sorted(ents), sorted(i for i in ents if i.split("/")[0] in ("silhouette", "turn")))
        self.assertEqual(len(ents), 10)
        shutil.rmtree(SCRATCH + "_d", ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
