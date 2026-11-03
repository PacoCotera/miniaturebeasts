"""Chunk 7 (and the pin 11 fix, W7): the genome block of the v1 file, the generic apply, the sampler adapter, the genome selectors."""
import copy
import json
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import genomeapply as GA
import s20genes as GN
import species_v1 as V1
from wb import facade as F

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
TWELVE = json.load(open(os.path.join(BODY, "tests", "fixtures", "wb_s20_twelve.json")))["hashes"]


def broken(fn):
    d = copy.deepcopy(DOC)
    fn(d)
    return GA.validate(d)


def locus(d, name):
    return next(e for e in d["genome"]["loci"] if e["locus"] == name)


class TestBlock(unittest.TestCase):
    def test_s20_block_is_valid_and_pinned(self):
        self.assertEqual(V1.validate(DOC), [])
        g = DOC["genome"]
        self.assertEqual((g["catalogue"]["id"], g["catalogue"]["version"], g["catalogue"]["digest"]), (GA.pin()["id"], GA.pin()["version"], GA.pin()["digest"]))
        self.assertEqual(len(g["loci"]), 54)
        self.assertEqual([c["id"] for c in g["chapters"]], ["coat", "face", "shape", "legs-tail", "movement"])
        self.assertTrue(all(e["chapter"] in {c["id"] for c in g["chapters"]} for e in g["loci"]))
        # the chapters are in ring order: a chapter's loci are together, in the chapters' order
        order = [c["id"] for c in g["chapters"]]
        self.assertEqual([e["chapter"] for e in g["loci"]], sorted((e["chapter"] for e in g["loci"]), key=order.index))

    def test_the_block_validates_against_pin_11_and_has_no_own(self):
        g = DOC["genome"]
        self.assertEqual(GA.pin()["version"], 11)
        self.assertEqual(GA.validate(DOC), [])
        self.assertTrue(all(GA.pin_locus(e["locus"]) is not None for e in g["loci"]))               # every locus is a record of the pin
        self.assertFalse(any(e.get("scope") == "own" or "pin_note" in e or "anchor" in e for e in g["loci"]))
        self.assertTrue(all(e["scope"] in ("trunk", "branch") for e in g["loci"]))
        self.assertNotIn("appearance.body-hue-shift", [e["locus"] for e in g["loci"]])             # the hue shift is folded into the hue copy
        self.assertIn("appearance.marking-rosette", [e["locus"] for e in g["loci"]])
        self.assertIn("anatomy.whisker-presence", [e["locus"] for e in g["loci"]])
        self.assertEqual([e["locus"] for e in g["loci"] if e["scope"] == "branch"], ["appearance.freckle-glow", "appearance.lantern-bleed", "appearance.glow-pattern", "appearance.whisker-glow", "anatomy.brow-tuft-presence", "anatomy.tail-tip-form"])

    def test_the_file_is_what_the_generator_writes(self):
        from wb import make_genome_block as MG
        self.assertEqual(DOC["genome"], MG.block())

    def test_continuous_loci_carry_a_band_and_the_three_absolute_records_do_not(self):
        for e in DOC["genome"]["loci"]:
            if e["op"] != "blend":
                continue
            if e["locus"] in ("appearance.sheen", "appearance.emission-brightness", "movement.cycle-rate"):
                self.assertNotIn("band", e, e["locus"])
                self.assertIn("absolute", e)
            else:
                self.assertEqual(sorted(e["band"]), ["form", "hi", "lo", "unit"], e["locus"])

    def test_a_sleeping_locus_names_what_wakes_it(self):
        sleeping = {e["locus"]: e for e in DOC["genome"]["loci"] if e["kind"] == "sleeping"}
        self.assertEqual(sleeping["form.whisker-length"]["requires"], ["anatomy.whisker-presence"])
        self.assertEqual(sleeping["appearance.marking-rosette"]["wakesWhen"], {"appearance.marking-layout": ["spotted"]})
        self.assertNotIn("form.eye-size", sleeping)                                               # the eyes' own switch is locked on by the frame

    def test_the_three_absolute_records_store_the_records_number(self):
        for i, (lo, hi) in (("movement.cycle-rate", (0.85, 1.15)), ("appearance.sheen", (0.2, 0.4)), ("appearance.emission-brightness", (0.6, 1.0))):
            a = locus(DOC, i)["absolute"]
            self.assertEqual((a["lo"], a["hi"]), (lo, hi))
        g = GN.genome_of(GN.draw(3))
        self.assertIsInstance(g["movement.cycle-rate"][0], float)
        self.assertTrue(0.85 <= g["movement.cycle-rate"][0] <= 1.15)

    def test_broken_blocks_name_their_field(self):
        def own(d): locus(d, "form.tail-length")["scope"] = "own"
        def off_pin(d): locus(d, "form.tail-length")["locus"] = "body.tail-length"
        def twice(d): d["genome"]["loci"].append(copy.deepcopy(locus(d, "form.ear-length")))
        def two_looks(d):
            loc = copy.deepcopy(locus(d, "form.ear-kind")); loc["locus"] = "anatomy.auricular-form"; d["genome"]["loci"].append(loc)
        def no_clan(d): d["genome"].pop("clan")
        def no_borrow(d): d["genome"]["borrows"] = []
        def switch(d): locus(d, "appearance.blush").pop("operator")
        def band(d): locus(d, "form.tail-length").pop("band")
        def limits(d): locus(d, "form.tail-length")["band"]["hi"] = 2.5
        def path(d): locus(d, "form.tail-length")["moves"][0]["path"] = "spine.tail.segments[1:5].lenght"
        def kind(d): locus(d, "form.tail-length")["kind"] = "dominant"
        def pin(d): d["genome"]["catalogue"]["version"] = 3
        def nothing(d): locus(d, "form.tail-tip-size").pop("consumer")
        def asleep(d): locus(d, "form.whisker-length")["kind"] = "heritable-look"
        self.assertEqual(broken(own)[0][0], "genome.loci[form.tail-length].scope")
        self.assertIn("not a record of the catalogue pin", broken(off_pin)[0][1])
        self.assertIn("appears twice", [m for _, m in broken(twice) if "twice" in m][0])
        self.assertIn("one record per look", [m for _, m in broken(two_looks) if "one record per look" in m][0])
        self.assertIn("does not borrow it", broken(no_borrow)[0][1])
        self.assertEqual(broken(no_clan)[0][0], "genome.loci[appearance.freckle-glow].scope")
        self.assertIn("names its catalogue operator", broken(switch)[0][1])
        self.assertIn("carries a band", broken(band)[0][1])
        self.assertIn("outside the range 0.5 to 2", broken(limits)[0][1])
        self.assertEqual(broken(path), [("genome.loci[form.tail-length].moves[0].path", "genome.loci[form.tail-length].moves[0].path: 'spine.tail.segments[1:5].lenght' does not resolve in the file")])
        self.assertEqual(broken(kind)[0][0], "genome.loci[form.tail-length].kind")
        self.assertIn("a frame is valid only against its pin", broken(pin)[0][1])
        self.assertEqual(broken(nothing)[0][0], "genome.loci[form.tail-tip-size].moves")
        self.assertEqual(broken(asleep)[0][0], "genome.loci[form.whisker-length].kind")

    def test_a_blend_that_leaves_its_type_or_range_is_refused(self):
        def typ(d): locus(d, "form.tail-length")["type"] = 1.9
        def form(d): locus(d, "form.tail-length")["band"].update(lo=1.1, hi=1.3)
        self.assertIn("lies outside the band", broken(typ)[0][1])
        def mult(d): locus(d, "form.tail-length")["band"].update(lo=0.5, hi=0.9)
        self.assertTrue(any("a mult locus needs" in m for _, m in broken(mult)))
        self.assertIn("lies outside the band 1.1 to 1.3", broken(form)[0][1])


