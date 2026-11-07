"""Chunk 14: play, pick and shape. The warm set a starter needs, the plush pictures and their keys, the starters' cushions, and the page's own logic. No Blender here: the plush worker is off (plush_workers=0), so a picture is asked for and never drawn."""
import copy, json, os, shutil, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import play as PL, server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_bench")
S20 = S.read_spec(os.path.join(BODY, "species_v1", "S20.json"))


def starter(sid="S71", name="Pemmi", **state):
    d = copy.deepcopy(S20)
    d["id"] = sid
    d["play"] = dict(starter=True, name=name, state=state)
    return d


class TestWarmSet(unittest.TestCase):
    def test_every_step_and_every_end_once_and_a_trimmed_step_never(self):
        d = starter(**{"appearance.body-hue": 257.142857})
        items = PL.warm_set(d)
        genomes = [i["genome"] for i in items]
        self.assertEqual(len(genomes), len(set(genomes)))
        steps = [i for i in items if i["kind"] == "step"]
        ends = [i for i in items if i["kind"] == "end"]
        self.assertEqual(len(steps), 44 - 7)                    # 44 steps and chips on 8 axes; the picture of the mibi as it stands is one picture for all 8
        self.assertEqual(sum(1 for i in steps if i["genome"] == PL.genome_of(PL.home_state(d))), 1)
        self.assertTrue(all(g.startswith("set:") for g in genomes))
        self.assertTrue(any(e["toy"] == "paint" for e in ends) and len([e for e in ends if e["toy"] == "body"]) == 2)       # a slider's two ends, every paint pot
        sweep = dict(toys=dict(tail=dict(length=dict(lo=0, hi=4, trimmed=[dict(step=5, side="hi", checks=["tail.size"]), dict(step=6, side="hi", checks=["tail.size"])]))))
        cut = PL.warm_set(d, sweep)
        self.assertEqual(len([i for i in cut if i["kind"] == "step" and (i["toy"], i["axis"]) == ("tail", "length")]), 4)

    def test_a_step_is_the_mibi_with_that_one_axis_moved(self):
        d = starter(**{"appearance.body-hue": 360.0, "form.tail-length": 1.05})
        home = PL.home_state(d)
        item = next(i for i in PL.warm_set(d) if (i["toy"], i["axis"], i["step"]) == ("tail", "length", 6))
        self.assertEqual(item["genome"], PL.genome_of({**home, "form.tail-length": 1.3}))
        self.assertEqual(home["appearance.body-hue"], 360.0)


class TestScreenWords(unittest.TestCase):
    def test_a_chip_id_never_reaches_the_screen_the_files_short_words_do(self):
        for t in PL.toys_of(S20):
            for a in t["axes"]:
                for o in a.get("options") or []:
                    if o["id"] in ("prick", "lop", "spots", "labyrinth"):
                        self.assertNotEqual(o["word"], o["id"], f"{t['id']}.{a['id']}.{o['id']}")
        words = {o["id"]: o["word"] for t in PL.toys_of(S20) for a in t["axes"] for o in a.get("options") or []}
        self.assertEqual([words[k] for k in ("prick", "lop", "nub")], ["pointy", "floppy", "nub"])
        self.assertEqual([words[k] for k in ("spots", "labyrinth", "rings")], ["dots", "maze", "rings"])


class TestPictures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        S.write_spec(os.path.join(cls.sp, "S20.json"), S20)
        S.write_spec(os.path.join(cls.sp, "S71.json"), starter("S71", "Pemmi", **{"appearance.body-hue": 257.142857}))
        S.write_spec(os.path.join(cls.sp, "S72.json"), starter("S72", "Fennel", **{"appearance.body-hue": 360.0}))
        quad = copy.deepcopy(S20)
        quad["id"], quad["name"], quad["plan"] = "S22", "", "quadruped"
        quad["play"] = dict(starter=True, name="Moss")
        S.write_spec(os.path.join(cls.sp, "S22.json"), quad)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], plush_workers=0)         # not started: nothing is drawn, nothing is swept

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_a_starter_and_its_species_draw_the_same_picture_for_the_same_genome(self):
        a, b, c = (self.srv.picture(self.srv.species[i].spec, "set:appearance.body-hue=300") for i in ("S20", "S71", "S72"))
        self.assertEqual((a["key"], a["ready"]), (b["key"], False))
        self.assertEqual(b["key"], c["key"])
        self.assertNotEqual(self.srv.picture(self.srv.species["S20"].spec, "set:appearance.body-hue=200")["key"], a["key"])

    def test_the_warm_set_holds_the_walk_strip_and_not_the_idle_strip(self):
        sp = self.srv.species["S71"]
        k0 = self.srv.warm_key(sp.spec, "sweep")
        moved = copy.deepcopy(sp.spec)
        moved["motion"]["walk"]["period"] = 1.2
        self.assertNotEqual(self.srv.warm_key(moved, "sweep"), k0)                              # a new walk is a new warm set
        g = PL.state_genome(sp.spec)
        c = self.srv.clip_of(sp, copy.deepcopy(sp.spec), g, "walk", priority=3)
        job = next(j for j in self.srv.queue.jobs.values() if j.kind == "plush" and j.key == c["plush"]["key"])
        self.assertEqual((job.priority, job.args.get("clip")), (3, "walk"))                    # the warm set asks for it behind any player's job
        self.assertFalse(any(j.args.get("clip") == "idle" for j in self.srv.queue.jobs.values()))

    def test_toys_carry_each_steps_end_and_now_pictures(self):
        t = self.srv.toys(self.srv.species["S71"])
        tail = next(x for x in t["toys"] if x["id"] == "tail")
        st = tail["axes"][0]["steps"][3]
        self.assertEqual((len(st["end"]["key"]), st["end"]["ready"], st["now"]["genome"].startswith("set:")), (64, False, True))
        self.assertEqual((t["name"], t["species"]), ("Pemmi", "Tuliko"))
        self.assertNotEqual(tail["axes"][0]["steps"][2]["now"]["key"], tail["axes"][0]["steps"][3]["now"]["key"])

    def test_the_cushions_are_the_starters_and_a_plan_without_a_cage_builder_waits(self):
        got = {x["id"]: x for x in self.srv.starters()}
        self.assertEqual(sorted(got), ["S22", "S71", "S72"])
        self.assertEqual((got["S71"]["name"], got["S71"]["species"], got["S71"]["built"]), ("Pemmi", "Tuliko", True))
        self.assertEqual((got["S22"]["built"], got["S22"]["plush"]["key"], got["S22"]["warm"]), (False, None, None))
        self.assertTrue(self.srv.queue.find_active("S71", "plush", got["S71"]["plush"]["key"]))      # the cushion's picture is asked for at once

    def test_a_play_name_is_one_to_ten_letters(self):
        d = starter(name="Much too long a name")
        self.assertEqual(PL.validate(d)[0][0], "play.name")
        self.assertEqual(PL.mibi_name(starter(name="Pemmi")), "Pemmi")
        self.assertEqual(PL.validate(starter()), [])

    def test_the_sweep_and_the_warm_set_start_for_a_built_starter_only(self):
        self.assertIsNone(self.srv.play_start(self.srv.species["S22"]))
        self.assertIsNone(self.srv.play_start(self.srv.species["S20"]))


