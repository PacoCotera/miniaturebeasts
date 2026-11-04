"""Chunk 10: the Variety sheet. The rules in the species file (n, seed, cycle, loud limit, species rules as data), the look counts, a broken rule, the cached tiles and the run before. No Blender: the server has no workers."""
import copy
import json
import os
import shutil
import sys
import unittest
import urllib.request

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

from wb import variety as VY, server as SV, store as S, keys as K, facade as F, hashing as H
import genomeapply as GA
import s20genes as GN

S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_variety")


def look_row(sh, locus, look):
    return next(r for r in sh["looks"] if r["locus"] == locus and r["look"] == look)


class TestRules(unittest.TestCase):
    def test_the_file_carries_its_rules(self):
        v = S20["variety"]
        self.assertEqual((v["n"], v["seed"], v["max_loud"]), (12, 2026, 2))
        self.assertEqual([r["id"] for r in v["species_rules"]], ["ember"])
        self.assertEqual(VY.validate(S20), [])

    def test_the_twelve_are_the_old_twelve(self):
        sh = VY.sheet(S20)
        self.assertEqual([i["genome"] for i in sh["individuals"]], [f"seed:{i}" for i in range(1, 13)])
        self.assertEqual([i["hue"] for i in sh["individuals"]][:3], [270.0, 314.237, 323.39])
        self.assertEqual(sh["failing"], [])

    def test_counts_on_the_sheet(self):
        sh = VY.sheet(S20)
        tip = {r["look"]: r["count"] for r in sh["looks"] if r["locus"] == "anatomy.tail-tip-form"}
        self.assertEqual(tip, {"lantern": 9, "tuft": 2, "plain": 1})
        ear = {r["look"]: r["count"] for r in sh["looks"] if r["locus"] == "form.ear-kind"}
        self.assertEqual(sum(ear.values()), 12)
        self.assertEqual(look_row(sh, "anatomy.tail-tip-form", "lantern")["who"], [1, 2, 3, 5, 6, 8, 9, 11, 12])

    def test_a_look_is_named_by_what_you_see_and_the_trait_is_the_subtitle(self):
        sh = VY.sheet(S20)
        names = {r["id"]: (r["label"], r["short"], r["trait"]) for r in sh["looks"]}
        self.assertEqual(names["form.ear-kind=prick"], ("Pointy ears", "pointy", "Ear shape"))
        self.assertEqual(names["form.ear-kind=lop"], ("Floppy ears", "floppy", "Ear shape"))
        self.assertEqual(names["appearance.marking-layout=masked"], ("Pale muzzle", "muzzle", "Markings"))
        self.assertEqual(names["appearance.marking-layout=capped"], ("Head cap", "cap", "Markings"))
        self.assertEqual(names["appearance.pattern-kind=labyrinth"], ("Maze pattern", "maze", "Pattern"))
        self.assertEqual(names["appearance.glow-pattern=belly-arcs"], ("Belly arcs", "belly arcs", "Glow pattern"))
        self.assertFalse([r["label"] for r in sh["looks"] if " · " in r["label"] or r["label"].startswith("Prick")])
        self.assertEqual(len({r["label"][:2] for r in sh["looks"]}), len(sh["looks"]), "the rail's two letters differ for every look")

    def test_wild_and_cross_columns(self):
        sh = VY.sheet(S20)
        r = look_row(sh, "anatomy.tail-tip-form", "lantern")
        self.assertAlmostEqual(r["wild"], 93.9, delta=0.2)             # the pool's own odds: 0.75 + 0.2 * 0.75 of the pairs show the first-ranked look
        self.assertEqual(r["cross_of"], 4)
        self.assertEqual(round(r["cross"] * r["cross_of"] / 100), 4)
        self.assertEqual(sh["wild_n"], 1000)

    def test_a_new_sheet_is_another_draw(self):
        b = VY.sheet(S20, seed=7)
        self.assertEqual(b["seed"], 7)
        self.assertEqual(b["individuals"][1]["genome"], "seed:2@7")
        self.assertEqual(b["individuals"][0]["genome"], "seed:1@7")
        self.assertNotEqual(GN.draw(5, 2026), GN.draw(5, 7))
        self.assertEqual(VY.sheet(S20, n=6)["n"], 6)

    def test_the_selector_builds_the_same_individual(self):
        spec = F.internal(S20)
        for sel, i, sd in (("seed:3", 3, 2026), ("seed:3@7", 3, 7)):
            self.assertEqual(F.resolve_genome(sel, spec), GN.draw(i, sd))

    def test_the_ember_rule_is_data_and_can_break(self):
        doc = copy.deepcopy(S20)
        doc["variety"]["species_rules"][0]["then"] = [{"field": "tip", "not": "lantern"}]            # a stricter file: a warm hue needs an unlit tip
        sh = VY.sheet(doc)
        self.assertEqual(sh["failing"], [i for i in range(1, 13) if 10 <= sh["individuals"][i - 1]["hue"] <= 35 and sh["individuals"][i - 1]["looks"]["anatomy.tail-tip-form"] == "lantern"])
        doc["variety"]["species_rules"][0]["when"] = [{"field": "hue", "in": [0, 360]}]               # every hue now needs an unlit tip: the nine with a lantern break it
        sh = VY.sheet(doc)
        self.assertEqual(sh["failing"], [1, 2, 3, 5, 6, 8, 9, 11, 12])
        self.assertEqual(sh["individuals"][0]["fails"][0], dict(rule="ember", label="Ember rule", words="lantern on a warm coat with a light belly"))
        self.assertEqual(sh["rules"][0]["broken"], sh["failing"])

    def test_the_loud_limit_is_the_files(self):
        doc = copy.deepcopy(S20)
        doc["variety"]["max_loud"] = 1
        sh = VY.sheet(doc)
        two = [i["n"] for i in sh["individuals"] if len(i["loud"]) == 2]
        self.assertTrue(two)
        self.assertEqual(sh["failing"], two)
        self.assertEqual(sh["individuals"][two[0] - 1]["fails"][0], dict(rule="loud", label="Loud traits", words="2 loud traits, limit 1"))

    def test_the_conditions(self):
        f = dict(hue=20.0, tip="lantern", belly="light")
        self.assertTrue(VY.holds({"field": "hue", "in": [10, 35]}, f))
        self.assertFalse(VY.holds({"field": "hue", "in": [30, 35]}, f))
        self.assertTrue(VY.holds({"any": [{"field": "belly", "is": "dark"}, {"field": "tip", "is": "lantern"}]}, f))
        self.assertFalse(VY.holds({"field": "missing", "is": "x"}, f))
        self.assertTrue(VY.broken(dict(when=[{"field": "hue", "in": [10, 35]}], then=[{"field": "belly", "is": "dark"}]), f))
        self.assertFalse(VY.broken(dict(when=[{"field": "hue", "in": [100, 200]}], then=[{"field": "belly", "is": "dark"}]), f))

    def test_the_validator_names_the_field(self):
        doc = copy.deepcopy(S20)
        doc["variety"]["n"] = 0
        doc["variety"]["cycle"].append("no.such")
        doc["variety"]["species_rules"][0]["fail"] = ""
        doc["variety"]["species_rules"][0]["then"] = [{"field": "belly"}]
        doc["variety"]["species_rules"].append(dict(id="ember", when=[], then=[], fail="x"))
        paths = [p for p, _ in VY.validate(doc)]
        for want in ("variety.n", "variety.cycle[5]", "variety.species_rules[0].fail", "variety.species_rules[0].then[0]", "variety.species_rules[1].id", "variety.species_rules[1].when"):
            self.assertIn(want, paths)
        self.assertTrue(any(m.startswith("variety.n:") for _, m in GA.validate(doc)))      # the file's validator carries them, each message naming its field

    def test_a_file_with_no_variety_block_uses_the_defaults(self):
        doc = copy.deepcopy(S20)
        del doc["variety"]
        sh = VY.sheet(doc)
        self.assertEqual((sh["n"], sh["seed"]), (12, 2026))
        self.assertEqual(sh["looks"], [])