class TestApply(unittest.TestCase):
    def test_the_generic_apply_gives_what_apply_shape_gave_for_the_twelve(self):
        spec = V1.to_internal(DOC)
        for i in range(1, 13):
            c = GN.creature(GN.draw(i), F.tables(spec))
            a, b = GN.apply_shape(spec, dict(c["shape"])), GN.apply_genes(DOC, dict(c["shape"]), c["coat"])
            fam = a["parts"]["ear.L"]["default"]
            for part in ("tail", "torso", "leg.L"):
                self.assertEqual(a["parts"][part], b["parts"][part], f"individual {i}, {part}")
            self.assertEqual(a["parts"]["ear.L"]["families"][fam], b["parts"]["ear.L"]["families"][fam], f"individual {i}, ear")

    def test_the_twelve_cages_are_the_baseline(self):
        for i in (1, 2, 8, 12):
            self.assertEqual(F.build(DOC, f"seed:{i}").cage_hash, TWELVE[str(i)], f"individual {i}")

    def test_a_move_scales_adds_and_sets(self):
        d = V1.materialise(DOC)
        e = dict(type=1.0)
        GA.apply_move(d, e, dict(path="parts[leg.L].chain[*].len", op="scale"), 1.5)
        self.assertAlmostEqual(d["parts"][0]["chain"][0]["len"], 0.2 * 1.5)
        GA.apply_move(d, dict(type=0.0), dict(path="spine.tail.segments[*].pitch", op="add", share=-1.0), 10.0)
        self.assertEqual(d["spine"]["tail"]["segments"][0]["pitch"], 170.0)
        GA.apply_move(d, dict(type="prick", map={}), dict(path="parts[ear.L].default", op="set"), "nub")
        self.assertEqual(next(p for p in d["parts"] if p["id"] == "ear.L")["default"], "nub")
        self.assertEqual(len(GA.targets(d, "parts[leg.L].chain[1:].len")), 2)
        self.assertEqual(GA.targets(d, "spine.nothing.here"), [])


    def test_a_scale_move_is_the_value_over_the_type(self):
        d = V1.materialise(DOC)
        GA.apply_move(d, dict(type=2.0), dict(path="parts[leg.L].chain[*].len", op="scale"), 3.0)
        self.assertAlmostEqual(d["parts"][0]["chain"][0]["len"], 0.2 * 1.5)