class TestStarterStart(unittest.TestCase):
    """A starter is made or kept: its sweep starts without anyone asking (chunk 13 left it manual), and the warm set follows."""
    def test_a_starter_file_on_the_shelf_and_one_dropped_in_later_both_start(self):
        import time
        root = os.path.join(BODY, "scratch", "t_bench_start")
        shutil.rmtree(root, ignore_errors=True)
        d = os.path.join(root, "species")
        os.makedirs(d)
        S.write_spec(os.path.join(d, "S20.json"), S20)
        S.write_spec(os.path.join(d, "S71.json"), starter("S71", "Pemmi"))
        srv = SV.Server(os.path.join(root, "home"), [d], plush_workers=0)
        srv.start()
        try:
            warm = lambda sid: [j for j in srv.queue.jobs.values() if j.kind == "warm" and j.species == sid]
            self.assertEqual(len(warm("S71")), 1)
            self.assertEqual(warm("S20"), [])                                      # a species that is not a starter is left alone
            S.write_spec(os.path.join(d, "S72.json"), starter("S72", "Fennel"))
            for _ in range(40):
                if warm("S72"):
                    break
                time.sleep(0.25)
            self.assertEqual(len(warm("S72")), 1)
            self.assertEqual(srv.warm_state(srv.species["S72"])["state"], "running")
            kept = srv.species["S20"]
            srv.patch_species("S20", [dict(op="add", path="/play", value=dict(starter=True, name="Kept"))], dict(name="t", role="maker"))      # a mibi kept as a starter
            self.assertEqual(len(warm("S20")), 1)
        finally:
            srv.stop()
            shutil.rmtree(root, ignore_errors=True)


class TestPlushSpeed(unittest.TestCase):
    def test_the_padded_atlas_is_the_whole_image_pass_to_the_bit(self):
        import numpy as np
        import s20tex as TX
        rng = np.random.RandomState(3)
        cov = np.zeros((64, 64), bool)
        cov[10:30, 8:40] = True
        cov[40:60, 50:64] = True                                              # touches the edge: the pass wraps there
        imgs = [rng.rand(64, 64, 3).astype(np.float32), rng.rand(64, 64, 1).astype(np.float32)]

        def whole(img, covered, n):
            img, cov = img.copy(), covered.copy()
            for _ in range(n):
                acc, cnt = np.zeros_like(img, dtype=np.float64), np.zeros(cov.shape, np.float64)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        sh = np.roll(np.roll(cov, dy, 0), dx, 1)
                        acc += np.where(sh[..., None], np.roll(np.roll(img, dy, 0), dx, 1), 0)
                        cnt += sh
                new = (~cov) & (cnt > 0)
                img[new] = (acc[new] / cnt[new, None]).astype(img.dtype)
                cov = cov | new
            return img, cov
        got, gcov = TX.pad_many(imgs, cov, 6)
        for g, i in zip(got, imgs):
            w, wcov = whole(i, cov, 6)
            self.assertTrue(np.array_equal(g, w))
            self.assertTrue(np.array_equal(gcov, wcov))

    def test_the_hero_draw_has_its_own_samples_and_the_goldens_keep_theirs(self):
        from wb import plushworker as PW
        import plush as PL
        self.assertEqual(PW.SAMPLES, 128)
        self.assertEqual(PL.SOFT_RENDER["samples"], 256)                       # this process never ran the worker's main


if __name__ == "__main__":
    unittest.main()
