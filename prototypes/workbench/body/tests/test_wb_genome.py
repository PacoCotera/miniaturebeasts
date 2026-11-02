"""Chunk 7: the genome block of the v1 file, the generic apply, the genome strings."""
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
        self.assertEqual((g["catalogue"]["id"], g["catalogue"]["version"]), (GA.pin()["id"], GA.pin()["version"]))
        self.assertEqual(len(g["loci"]), 53)
        self.assertEqual([c["id"] for c in g["chapters"]], ["body", "tail", "face", "coat", "movement"])
        self.assertTrue(all(e["chapter"] in {c["id"] for c in g["chapters"]} for e in g["loci"]))

    def test_the_file_is_what_the_generator_writes(self):
        from wb import make_genome_block as MG
        self.assertEqual(DOC["genome"], MG.block())

    def test_shared_loci_are_the_pin_and_keep_its_copy_rule(self):
        shared = [e for e in DOC["genome"]["loci"] if e["scope"] == "shared"]
        self.assertEqual(sorted(e["locus"] for e in shared), ["growth.exterior-eye-size-ratio", "movement.cycle-rate"])
        for e in shared:
            self.assertEqual(GA.copy_rule(e["catalogue"]["operator"]), "mixes")
            self.assertIsNotNone(GA.pin_locus(e["locus"]))
        own_in_pin = [e["locus"] for e in DOC["genome"]["loci"] if e["scope"] == "own" and GA.pin_locus(e["locus"])]
        self.assertTrue(all(locus(DOC, i).get("pin_note") for i in own_in_pin))                 # a locus that shares an id with the pin says why it is the species' own

    def test_five_broken_blocks_name_their_field(self):
        def limits(d): locus(d, "body.tail-length")["limits"][1] = 2.5
        def path(d): locus(d, "body.tail-length")["moves"][0]["path"] = "spine.tail.segments[1:5].lenght"
        def kind(d): locus(d, "body.tail-length")["kind"] = "dominant"
        def pin(d): d["genome"]["catalogue"]["version"] = 3
        def shared(d): locus(d, "growth.exterior-eye-size-ratio").update(limits=[0.5, 1.9], range=[0.4, 2.0])
        def nothing(d): locus(d, "body.tip-size").pop("consumer")
        self.assertEqual(broken(limits)[0][0], "genome.loci[body.tail-length].limits")
        self.assertIn("outside the range 0.5 to 2", broken(limits)[0][1])
        self.assertEqual(broken(path), [("genome.loci[body.tail-length].moves[0].path", "genome.loci[body.tail-length].moves[0].path: 'spine.tail.segments[1:5].lenght' does not resolve in the file")])
        self.assertEqual(broken(kind)[0][0], "genome.loci[body.tail-length].kind")
        self.assertIn("a frame is valid only against its pin", broken(pin)[0][1])
        self.assertIn("outside the catalogue range 0.24 to 0.44", broken(shared)[0][1])
        self.assertEqual(broken(nothing)[0][0], "genome.loci[body.tip-size].moves")

    def test_a_blend_that_leaves_its_type_or_range_is_refused(self):
        def typ(d): locus(d, "body.tail-length")["type"] = 1.9
        def form(d): locus(d, "body.tail-length")["limits"] = [1.1, 1.3]
        self.assertIn("lies outside the limits", broken(typ)[0][1])
        def mult(d): locus(d, "body.tail-length")["limits"] = [0.5, 0.9]
        self.assertTrue(any("a mult locus needs" in m for _, m in broken(mult)))
        self.assertIn("lies outside the limits 1.1 to 1.3", broken(form)[0][1])


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


class TestGenomeStrings(unittest.TestCase):
    def test_low_high_value_allele_corner(self):
        spec = F.internal(DOC)
        lo, hi = F.resolve_genome("low:body.tail-length", spec), F.resolve_genome("high:body.tail-length", spec)
        self.assertEqual((lo["t"]["body.tail-length"], hi["t"]["body.tail-length"]), (0.0, 1.0))
        c = GN.creature(hi, F.tables(spec))
        self.assertAlmostEqual(c["shape"]["tailLen"], 1.3)
        v = F.resolve_genome("value:body.tail-length=1.19", spec)
        self.assertAlmostEqual(GN.creature(v, F.tables(spec))["shape"]["tailLen"], 1.19, places=6)
        self.assertEqual(F.resolve_genome("allele:body.ear-family=nub", spec)["pairs"]["body.ear-family"], ["nub", "nub"])
        self.assertTrue(F.resolve_genome("corner:glow+brow", spec)["switches"]["brow"])
        for bad, word in (("low:nope", "no blend locus 'nope'"), ("allele:body.ear-family=frond", "not an allowed allele"), ("corner:sparkle", "loud genes are"), ("value:body.tail-length=x", "needs a number")):
            with self.assertRaises(F.BuildError) as cm:
                F.resolve_genome(bad, spec)
            self.assertIn(word, cm.exception.message)

    def test_the_files_limits_are_what_t_means(self):
        d = copy.deepcopy(DOC)
        locus(d, "body.tail-length")["limits"][1] = 1.2
        spec = F.internal(d)
        c = GN.creature(F.resolve_genome("high:body.tail-length", spec), F.tables(spec))
        self.assertAlmostEqual(c["shape"]["tailLen"], 1.2)
        self.assertNotEqual(F.cage_key(d, "type"), F.cage_key(DOC, "type"))                       # a limit is an input of the cage's key


if __name__ == "__main__":
    unittest.main()
