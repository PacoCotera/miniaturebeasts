"""Chunk 9: expressions. Dominance (the catalogue's, changed only by a modifier gene), age gates, needs, the counts, the checks and the file's validator."""
import copy
import json
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import expressions as X
import expressions_demo as D
import genomeapply as GA
import species_v1 as V1

S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


def with_copies(g, **over):
    c = X.type_copies(g)
    c.update(over)
    return c


class TestDominance(unittest.TestCase):
    def test_the_catalogue_sets_how_a_shared_locus_shows(self):
        g = S20["genome"]
        tip = lambda a, b: X.looks_of(g, with_copies(g, **{"anatomy.tail-tip-form": [a, b]}))["anatomy.tail-tip-form"]
        self.assertEqual(tip("plain", "lantern"), "lantern")                           # first in the order: lantern, tuft, plain
        self.assertEqual(tip("plain", "tuft"), "tuft")
        self.assertEqual(tip("plain", "plain"), "plain")
        fang = lambda a, b: X.looks_of(g, with_copies(g, **{"anatomy.fang-presence": [a, b]}))["anatomy.fang-presence"]
        self.assertEqual((fang("on", "off"), fang("on", "on")), ("off", "on"))           # needs both copies
        blush = lambda a, b: X.looks_of(g, with_copies(g, **{"appearance.blush": [a, b]}))["appearance.blush"]
        self.assertEqual((blush("on", "off"), blush("off", "off")), ("on", "off"))       # one is enough

    def test_a_modifier_gene_changes_it_and_only_in_a_carrier(self):
        doc = D.demo(with_modifier=True)
        g = doc["genome"]
        c = lambda mod: with_copies(g, **{"anatomy.tail-tip-form": ["lantern", "tuft"], "mod.tail-tip-order": mod})
        self.assertEqual(X.looks_of(g, c(["off", "off"]))["anatomy.tail-tip-form"], "lantern")
        self.assertEqual(X.looks_of(g, c(["off", "on"]))["anatomy.tail-tip-form"], "tuft")           # one copy of the modifier is enough: tuft over lantern
        self.assertEqual(X.looks_of(g, c(["on", "on"]))["anatomy.tail-tip-form"], "tuft")
        self.assertEqual(GA.validate(doc), [])

    def test_a_modifier_is_inherited_like_any_gene(self):
        g = D.demo(with_modifier=True)["genome"]
        kids, _ = X.forecast(g)
        self.assertEqual(len(kids), 4)
        self.assertTrue(all("mod.tail-tip-order" in k for k in kids))
        self.assertTrue(any("on" in k["mod.tail-tip-order"] for k in X.wild(g, 200)))        # a wild draw carries it by its weight

    def test_a_bad_modifier_is_refused_with_the_field(self):
        def broken(fn):
            doc = D.demo(with_modifier=True)
            fn(doc["genome"]["loci"][-1], doc)
            return GA.validate(doc)
        self.assertIn("modifier.of", broken(lambda m, d: m["modifier"].update(of="nothing.here"))[0][0])
        self.assertIn("does not fit", broken(lambda m, d: m["modifier"].update(show="dominant"))[0][1])
        self.assertIn("order lists every look", broken(lambda m, d: m["modifier"].update(order=["tuft", "plain"]))[0][1])
        self.assertIn("begins 'mod.'", broken(lambda m, d: m.update(locus="tail.order"))[0][1])
        self.assertIn("scope", broken(lambda m, d: m.update(scope="trunk"))[0][0])
        self.assertTrue(any("is a blend" in m for _, m in broken(lambda m, d: m["modifier"].update(of="form.tail-length", show="dominant"))))


class TestLooks(unittest.TestCase):
    def setUp(self):
        self.doc = D.demo()
        self.g, self.ex = self.doc["genome"], self.doc["expressions"]

    def test_a_horn_shows_from_adult(self):
        c = with_copies(self.g, **{"anatomy.horn-presence": ["on", "off"]})
        self.assertEqual([X.showing(self.g, self.ex, c, s).count("horn") for s in X.STAGES], [0, 1, 1])
        self.assertEqual(X.grown(self.ex[1], "juvenile"), 0.0)
        self.assertEqual(X.grown(self.ex[1], "elder"), 1.0)
        self.assertLess(X.grown(self.ex[1], "adult"), 1.0 + 1e-9)

    def test_sparkle_spots_need_two_loci(self):
        base = {"appearance.freckle-glow": ["high", "high"]}
        both = with_copies(self.g, **base, **{"appearance.pattern-kind": ["spots", "spots"], "anatomy.tail-tip-form": ["lantern", "plain"]})
        self.assertIn("sparkle-spots", X.showing(self.g, self.ex, both))
        no_tip = with_copies(self.g, **base, **{"appearance.pattern-kind": ["spots", "spots"], "anatomy.tail-tip-form": ["tuft", "plain"]})
        self.assertNotIn("sparkle-spots", X.showing(self.g, self.ex, no_tip))
        no_spots = with_copies(self.g, **base, **{"appearance.pattern-kind": ["none", "none"]})
        self.assertNotIn("sparkle-spots", X.showing(self.g, self.ex, no_spots))
        # pattern-kind spots in one copy hides behind none (none over spots): the pair map shows none, so the spots are carried, not shown
        carried = with_copies(self.g, **base, **{"appearance.pattern-kind": ["none", "spots"]})
        self.assertNotIn("sparkle-spots", X.showing(self.g, self.ex, carried))

    def test_a_combination_can_skip_a_generation(self):
        # inheritance is unchanged: each locus crosses on its own, so the look comes back in a grandchild
        c = with_copies(self.g, **{"appearance.freckle-glow": ["high", "high"], "appearance.pattern-kind": ["none", "spots"], "anatomy.tail-tip-form": ["lantern", "lantern"]})
        self.assertEqual(X.showing(self.g, self.ex, c), ["lantern-tail"])
        c["appearance.pattern-kind"] = ["spots", "spots"]
        self.assertEqual(X.showing(self.g, self.ex, c), ["lantern-tail", "sparkle-spots"])


