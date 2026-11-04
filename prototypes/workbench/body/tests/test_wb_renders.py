"""Chunk 11: render sets. The `renders` block of the species file, the game-v1 set and what it expands to, the layered stand's pieces and the scaling from the master. No Blender: the pictures are drawn by wb.renderset (its own run)."""
import copy
import json
import os
import shutil
import sys
import unittest
import urllib.request

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import numpy as np
from wb import renders as RS, stand as ST, pngio, server as SV, store as S
import genomeapply as GA

S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_renders")


def blob(w=304, h=312, box=(60, 50, 150, 240), colour=(120, 60, 200)):
    px = np.zeros((h, w, 4), np.uint8)
    x, y, bw, bh = box
    px[y:y + bh, x:x + bw] = (*colour, 255)
    return px


class TestBlock(unittest.TestCase):
    def test_the_file_carries_the_base_set(self):
        self.assertEqual(S20["renders"], {"base": "game-v1", "add": {}})
        self.assertEqual(RS.validate(S20), [])
        self.assertEqual([p for p, _ in GA.validate(S20)], [])

    def test_a_file_without_the_block_gets_the_base(self):
        doc = copy.deepcopy(S20)
        del doc["renders"]
        self.assertEqual(len(RS.expand(doc)), len(RS.expand(S20)))

    def test_game_v1_outputs(self):
        self.assertEqual(list(RS.GAME_V1), ["stand", "resident", "habitat", "incubator", "sleeper", "card", "trait", "thumb", "silhouette", "turn", "walk", "model"])
        g = RS.GAME_V1
        self.assertEqual((g["resident"]["sizes"], g["resident"]["figure"]), (dict(adult="144x152", juvenile="104x112"), dict(adult=54, juvenile=40)))
        self.assertEqual((g["habitat"]["figure"], g["incubator"]["figure"]), (dict(adult=150, juvenile=110), dict(juvenile=146)))
        self.assertEqual((g["sleeper"]["size"], g["card"]["size"], g["trait"]["size"], g["thumb"]["size"]), ("96x88", "96x96", "128x160", "48x48"))
        self.assertEqual(g["turn"]["az"], [0, 32, 90, 180])
        self.assertEqual(g["stand"]["kind"], "layers")
        self.assertEqual(g["walk"]["frames"], 6)

    def test_expansion_of_s20(self):
        rows = RS.expand(S20)
        ready = {(r["output"], r["variant"]) for r in rows if r["state"] == "ready"}
        self.assertIn(("stand", "adult-calm"), ready)
        self.assertIn(("turn", "adult-calm-az90-clay"), ready)
        self.assertIn(("trait", "adult-calm-lantern-tail"), ready)           # one per look the file declares
        self.assertIn(("silhouette", "adult-calm-48x48"), ready)
        self.assertEqual(len([r for r in rows if r["output"] == "turn" and r["state"] == "ready"]), 8)
        owed = {}
        for r in rows:
            if r["state"] == "owed":
                owed.setdefault(r["output"], []).append(r["why"])
        self.assertIn("juvenile", owed["incubator"][0])
        self.assertTrue(any("curl" in w for w in owed["sleeper"]))
        self.assertIn("clip", owed["walk"][0])
        self.assertIn("glb", owed["model"][0])
        self.assertTrue(all(r["state"] == "ready" for r in rows if r["age"] == "adult" and r["pose"] in ("calm", "anchor") and r["kind"] in ("sprite", "layers")))

    def test_a_species_adds_and_never_removes(self):
        doc = copy.deepcopy(S20)
        doc["renders"]["add"]["card-plum"] = {"size": "96x96", "style": "plush", "az": [32], "pose": "calm", "age": "adult", "genome": {"hue": 300}, "kind": "sprite"}
        self.assertEqual(RS.validate(doc), [])
        self.assertIn("card-plum", RS.outputs(doc))
        self.assertEqual(len(RS.expand(doc)), len(RS.expand(S20)) + 1)
        self.assertTrue(set(RS.GAME_V1) <= set(RS.outputs(doc)))
        doc["renders"]["add"]["card"] = dict(RS.GAME_V1["card"])
        self.assertIn("renders.add.card", [p for p, _ in RS.validate(doc)])

    def test_broken_blocks_name_their_field(self):
        doc = copy.deepcopy(S20)
        doc["renders"] = {"base": "game-v2", "add": {"a": {"size": "big", "style": "pixel", "age": "baby", "kind": "gif", "from": "master", "az": "x", "colour": 1},
                                                   "b": {"size": "48x48", "style": "chalk"}}, "extra": 1}
        paths = [p for p, _ in RS.validate(doc)]
        for want in ("renders.base", "renders.extra", "renders.add.a.size", "renders.add.a.style", "renders.add.a.age", "renders.add.a.kind", "renders.add.a.figure", "renders.add.a.colour", "renders.add.b.style"):
            self.assertIn(want, paths)
        msg = dict(RS.validate(doc))["renders.add.a.style"]
        self.assertIn("not yet", msg)
        self.assertTrue(any(m.startswith("renders.add.b.style:") for _, m in GA.validate(doc)))        # the file's validator carries them

    def test_pixel_is_listed_as_not_yet(self):
        self.assertEqual([n["style"] for n in RS.not_yet(S20)], ["pixel"])


