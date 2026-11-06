"""Chunk 23: the rig and coat checks of the background tier: the tail on the midline, breathing in the chest and belly only, the walk's folds, flat soles and weights, and the coat's UV islands, padding and stretch. Each is measured on S20 and, for the rig, on the bare quadruped S22,
and each fails when its own rule is broken."""
import json
import math
import os
import sys
import unittest
from unittest import mock

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import numpy as np
import checks as CH
from wb import facade as F

S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
S22 = json.load(open(os.path.join(BODY, "species_v1", "S22.json")))


def rows_of(doc, stages=("rig", "coat")):
    return {r["id"]: r for r in F.check_rows(doc, stages=stages)}


class TestOnTheTypes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s20 = rows_of(S20)
        cls.s22 = rows_of(S22)

    def test_every_row_is_measured_and_passes_on_s20(self):
        self.assertEqual(sorted(self.s20), ["breath", "coat", "midline", "waddle"])
        for i, r in self.s20.items():
            self.assertEqual(r["state"], "pass", (i, r["measure"]))
            self.assertIsInstance(r["value"], float, i)
            self.assertTrue(r["extra"]["shown"]["value"] and r["extra"]["shown"]["limit"], i)             # the table says what was measured, never 0 against 0
            self.assertTrue(r["proof"]["svg"].startswith("<svg") or "svg" in r["proof"], i)

    def test_the_quadruped_has_the_rig_rows_and_no_coat_yet(self):
        self.assertEqual(sorted(self.s22), ["body.twist.clip", "breath", "face.iris", "midline", "waddle"])          # the coat stage has no coat check for the quadruped yet, only the language's iris check
        for i, r in self.s22.items():
            self.assertEqual(r["state"], "pass", (i, r["measure"]))

    def test_the_numbers_are_the_ones_the_rules_ask_for(self):
        w22, w20 = self.s22["waddle"], self.s20["waddle"]
        self.assertLessEqual(w22["value"], 8.0)                                                         # the quadruped's sole level within 8 degrees
        self.assertEqual(w22["limit"], 8.0)
        self.assertIn("holding within", w22["measure"])
        self.assertEqual(w20["limit"], 10.0)
        self.assertEqual(self.s22["midline"]["limit"], 0.01)
        self.assertEqual(self.s20["breath"]["limit"], 0.002)
        self.assertLessEqual(self.s20["coat"]["value"], 2.0)
        self.assertEqual(self.s20["coat"]["extra"]["gap_px"], 32.0)                                    # the closest two islands, 32 px apart: the bake pads 10 px each

    def test_the_registry_has_them_in_their_own_stages(self):
        metas = {m["id"]: m for m in CH.metas()}
        self.assertEqual([metas[i]["stage"] for i in ("midline", "breath", "waddle", "coat")], ["rig", "rig", "rig", "coat"])
        self.assertEqual(CH.stages("all"), ("file", "cage", "rig", "coat"))
        self.assertNotEqual(CH.version_id("rig"), CH.version_id("coat"))

    def test_the_quadruped_clip_table_is_in_the_render_set(self):
        from wb import clips as CL, renders as RN
        self.assertEqual(CL.table("quadruped"), {"walk": 12, "breathe": 6, "sit": 1, "curl": 1})
        self.assertEqual(CL.table("biped"), CL.CLIPS)
        self.assertEqual(CL.timings(S22, "walk", None)["frame_s"], 0.15)                                # 150 ms a frame
        rows = RN.expand(S22)
        by = lambda o, st: [r for r in rows if r["output"] == o and r["style"] == st]
        self.assertTrue(all(r["state"] == "ready" for r in by("turn", "clay")))
        self.assertTrue(all(r["state"] == "owed" and "no coat" in r["why"] for r in by("walk", "plush") if r["age"] == "adult"))
        self.assertTrue(all(r["state"] == "ready" for r in by("silhouette", "silhouette")))
        self.assertTrue(any(r["state"] == "owed" and "shake" in r["why"] for r in by("stand", "plush")))
        self.assertTrue(all(r["state"] == "ready" or r["why"] for r in RN.expand(S20)))                 # the biped's table is as it was


class TestBrokenRules(unittest.TestCase):
    def test_a_sole_tilted_past_eight_degrees_fails_the_quadruped_walk(self):
        import qrig as QR
        with mock.patch.object(QR, "WALK_TOE", math.radians(14.0)):
            r = rows_of(S22, ("rig",))["waddle"]
        self.assertEqual((r["state"], r["extra"]["fail"]), ("fail", "Feet lift in the waddle"))
        self.assertIn("degrees off level", r["measure"])

    def test_a_tail_yawed_in_the_stand_pose_leaves_the_midline(self):
        import s20rig
        real = s20rig.Rig.stand_pose
        with mock.patch.object(s20rig.Rig, "stand_pose", lambda self, toward=-1.0: self.pose(tail_yaw=math.radians(40.0))):
            r = rows_of(S20, ("rig",))["midline"]
        self.assertEqual((r["state"], r["extra"]["fail"]), ("fail", "Tail swings to one side in stand"))
        self.assertGreater(r["value"], 0.02)

    def test_a_breath_that_moves_a_leg_fails(self):
        import s20rig
        real = s20rig.Rig.breath

        def leaky(self, V, attr, part, amount=1.0):
            d = real(self, V, attr, part, amount)
            d[part == self.ctx["body_parts"]["leg.L"], 2] += 0.02
            return d
        with mock.patch.object(s20rig.Rig, "breath", leaky):
            r = rows_of(S20, ("rig",))["breath"]
        self.assertEqual((r["state"], r["extra"]["fail"]), ("fail", "Breathing moves the leg.L"))

    def test_a_coat_stretched_past_its_limit_names_the_zone(self):
        from checks import coat as CT
        with mock.patch.dict(CT.COAT, {"stretch_p95": 1.2}):
            r = rows_of(S20, ("coat",))["coat"]
        self.assertEqual(r["state"], "fail")
        self.assertRegex(r["extra"]["fail"], r"^Coat stretches on (belly|face)$")


if __name__ == "__main__":
    unittest.main()
