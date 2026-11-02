"""Workbench chunk 6: the species file schema mb-species/1. The converter is exact (S20.json -> v1 -> S20.json is the same file), the v1 file builds the same cage (hash and cache key), the validator's messages name the field,
`wb set` takes the schema's paths (spine.tail.length) and the edit reaches the build, and a file edit that breaks the schema is refused with its field."""
import copy, json, os, sys, shutil, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import species_v1 as V
from wb import facade as F, server as SV, store as S, cli

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = json.load(open(os.path.join(BODY, "tests", "fixtures", "wb_s20_baseline.json")))
V0 = json.load(open(os.path.join(BODY, "species", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_schema")


def broken(fn):
    d = copy.deepcopy(V.from_internal(V0))
    fn(d)
    return V.validate(d)


class TestConverter(unittest.TestCase):
    def test_s20_round_trips_exactly_and_the_committed_v1_file_is_the_conversion(self):
        v1 = V.from_internal(V0)
        self.assertEqual(V.validate(v1), [])
        back = V.to_internal(v1)
        self.assertEqual(back.pop("genome"), v1["genome"])                                       # the typed genome block travels with the file the cage builder reads
        self.assertEqual(back, V0)
        self.assertEqual(list(back), list(V0))
        self.assertEqual(list(back["parts"]), list(V0["parts"]))                                    # the part order is the cage's part ids
        self.assertEqual(json.load(open(os.path.join(BODY, "species_v1", "S20.json"))), v1)

    def test_v1_builds_the_same_cage_and_shares_its_cache_key(self):
        v1 = V.from_internal(V0)
        r1, r0 = F.build(v1, "type", "base"), F.build(V0, "type", "base")
        self.assertEqual(r1.cage_hash, BASE["type_cage_hash"])
        self.assertEqual((r1.cage_hash, r1.vertices), (r0.cage_hash, r0.vertices))
        self.assertNotEqual(F.cage_key(v1, "type"), F.cage_key(V0, "type"))                      # the file's limits are cage inputs, so the keys differ; the cages do not
        r12 = F.build(v1, "seed:7", "base")
        self.assertEqual(r12.cage_hash, F.build(V0, "seed:7", "base").cage_hash)

    def test_length_edits_the_tail_and_back_again(self):
        v1 = V.from_internal(V0)
        v1["spine"]["tail"]["length"] = 1.4
        d = V.to_internal(v1)
        lens = [j["len"] for j in d["parts"]["tail"]["joints"][1:]]
        self.assertAlmostEqual(sum(lens), 1.4, places=6)
        self.assertNotEqual(F.cage_key(v1, "type"), F.cage_key(V0, "type"))
        v1["spine"]["tail"]["length"] = 1.25
        back = V.to_internal(v1)
        back.pop("genome")
        self.assertEqual(back, V0)


class TestMessages(unittest.TestCase):
    """The five broken files of the done-picture, each message naming its field."""
    def test_a_field_that_is_not_listed_is_rejected_with_a_suggestion(self):
        def f(d):
            d["spine"]["tial"] = d["spine"].pop("tail")
        e = broken(f)
        self.assertIn(("spine.tial", "spine.tial: not a field of mb-species/1 (did you mean spine.tail?); fields that are not listed are rejected"), e)
        self.assertEqual(e[0][0], "spine.tail")

    def test_a_wrong_type_names_what_it_got(self):
        def f(d):
            d["spine"]["tail"]["length"] = "1.2"
        self.assertEqual(broken(f), [("spine.tail.length", "spine.tail.length: must be a number, got text")])

    def test_a_number_outside_the_plans_band(self):
        def f(d):
            d["spine"]["tail"]["root"] = 0.9
        self.assertEqual(broken(f), [("spine.tail.root", "spine.tail.root is 0.9 × seat, outside the biped plan's band 0.1 to 0.45")])

    def test_a_socket_without_its_join(self):
        def f(d):
            del next(p for p in d["parts"] if p["id"] == "ear.L")["socket"]["join"]
        e = broken(f)
        self.assertEqual(e[0][0], "parts.ear.L.socket.join")
        self.assertTrue(e[0][1].startswith("parts.ear.L.socket.join: missing (it is required: Hard: a separate shell sunk in."))

    def test_ranges_in_the_wrong_order(self):
        def f(d):
            r = d["spine"]["ranges"]
            r[1], r[2] = r[2], r[1]
        self.assertEqual(broken(f), [("spine.ranges", "spine.ranges: the biped plan's ranges are head, neck, back, seat, tail in that order, got head, back, neck, seat, tail")])

    def test_more_rules(self):
        self.assertEqual(broken(lambda d: d["anchors"].update(body="wide"))[0][1], "anchors.body: body and face are always tight, got 'wide'")
        self.assertEqual(broken(lambda d: d.update(schema="mb-species/2")), [("schema", "schema: must be 'mb-species/1', got 'mb-species/2'")])
        self.assertEqual(broken(lambda d: d.update(id="Tuliko"))[0][1], "id: 'Tuliko' is not a species id (S and two digits, like S20)")
        self.assertIn("spine.tail.segments: the shares add up to", broken(lambda d: d["spine"]["tail"]["segments"][0].update(share=0.5))[0][1])
        self.assertEqual(broken(lambda d: d["spine"]["ranges"][1].update(length=0.9))[0][0], "spine.ranges.neck.length")
        self.assertEqual(broken(lambda d: next(p for p in d["parts"] if p["id"] == "leg.L")["chain"].pop())[0][0], "parts.leg.L.chain")

    def test_labels(self):
        self.assertEqual(V.label_of("spine.tail.length"), "Tail length")
        self.assertEqual(V.label_of("parts.leg.L.chain.1.len"), "Length")
        self.assertEqual(V.stage_of("spine.tail.length"), "shape")
        self.assertEqual(V.stage_of("coat.zones"), "coat")


class TestPath(unittest.TestCase):
    def test_wb_set_paths_by_name_and_by_id(self):
        v1 = V.from_internal(V0)
        self.assertEqual(cli.resolve_path(v1, "spine.tail.length"), ("/spine/tail/length", 1.25))
        self.assertEqual(cli.resolve_path(v1, "spine.ranges.neck.length"), ("/spine/ranges/1/length", 0.25))
        self.assertEqual(cli.resolve_path(v1, "parts.leg.L.chain.knee.len")[0], "/parts/0/chain/0/len")
        with self.assertRaises(cli.Fail) as e:
            cli.resolve_path(v1, "spine.tail.lenght")
        self.assertIn("no field 'lenght'", e.exception.message)


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        d = V.from_internal(V0)
        S.write_spec(os.path.join(sp, "S20x.json"), d)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_a_patch_in_the_schemas_paths_and_the_refusal_that_names_the_field(self):
        agent = dict(name="agent-1", role="maker", agent=True)
        res = self.srv.patch_species("S20x", [dict(op="test", path="/spine/tail/length", value=1.25), dict(op="replace", path="/spine/tail/length", value=1.4)], agent)
        self.assertEqual(res["changed"], [dict(path="/spine/tail/length", old=1.25, new=1.4)])
        with self.assertRaises(S.ApiError) as e:
            self.srv.patch_species("S20x", [dict(op="replace", path="/spine/tail/length", value=9)], agent)
        self.assertEqual((e.exception.status, e.exception.field), (400, "spine.tail.length"))
        self.assertIn("outside the biped plan's band 0.6 to 1.8", e.exception.message)
        self.assertEqual(self.srv.species["S20x"].spec["spine"]["tail"]["length"], 1.4)
        rows = self.srv.check_file(dict(self.srv.species["S20x"].spec, spine=dict(self.srv.species["S20x"].spec["spine"], tial=1)))
        self.assertEqual(rows[0]["field"], "spine.tial")


if __name__ == "__main__":
    unittest.main()
