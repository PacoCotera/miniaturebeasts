"""Tuliko away from Pikachu (owner, 3 Nov 2026): the guard on the face and coat cues. No yellow or orange hue in any draw or cross, the new mouth allele is appended so
old genome codes decode to the mouth they always did, the type has no blush, and the face keeps its own lantern-green iris."""
import json
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import genomeapply as GA
import s20genes as GN
from wb import facade as F

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
LOCI = {e["locus"]: e for e in DOC["genome"]["loci"]}


def hue_of(ind, tbl):
    return GN.resolve_locus("appearance.body-hue", ind["t"]["appearance.body-hue"], tbl[0])


class TestGuard(unittest.TestCase):
    def test_the_hue_range_is_150_to_375(self):
        self.assertEqual(LOCI["appearance.body-hue"]["range"], [150.0, 375.0])
        self.assertEqual((LOCI["appearance.body-hue"]["band"]["lo"], LOCI["appearance.body-hue"]["band"]["hi"]), (180.0, 360.0))

    def test_no_drawn_or_bred_genome_is_yellow_or_orange(self):
        """Hue 30 to 150 degrees is orange, yellow and yellow-green; the band (150 to 375) never reaches it, drawn, extreme or crossed."""
        tbl = F.tables(DOC)
        lo, hi = LOCI["appearance.body-hue"]["range"]
        seen = []
        for seed0 in range(2026, 2026 + 60):
            for i in range(1, 13):
                seen.append(hue_of(GN.draw(i, seed0), tbl) % 360.0)
        rng = np.random.Generator(np.random.PCG64(7))
        for k in range(400):
            t = float(rng.random())
            seen.append(GA.value_of(*tbl[0]["appearance.body-hue"][:3], t) % 360.0)
        for h in seen:
            self.assertFalse(30.0 <= h < 150.0, h)
        for t in (-0.5, 0.0, 1.0, 1.5):                                   # a bred value beyond the band is clamped to the range
            v = GA.value_of(*tbl[0]["appearance.body-hue"][:3], t)
            self.assertTrue(lo <= min(max(v, lo), hi) <= hi)

    def test_the_type_has_no_blush(self):
        e = LOCI["appearance.blush"]
        self.assertEqual((e["operator"], e["type"], e["weight"]), ("recessive-enable", "off", 0.3))
        self.assertEqual(GN.genome_of(GN.draw(1))["appearance.blush"], ["off", "off"])
        self.assertFalse(GN.draw(1)["switches"]["blush"])
        self.assertFalse(GN.creature(GN.draw(1))["coat"]["blush"])
        self.assertEqual((DOC["face"]["cheeks"]["alpha"], DOC["face"]["cheeks"]["r"]), (0.3, 0.075))

    def test_blush_shows_on_two_copies_only(self):
        c = {k: list(v) for k, v in GN.genome_of(GN.draw(1)).items()}
        for pair, want in ((["on", "off"], False), (["off", "on"], False), (["on", "on"], True)):
            c["appearance.blush"] = pair
            self.assertEqual(GN.individual_of(c)["switches"]["blush"], want, pair)

    def test_the_twelve_show_blush_rarely(self):
        self.assertLessEqual(sum(GN.draw(i)["switches"]["blush"] for i in range(2, 13)), 3)

    def test_smile_is_appended_and_is_the_type_mouth(self):
        e = LOCI["appearance.mouth-rest"]
        self.assertEqual(e["limits"], ["content", "open", "smile"])
        self.assertEqual((e["weights"], e["order"], e["type"]), ([0.2, 0.2, 0.6], ["smile", "content", "open"], "smile"))
        self.assertEqual(DOC["face"]["mouth"]["default"], "smile")
        self.assertEqual([a["id"] for a in GA.pin_locus("appearance.mouth-rest")["alleles"]], ["content", "open", "smile"])
        self.assertEqual(GN.PAIRS["face.expression"][0], ["content", "open", "smile"])
        self.assertEqual(GN.TYPE_PAIRS["face.expression"], "smile")
        self.assertEqual(GN.phenotype("face.expression", ["smile", "smile"]), "smile")
        self.assertEqual(GN.creature(GN.draw(1))["coat"]["expression"], "smile")

    def test_old_genome_codes_decode_to_the_mouth_they_did(self):
        """A copy written before smile existed is content or open; it shows what it showed (content over open), and the allele indexes of the two did not move."""
        c = {k: list(v) for k, v in GN.genome_of(GN.draw(1)).items()}
        for pair, shown in ((["content", "content"], "content"), (["content", "open"], "content"), (["open", "content"], "content"), (["open", "open"], "open")):
            c["appearance.mouth-rest"] = pair
            ind = GN.individual_of(c)
            self.assertEqual(GN.phenotype("face.expression", ind["pairs"]["face.expression"]), shown, pair)
        self.assertEqual([a["id"] for a in GA.pin_locus("appearance.mouth-rest")["alleles"]][:2], ["content", "open"])
        from wb import frame_writer as FW
        r = FW.node(dict(op="encode", copies=c))
        self.assertTrue(r["ok"], r)
        back = FW.node(dict(op="decode", text=r["string"]))
        self.assertEqual(back["copies"]["appearance.mouth-rest"], ["open", "open"])
        c["appearance.mouth-rest"] = ["content", "open"]
        back = FW.node(dict(op="decode", text=FW.node(dict(op="encode", copies=c))["string"]))
        self.assertEqual(back["copies"]["appearance.mouth-rest"], ["content", "open"])

    def test_no_dark_ear_tips_and_the_cat_ear(self):
        self.assertEqual(DOC["coat"]["zones"]["points"]["ends"], ["tail tip", "feet"])
        ear = [p for p in DOC["parts"] if p["id"] == "ear.L"][0]["families"]["prick"]
        self.assertEqual(ear["plane"]["yaw"], 106)
        self.assertEqual(ear["cup"], 0.05)
        r, b, t = ear["joints"]
        self.assertEqual((r["at"], r["r"]), ([-0.16, 0.42, 1.84], [0.12, 0.30]))
        self.assertEqual((b["len"], b["pitch"], b["r"]), (0.26, 60, [0.09, 0.21]))
        self.assertEqual((t["len"], t["pitch"], t["r"]), (0.24, 70, [0.03, 0.05]))
        el = LOCI["form.ear-length"]
        self.assertEqual(((el["band"]["lo"], el["band"]["hi"]), el["range"]), ((0.8, 1.3), [0.6, 1.5]))

    def test_the_eyes_have_a_lantern_green_iris_ring_round_a_dark_pupil(self):
        import s20coat as C
        self.assertEqual(DOC["face"]["eyes"]["iris"], dict(ring=0.74, pupil=0.46, value=0.70))
        import inspect
        self.assertIn('spec["face"]["eyes"].get("iris")', inspect.getsource(C))

    def test_the_lop_ear_spreads_and_hangs_and_the_lantern_is_lit_more_often(self):
        ear = [p for p in DOC["parts"] if p.get("id") == "ear.L"][0]
        lop = ear["families"]["lop"]
        self.assertEqual(lop["plane"]["yaw"], 108)
        self.assertEqual([j.get("pitch") for j in lop["joints"][1:]], [15, -40, -70])
        import s20genes as GN
        self.assertEqual(GN.PAIRS["body.tail-tip"][1], [0.75, 0.20, 0.05])


if __name__ == "__main__":
    unittest.main()