class TestSheetServer(unittest.TestCase):
    """The sheet's numbers, the tile keys and the run before, through the server (no workers: the tiles are put in the cache by hand)."""
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        cls.file = os.path.join(cls.sp, "S20.json")
        S.write_spec(cls.file, S20)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def setUp(self):
        if os.path.exists(self.srv.runs_path()):
            os.remove(self.srv.runs_path())

    def get(self, path):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.srv.port}{path}") as r:
            return json.load(r)

    def fake_run(self, sp, seed):
        """What a finished run leaves: the tiles in the cache and the record."""
        sh = VY.sheet(sp.spec, None, seed)
        tiles = []
        for i in sh["individuals"]:
            keys = self.srv.tile_keys(sp.spec, i["genome"])
            for k in keys.values():
                self.srv.cas.put_bytes(k, "png", b"png")
            tiles.append(dict(n=i["n"], genome=i["genome"], keys=keys, fails=[]))
        run = dict(key=self.srv.variety_run_key(sp.hash, sh["n"], sh["seed"]), t="2026-11-04T00:00:00", spec_hash=sp.hash, n=sh["n"], seed=sh["seed"], tiles=tiles, failing=[])
        self.srv.save_run(sp.id, run)
        return run

    def test_the_data_and_the_tile_keys(self):
        d = self.get("/api/species/S20/variety?seed=99")
        self.assertEqual((d["n"], d["seed"], d["ran"], d["previous"]), (12, 99, False, None))
        t = d["individuals"][3]["tiles"]
        self.assertEqual(sorted(t), ["304", "48", "96"])
        self.assertFalse(any(x["ready"] for x in t.values()))
        ck = K.cage_key(S20, "seed:4@99")
        self.assertEqual(t["304"]["key"], K.frame_key(ck, "clay", 32, 304))

    def test_a_cached_run_answers_at_once_and_the_previous_run_is_the_last_of_another_file_or_seed(self):
        sp = self.srv.get_species("S20")
        r1 = self.fake_run(sp, 2026)
        d = self.get("/api/species/S20/variety")
        self.assertTrue(d["ran"])
        self.assertTrue(all(x["ready"] for i in d["individuals"] for x in i["tiles"].values()))
        self.assertIsNone(d["previous"])                                  # the only run is this one
        job = self.srv.submit_variety(sp, {}, None)
        self.assertEqual((job.state, job.cached), ("done", True))
        self.assertEqual(job.result["key"], r1["key"])
        self.fake_run(sp, 7)                                              # a second sheet, another seed
        d7 = self.get("/api/species/S20/variety?seed=7")
        self.assertEqual(d7["seed"], 7)
        self.assertEqual(d7["previous"]["seed"], 2026)                    # side by side: the run before
        self.assertEqual(self.get("/api/species/S20/variety")["previous"]["seed"], 7)
        self.assertEqual(len(self.srv.runs_of("S20")), 2)

    def test_the_runs_survive_a_second_save_of_the_same_run(self):
        sp = self.srv.get_species("S20")
        self.fake_run(sp, 2026); self.fake_run(sp, 2026)
        self.assertEqual(len([r for r in self.srv.runs_of("S20") if r["seed"] == 2026]), 1)


if __name__ == "__main__":
    unittest.main()
