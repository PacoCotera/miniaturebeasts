"""Viability of the Tuliko cage (arch-viability, 3 Nov 2026): the harness records per-part counts and where each failing check failed; 40 fixed genomes cover the known causes (a lowered tail, a tuft at its largest tip size, the shortest tail, three whiskers a side with fangs); and a slow test (WB_SLOW=1) holds the pass rate at 1,000 genomes.
KNOWN lists, for each fixed genome, the checks it still fails. A fix removes names from it; a genome that passes while listed fails the test, so the list never goes stale. The slow test is skipped by default (it builds 1,000 genomes: about 15 minutes)."""
import json
import multiprocessing as mp
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from wb import facade as F, frame_writer as FW  # noqa: E402

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


def individual(*settings):
    """The type with some loci set: ('value', locus, v) a blend at a value (outside its limits too), ('allele', locus, a) a switch or pair. Each setting is the facade's own selector merged into one individual."""
    import s20genes as GN
    base = F.resolve_genome("type", DOC)
    ind = {k: (dict(v) if isinstance(v, dict) else v) for k, v in base.items()}
    ind["t"], ind["pairs"], ind["switches"] = dict(base["t"]), {k: list(v) for k, v in base["pairs"].items()}, dict(base["switches"])
    for kind, name, v in settings:
        one = F.resolve_genome(f"{kind}:{name}={v}", DOC)
        for part in ("t", "pairs", "switches"):
            for k, x in one[part].items():
                if x != base[part].get(k):
                    ind[part][k] = x
    return GN.limit_loud(ind)


def W(n=3, fangs=True, glow=False, length=0.325, droop=0.3, curl=0.3):
    s = [("value", "form.whisker-count", n), ("value", "form.whisker-length", length), ("value", "form.whisker-droop", droop), ("value", "form.whisker-curl", curl)]
    return s + ([("allele", "anatomy.fang-presence", "on")] if fangs else []) + ([("allele", "appearance.whisker-glow", "on")] if glow else [])


def tip(form, size=None):
    return [("allele", "anatomy.tail-tip-form", form)] + ([("value", "form.tail-tip-size", size)] if size else [])


def cases():
    out = {"type": []}
    for carry in (-12, -9, -6):                                                   # a lowered tail creases leg.L
        for form in ("lantern", "tuft", "plain"):
            out[f"carry {carry} {form}"] = [("value", "form.tail-carry", carry)] + tip(form)
    for size in (1.0, 1.1, 1.2):                                                  # the tuft's flare at its largest tip size
        for curl in (0.0, 0.1, 0.2):
            out[f"tuft {size} curl {curl}"] = tip("tuft", size) + [("value", "form.tail-curl", curl)]
    short = ("value", "form.tail-length", 0.8)                                    # the shortest tail folds a large tip into the seat
    out["short tuft 1.0"] = [short] + tip("tuft", 1.0)
    out["short tuft 1.2"] = [short] + tip("tuft", 1.2)
    out["short tuft 1.2 curl 0.2"] = [short] + tip("tuft", 1.2) + [("value", "form.tail-curl", 0.2)]
    out["short lantern 1.2"] = [short] + tip("lantern", 1.2)
    out["short plain"] = [short] + tip("plain")
    for form in ("lantern", "tuft", "plain"):                                     # three whiskers a side with fangs
        out[f"whiskers 3 fangs {form}"] = W() + tip(form)
        out[f"whiskers 3 glow {form}"] = W(glow=True, fangs=False, length=0.45, droop=0.5, curl=0.6) + tip(form)
        out[f"whiskers 1 {form}"] = W(1, fangs=False, length=0.2, droop=0.1, curl=0.0) + tip(form)
    out["whiskers 3 fangs carry -12 tuft 1.2"] = W() + [("value", "form.tail-carry", -12)] + tip("tuft", 1.2)
    out["whiskers 3 fangs short tuft 1.2"] = W() + [short] + tip("tuft", 1.2)
    out["whiskers 2 fangs lantern"] = W(2) + tip("lantern")
    out["carry -12 girth 1.2 lantern 1.2"] = [("value", "form.tail-carry", -12), ("value", "form.tail-girth", 1.2)] + tip("lantern", 1.2)
    out["girth 0.8"] = [("value", "form.tail-girth", 0.8)]
    out["girth 1.2 tuft 1.2"] = [("value", "form.tail-girth", 1.2)] + tip("tuft", 1.2)
    out["tail 1.1 curl 0.2 lantern 1.2"] = [("value", "form.tail-length", 1.1), ("value", "form.tail-curl", 0.2)] + tip("lantern", 1.2)
    return out


# The checks each fixed genome fails now (at 0d7a64e82, before any fix, 38 of the 40 failed one; each chunk takes names off).
KNOWN = {
    'tuft 1.1 curl 0.2': ['verts'],
    'tuft 1.2 curl 0.2': ['verts'],
    'whiskers 3 fangs lantern': ['verts'],
    'whiskers 3 glow lantern': ['verts'],
    'whiskers 3 fangs tuft': ['verts'],
    'whiskers 3 glow tuft': ['verts'],
    'whiskers 3 fangs plain': ['verts'],
    'whiskers 3 glow plain': ['verts'],
    'whiskers 3 fangs carry -12 tuft 1.2': ['verts'],
    'whiskers 3 fangs short tuft 1.2': ['verts'],
}


def _job(item):
    name, settings = item
    return FW._built((name, individual(*settings)))


def run_cases():
    FW._DOC = DOC
    items = list(cases().items())
    with mp.get_context("fork").Pool(min(6, os.cpu_count() or 2)) as pool:
        return {r["id"]: r for r in pool.map(_job, items, chunksize=2)}


class TestFixedGenomes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.res = run_cases()

    def test_there_are_forty(self):
        self.assertEqual(len(cases()), 40)
        self.assertEqual(len(self.res), 40)

    def test_every_genome_builds_and_the_harness_says_where(self):
        for k, r in self.res.items():
            self.assertTrue(r["built"], (k, r["why"]))
            self.assertEqual(sum(r["parts"].values()), r["verts"], k)
            self.assertIn("torso", r["parts"], k)
            for c in r["ids"]:
                self.assertIn(c, r["where"], (k, c))
            if "normals" in r["ids"]:
                self.assertTrue(r["where"]["normals"]["parts"] and r["where"]["normals"]["ranges"], k)
            if "mesh" in r["ids"]:
                self.assertTrue(r["where"]["mesh"]["ranges"], k)

    def test_the_failing_checks_are_the_known_ones(self):
        now = {k: sorted(r["ids"]) for k, r in self.res.items() if r["ids"]}
        self.assertEqual(now, {k: sorted(v) for k, v in KNOWN.items()})


@unittest.skipUnless(os.environ.get("WB_SLOW"), "set WB_SLOW=1: builds 1,000 genomes (about 15 minutes)")
class TestPassRate(unittest.TestCase):
    def test_at_least_95_percent_pass_every_cage_check_at_500_and_500(self):
        res = FW.run_all(DOC, 500)
        rates = FW.pass_rates(res)
        print(json.dumps({k: v for k, v in rates.items() if k != "verts"}))
        self.assertGreaterEqual(rates["passAllRate"], 0.95, rates["failByCheck"])


if __name__ == "__main__":
    unittest.main()