class TestPng(unittest.TestCase):
    def test_roundtrip(self):
        rng = np.random.default_rng(1)
        a = rng.integers(0, 256, (17, 23, 4), dtype=np.uint8)
        os.makedirs(SCRATCH, exist_ok=True)
        p = os.path.join(SCRATCH, "r.png")
        pngio.write(p, a)
        self.assertTrue(np.array_equal(pngio.read(p), a))
        shutil.rmtree(SCRATCH, ignore_errors=True)


class TestStand(unittest.TestCase):
    def test_ink_box_feet_line_ignores_a_soft_fringe(self):
        px = blob()
        px[290:296, 80:100, 3] = 60                        # a soft shadow fringe below the feet
        self.assertEqual(ST.ink_box(px), [60, 50, 150, 240])

    def test_scale_is_height_over_figure_height_and_never_up(self):
        self.assertAlmostEqual(ST.scale_factor(150, [0, 0, 100, 239]), 150 / 239)
        self.assertEqual(ST.scale_factor(500, [0, 0, 100, 239]), 1.0)

    def test_from_master_figure_height_and_place(self):
        art = blob()
        fig = ST.ink_box(art)
        pic, s = ST.from_master(art, fig, 150, (304, 312))
        self.assertEqual(pic.shape, (312, 304, 4))
        box = ST.ink_box(pic)
        self.assertLessEqual(abs(box[3] - 150), 1)
        self.assertEqual(box[1] + box[3], 312 - round((312 - 290) * s))          # the foot stays where the scaled canvas puts it (bottom-centred)
        small, s2 = ST.from_master(art, fig, 54, (144, 152))
        self.assertEqual(small.shape, (152, 144, 4))
        self.assertLessEqual(abs(ST.ink_box(small)[3] - 54), 1)
        cx = ST.ink_box(small)
        self.assertLessEqual(abs((cx[0] + cx[2] / 2) - (144 / 2 - (304 / 2 - 135) * s2)), 1.5)        # the figure keeps its place across the canvas

    def test_reduction_keeps_flat_colour_and_alpha_edges_clean(self):
        px = blob()
        r = ST.reduce_by(px, 0.5)
        inside = r[r[..., 3] == 255]
        self.assertTrue((np.abs(inside[:, :3].astype(int) - (120, 60, 200)).max() <= 1))
        self.assertTrue((r[..., 3][r[..., 3] > 0].min() >= 1))
        edge = r[r[..., 3] > 0][:, :3]
        self.assertTrue((np.abs(edge.astype(int) - (120, 60, 200)).max() <= 2))                    # premultiplied: no dark halo on a soft edge

    def test_layers_compose_back_to_the_look(self):
        base = blob()
        on = base.copy()
        on[100:130, 200:240] = (250, 220, 40, 255)         # the look adds a patch
        on[60:80, 60:70, 3] = 0                            # and takes a corner off
        ov, er = ST.layer_from_pair(base, on, min_px=10)
        self.assertIsNotNone(ov)
        self.assertIsNotNone(er)
        out = ST.compose(base, [("erase", er), ("over", ov)])
        d = np.abs(out.astype(int) - on.astype(int))
        self.assertLessEqual(d[..., 3].max(), 0)
        self.assertEqual(int((d[..., :3].max(2) * (on[..., 3] > 0)).max()), 0)

    def test_a_look_that_changes_nothing_has_no_layer(self):
        base = blob()
        self.assertEqual(ST.layer_from_pair(base, base.copy()), (None, None))

    def test_a_speck_far_from_the_look_is_not_the_look(self):
        base = blob()
        on = base.copy()
        on[100:130, 200:240] = (250, 220, 40, 255)
        on[200, 70] = (0, 0, 0, 255)
        ov, _ = ST.layer_from_pair(base, on)
        self.assertEqual(ov[200, 70, 3], 0)
        self.assertEqual(ov[110, 210, 3], 255)

    def test_shadow_lies_under_the_art_with_its_feet_row_on_the_feet(self):
        art = blob()
        sh = np.zeros((48, 304, 4), np.uint8)
        sh[24:30, 50:250] = (0, 0, 0, 90)
        c = ST.with_shadow(art, sh, 289)
        self.assertEqual(c.shape[1], 304)
        self.assertEqual(c[289 + 2, 100, 3], 90)           # below the feet
        self.assertEqual(tuple(c[200, 100]), (120, 60, 200, 255))      # the art over it