class TestCounts(unittest.TestCase):
    def test_the_counts_by_stage_group_and_look(self):
        doc = D.demo()
        f = X.freq(doc["genome"], doc["expressions"], 1000, doc_id="S20")
        self.assertEqual(f["n"], dict(wild=1000, sheet=12, cross=4))
        horn = f["expressions"]["horn"]
        self.assertEqual(horn["wild"]["juvenile"], 0.0)
        self.assertEqual(horn["wild"]["adult"], horn["wild"]["elder"])
        self.assertTrue(30 < horn["wild"]["adult"] < 42, horn["wild"])                  # 1 - 0.8 ** 2 = 36 % carry at least one copy on
        self.assertTrue(75 < f["expressions"]["lantern-tail"]["wild"]["adult"] < 95)
        sp = f["expressions"]["sparkle-spots"]["wild"]["adult"]
        self.assertTrue(0 <= sp < 25, sp)
        row = f["loci"]["anatomy.tail-tip-form"]
        self.assertAlmostEqual(sum(row["wild"].values()), 100.0, delta=0.3)
        self.assertEqual(row["rule"], "first-ranked")
        self.assertTrue(all(v in (0.0, 25.0, 50.0, 75.0, 100.0) for v in row["cross"].values()))           # four seeds: quarters
        self.assertEqual(f, X.freq(doc["genome"], doc["expressions"], 1000, doc_id="S20"))                  # the same seed gives the same counts
        self.assertGreater(f["loci"]["appearance.marking-rosette"]["wild"]["asleep"], 50)                    # a sleeping look is counted as asleep, not as missing

    def test_a_modifier_moves_the_counts(self):
        a, b = D.demo(), D.demo(with_modifier=True)
        fa = X.freq(a["genome"], a["expressions"], 1000)["loci"]["anatomy.tail-tip-form"]["wild"]
        fb = X.freq(b["genome"], b["expressions"], 1000)["loci"]["anatomy.tail-tip-form"]["wild"]
        self.assertGreater(fb["tuft"], fa["tuft"] + 3)


class TestChecks(unittest.TestCase):
    def test_s20_passes(self):
        probs, facts = X.express_report(S20)
        self.assertEqual(probs, [])
        self.assertEqual(facts["loud_kept"], 2)
        self.assertFalse(facts["ember"])

    def test_the_demo_passes(self):
        self.assertEqual(X.express_report(D.demo())[0], [])

    def test_a_need_that_cannot_be_met_is_named(self):
        doc = D.demo()
        doc["expressions"][2]["needs"][0] = dict(locus="appearance.pattern-kind", **{"is": "spots"})
        doc["expressions"][2]["needs"].append(dict(locus="appearance.pattern-kind", **{"is": "rings"}))
        probs, _ = X.express_report(doc)
        self.assertEqual(probs[0][0], "expressions[sparkle-spots].needs")
        self.assertIn("Sparkle spots can never show", probs[0][1])

    def test_a_look_that_cannot_wake_is_unreachable(self):
        doc = D.demo()
        for e in doc["genome"]["loci"]:
            if e["locus"] == "appearance.marking-layout":
                e["limits"] = [a for a in e["limits"] if a != "spotted"]
                e["order"] = [a for a in e["order"] if a != "spotted"]
                e["weights"] = e["weights"][:len(e["limits"])]
        doc["expressions"].append(dict(id="rosettes", label="Rosettes", locus="appearance.marking-rosette", look="high"))
        probs, _ = X.express_report(doc)
        self.assertTrue(any("Rosettes can never show" in m for _, m in probs), probs)

    def test_a_gated_look_needs_art_at_every_stage_it_shows(self):
        doc = D.demo()
        doc["expressions"][1]["art"] = ["adult"]
        probs, _ = X.express_report(doc)
        self.assertEqual(probs[0][0], "expressions[horn].art")
        self.assertIn("no art at elder", probs[0][1])

    def test_the_ember_rule_reads_the_hue_band(self):
        doc = copy.deepcopy(S20)
        for e in doc["genome"]["loci"]:
            if e["locus"] == "appearance.body-hue":
                e["band"]["lo"] = 0.0
        probs, facts = X.express_report(doc)
        self.assertTrue(facts["ember"])
        self.assertIn("ember rule", probs[0][1])


class TestFile(unittest.TestCase):
    def test_the_validator_names_the_field(self):
        def broken(fn):
            doc = D.demo()
            fn(doc)
            return V1.validate(doc)
        self.assertEqual(V1.validate(D.demo()), [])
        self.assertEqual(V1.validate(S20), [])
        self.assertEqual(broken(lambda d: d["expressions"][1].update(show="dominant"))[0][0], "expressions[horn].show")
        self.assertIn("never an expression's", broken(lambda d: d["expressions"][1].update(show="dominant"))[0][1])
        self.assertIn("not a locus of this file", broken(lambda d: d["expressions"][1].update(locus="nope"))[0][1])
        self.assertIn("not a look of", broken(lambda d: d["expressions"][1].update(look="huge"))[0][1])
        self.assertIn("age", broken(lambda d: d["expressions"][1].update(age={"from": "embryo"}))[0][0])
        self.assertIn("name one of", broken(lambda d: d["expressions"][2]["needs"].__setitem__(0, dict(locus="appearance.pattern-kind")))[0][1])


if __name__ == "__main__":
    unittest.main()
