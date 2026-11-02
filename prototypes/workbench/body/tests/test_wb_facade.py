"""Workbench chunk 1: the facade builds S20 exactly as the framework does (one real build, about 16 s). The baseline file is S20's type cage hash at the start of the workbench; change it only when the S20 cage is meant to change."""
import os, sys, json, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20genes as GN
from wb import facade as F, hashing as H

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(os.path.dirname(HERE), "species", "S20.json")))
BASE = json.load(open(os.path.join(HERE, "fixtures", "wb_s20_baseline.json")))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = F.build(SPEC, "type", "base")

    def test_type_cage_hash_is_the_baseline(self):
        self.assertEqual(self.r.cage_hash, BASE["type_cage_hash"])
        self.assertEqual(self.r.vertices, BASE["type_cage_vertices"])

    def test_the_facade_is_the_framework_build_bit_for_bit(self):
        c = GN.creature(GN.specimen())
        b = GN.build_individual(SPEC, c)
        self.assertEqual(H.cage_hash(b), self.r.cage_hash)

    def test_every_stage_is_timed_and_the_s20_functions_are_put_back(self):
        T_ = self.r.timings_ms
        for k in ("genome", "validate", "cage", "hash", "total", "cage.loft", "cage.limit_fix", "cage.junctions", "cage.relax"):
            self.assertIn(k, T_)
            self.assertGreaterEqual(T_[k], 0)
        import s20build, relax
        self.assertEqual(s20build.limit_fix.__name__, "limit_fix")
        self.assertEqual(relax.tangential_relax.__name__, "tangential_relax")

    def test_the_key_follows_the_cage_inputs_not_the_coat(self):
        k0 = F.cage_key(SPEC, "type")
        self.assertEqual(k0, self.r.key)
        ind = GN.specimen(); ind["t"]["appearance.body-hue"] = 0.9           # a palette gene
        self.assertEqual(F.cage_key(SPEC, ind), k0)
        ind = GN.specimen(); ind["t"]["body.tail-length"] = 0.9
        self.assertNotEqual(F.cage_key(SPEC, ind), k0)
        sp = json.loads(json.dumps(SPEC)); sp["parts"]["tail"]["joints"][2]["len"] += 0.05
        self.assertNotEqual(F.cage_key(sp, "type"), k0)
        self.assertNotEqual(F.cage_key(SPEC, "type", "tubes"), k0)

    def test_genome_strings(self):
        self.assertEqual(F.resolve_genome("type")["seed"], 20)
        self.assertEqual(F.resolve_genome("low:body.tail-length")["t"]["body.tail-length"], 0.0)
        self.assertEqual(F.resolve_genome("high:body.tail-length")["t"]["body.tail-length"], 1.0)
        for bad in ("seed:x", "low:nope", "wide"):
            with self.assertRaises(F.BuildError):
                F.resolve_genome(bad)

    def test_a_bad_stage_and_a_bad_file_are_build_errors(self):
        with self.assertRaises(F.BuildError):
            F.build(SPEC, "type", "nope")
        sp = json.loads(json.dumps(SPEC)); del sp["parts"]["tail"]
        with self.assertRaises(F.BuildError):
            F.build(sp, "type", "loft")


if __name__ == "__main__":
    unittest.main()