class TestDrawn(unittest.TestCase):
    """The Workbench styles of the set, drawn for real in a child process (about 5 s; the plush pictures are the done-picture's run)."""
    def test_silhouette_is_alpha_only_and_clay_has_alpha_around_it(self):
        import subprocess
        out = os.path.join(SCRATCH, "drawn")
        shutil.rmtree(out, ignore_errors=True)
        r = subprocess.run([sys.executable, "-m", "wb.renderset", os.path.join(BODY, "species_v1", "S20.json"), out, "--only", "silhouette,turn", "--styles", "clay,silhouette", "--scratch", os.path.join(out, "_s")], cwd=BODY, capture_output=True, text=True, timeout=300)
        if r.returncode != 0 and "No module named 'bpy'" in r.stderr:
            self.skipTest("no Blender python")
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        sil = pngio.read(os.path.join(out, "S20-silhouette-adult-calm-304x312.png"))
        self.assertEqual(sil.shape, (312, 304, 4))
        solid = sil[sil[..., 3] == 255][:, :3]
        self.assertGreater(len(solid), 5000)
        self.assertEqual(len({tuple(p) for p in solid}), 1)                              # one flat fill
        small = pngio.read(os.path.join(out, "S20-silhouette-adult-calm-48x48.png"))
        self.assertEqual(small.shape, (48, 48, 4))
        self.assertEqual(small[0, 0, 3], 0)
        clay = pngio.read(os.path.join(out, "S20-turn-adult-calm-az32-clay.png"))
        self.assertEqual(clay[0, 0, 3], 0)
        self.assertGreater(int((clay[..., 3] > 0).sum()), 5000)
        with open(os.path.join(out, "manifest.json")) as fh:
            m = json.load(fh)
        self.assertEqual(sorted({x["output"] for x in m["rows"]}), ["silhouette", "turn"])
        self.assertEqual(m["not_yet"][0]["style"], "pixel")
        shutil.rmtree(out, ignore_errors=True)


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S20.json"), S20)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_the_set_through_the_api(self):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.srv.port}/api/species/S20/renders") as r:
            d = json.load(r)
        self.assertEqual((d["base"], d["ready"] + d["owed"], len(d["rows"])), ("game-v1", len(d["rows"]), len(RS.expand(S20))))
        self.assertGreater(d["ready"], 10)
        self.assertEqual(d["not_yet"][0]["style"], "pixel")


if __name__ == "__main__":
    unittest.main()