class TestAdapter(unittest.TestCase):
    def test_every_individual_becomes_two_copies_per_record(self):
        ids = [e["locus"] for e in DOC["genome"]["loci"]]
        for i in range(1, 13):
            g = GN.genome_of(GN.draw(i))
            self.assertEqual(sorted(g), sorted(ids), f"individual {i}")
            self.assertTrue(all(len(c) == 2 for c in g.values()))
            for e in DOC["genome"]["loci"]:
                for c in g[e["locus"]]:
                    if e["op"] == "pair-map":
                        self.assertIn(c, e["limits"], f"{i} {e['locus']}")
                    elif e["op"] == "switch":
                        self.assertIn(c, ("off", "on"))

    def test_the_hue_shift_is_folded_into_the_hue_copy(self):
        ind = GN.draw(5)
        want = (ind["t"]["appearance.body-hue"] + ind["t"]["coat.hue-shift"]) % 1.0
        self.assertAlmostEqual(GN.genome_of(ind)["appearance.body-hue"][0], want, places=5)

    def test_no_whiskers_is_the_switch_off_and_the_sleepers_at_between(self):
        g = GN.genome_of(GN.draw(1))
        self.assertEqual(g["anatomy.whisker-presence"], ["off", "off"])
        self.assertEqual([g[r][0] for r in ("form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl")], ["between"] * 4)
        g = GN.genome_of(GN.draw(3))                          # a count of 0.7 of 0..3: two a side
        self.assertEqual(g["anatomy.whisker-presence"], ["on", "on"])
        self.assertNotEqual(g["form.whisker-length"][0], "between")

    def test_a_plain_marking_is_the_switch_off_with_a_layout_copy(self):
        ind = GN.draw(2)
        for pair, switch, layout in ((["plain", "plain"], ["off", "off"], ["bands", "bands"]), (["plain", "spotted"], ["off", "off"], ["spotted", "spotted"]), (["banded", "capped"], ["on", "on"], ["bands", "capped"])):
            ind["pairs"]["appearance.marking-layout"] = pair
            g = GN.genome_of(ind)
            self.assertEqual((g["appearance.marking-switch"], g["appearance.marking-layout"]), (switch, layout))

    def test_booleans_pairs_and_the_type(self):
        g = GN.genome_of(GN.draw(1))
        self.assertEqual(g["appearance.blush"], ["on", "on"])
        self.assertEqual(g["anatomy.fang-presence"], ["off", "off"])
        self.assertEqual(g["form.tail-length"], ["between", "between"])                 # the type: every shape blend is a bin exactly
        g3 = GN.genome_of(GN.draw(3))
        self.assertEqual(g3["anatomy.fang-presence"], ["on", "on"])

    def test_the_sampler_stream_is_the_same(self):
        self.assertEqual(GN.draw(7)["seed"], GN.draw(7)["seed"])
        self.assertEqual(json.dumps(GN.draw(2), sort_keys=True)[:60], json.dumps(GN.draw(2), sort_keys=True)[:60])


class TestGenomeSelectors(unittest.TestCase):
    def test_low_high_value_allele_corner(self):
        spec = F.internal(DOC)
        lo, hi = F.resolve_genome("low:form.tail-length", spec), F.resolve_genome("high:form.tail-length", spec)
        self.assertEqual((lo["t"]["body.tail-length"], hi["t"]["body.tail-length"]), (0.0, 1.0))               # the sampler's own id inside the individual
        c = GN.creature(hi, F.tables(spec))
        self.assertAlmostEqual(c["shape"]["tailLen"], 1.3)
        v = F.resolve_genome("value:form.tail-length=1.19", spec)
        self.assertAlmostEqual(GN.creature(v, F.tables(spec))["shape"]["tailLen"], 1.19, places=6)
        self.assertEqual(F.resolve_genome("allele:form.ear-kind=nub", spec)["pairs"]["body.ear-family"], ["nub", "nub"])
        self.assertTrue(F.resolve_genome("corner:glow+brow", spec)["switches"]["brow"])
        for bad, word in (("low:nope", "no blend locus 'nope'"), ("allele:form.ear-kind=frond", "not an allowed allele"), ("corner:sparkle", "loud genes are"), ("value:form.tail-length=x", "needs a number")):
            with self.assertRaises(F.BuildError) as cm:
                F.resolve_genome(bad, spec)
            self.assertIn(word, cm.exception.message)

    def test_the_files_limits_are_what_t_means(self):
        d = copy.deepcopy(DOC)
        locus(d, "form.tail-length")["band"]["hi"] = 1.2
        spec = F.internal(d)
        c = GN.creature(F.resolve_genome("high:form.tail-length", spec), F.tables(spec))
        self.assertAlmostEqual(c["shape"]["tailLen"], 1.2)
        self.assertNotEqual(F.cage_key(d, "type"), F.cage_key(DOC, "type"))                       # a limit is an input of the cage's key


if __name__ == "__main__":
    unittest.main()
