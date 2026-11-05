"""Chunk 20: the quadruped's rig and clips (qrig.py), numpy only: the four-beat walk where every foot lifts and lands, soles flat on the floor, breathing in the chest and belly only, a sit, a curl, and the tail on the midline in every pose."""
import json
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import numpy as np
import qrig as R

S22 = json.load(open(os.path.join(BODY, "species_v1", "S22.json")))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rig, cls.mesh = R.build_rig(S22)
        cls.rig_part = cls.rig.part

    def foot_verts(self, V, kind, side):
        r = self.rig
        m = (r.part == r.parts[f"{kind}.L"]) & ((r.V0[:, 1] >= 0) if side == "L" else (r.V0[:, 1] < 0))
        return V[m]

    def feet_z(self, V):
        return {k: float(self.foot_verts(V, *k)[:, 2].min()) for k in R.FEET}

    def test_the_rest_pose_is_the_cage_exactly(self):
        V, _ = self.rig.skin(R.Pose())
        self.assertLess(float(np.abs(V - self.rig.V0).max()), 1e-9)

    def test_the_clips_and_their_frames(self):
        from wb import clips as CL
        self.assertEqual({k: CL.frames(k, "quadruped") for k in ("walk", "breathe", "sit", "curl")}, dict(walk=12, breathe=6, sit=1, curl=1))
        self.assertEqual(CL.frames("walk"), 6)                                                       # the biped's are as they were
        with self.assertRaises(ValueError):
            CL.frames("idle", "quadruped")

    def test_the_walk_is_four_beats_one_foot_in_the_air_at_a_time_each_in_its_turn(self):
        air = []
        for i in range(12):
            V, _ = self.rig.skin(R.clip_pose(self.rig, "walk", i / 12))
            z = self.feet_z(V)
            air.append([k for k in R.FEET if z[k] > 0.03])
        self.assertTrue(all(len(a) <= 1 for a in air), air)                                          # three feet or four on the ground at every frame
        self.assertTrue(all(any(k in a for a in air) for k in R.FEET))                               # and each foot is in the air in some frame
        order = [a[0] for a in air if a]
        firsts = [order[0]] + [b for a, b in zip(order, order[1:]) if a != b]
        at = R.FEET.index(firsts[0])
        self.assertEqual(firsts[:4], [R.FEET[(at + k) % 4] for k in range(4)])                       # the lateral sequence, round and round: hind left, fore left, hind right, fore right

    def test_each_foot_lifts_clear_and_lands_flat(self):
        peak = {k: 0.0 for k in R.FEET}
        for i in range(48):
            V, _ = self.rig.skin(R.clip_pose(self.rig, "walk", i / 48))
            for k in R.FEET:
                fv = self.foot_verts(V, *k)
                peak[k] = max(peak[k], float(fv[:, 2].min()))
                if fv[:, 2].min() < 0.004:                                                           # on the ground: the sole is flat (the vertices under 0.01 H over the floor lie within 0.008 H of each other: the sole's own, level)
                    low = fv[fv[:, 2] < 0.01][:, 2]
                    self.assertLess(float(np.ptp(low)), 0.008, (i, k))
        for k, v in peak.items():
            self.assertGreater(v, 0.03, k)                                                           # the lowest point of the foot clear of the floor by 0.03 H at its peak (the lift is 0.08 H, the toe rolls up)

    def test_the_stance_feet_never_slide_off_the_floor_or_sink_through_it(self):
        for i in range(24):
            V, _ = self.rig.skin(R.clip_pose(self.rig, "walk", i / 24))
            self.assertGreater(float(V[:, 2].min()), -0.02)

    def test_the_tail_stays_on_the_midline_in_every_pose(self):
        r = self.rig
        tail = (r.attr[:, 1] > r.p["u_e"] + 0.1) & (r.part == r.parts["torso"])
        for name, n in R.FRAMES.items():
            for i in range(n):
                pose = R.clip_pose(r, name, i / n)
                V, M = r.skin(pose)
                # the mirror pairs stay mirrored: the tail's mean side position is zero, and no tail vertex leaves the half it began in by more than its own radius
                self.assertLess(abs(float(V[tail][:, 1].mean())), 1e-6, (name, i))
                self.assertLess(float(np.abs(V[tail][:, 1] - r.V0[tail][:, 1]).max()), 1e-9, (name, i))      # the bones turn about y only: nothing of the tail moves sideways
                if name != "breathe":
                    self.assertLess(float(np.abs(V[:, 1] - r.V0[:, 1]).max()), 1e-9)                  # no vertex of the body moves sideways in a walk, a sit or a curl (a breath swells the chest outward)

    def test_breathing_moves_the_chest_and_belly_only(self):
        r = self.rig
        V, _ = r.skin(R.clip_pose(r, "breathe", 0.5))
        d = np.linalg.norm(V - r.V0, axis=1)
        self.assertGreater(float(d.max()), 0.02)                                                     # a visible breath at full inhale
        self.assertLessEqual(float(d.max()), R.BREATHE_AMP + 1e-9)
        u = r.attr[:, 1]
        moved = d > 1e-9
        self.assertTrue(((r.part[moved] == r.parts["torso"])).all())                                 # no leg moves
        self.assertGreaterEqual(float(u[moved].min()), r.p["head"] + r.p["neck"] - 1e-9)           # the head and the neck stay
        self.assertLessEqual(float(u[moved].max()), r.p["head"] + r.p["neck"] + r.p["back"] + 0.12 + 1e-9)       # the seat and the tail stay
        V0, _ = r.skin(R.clip_pose(r, "breathe", 0.0))
        self.assertLess(float(np.abs(V0 - r.V0).max()), 1e-9)                                        # fully out is the rest shape

    def test_sit_and_curl_have_all_four_soles_flat_on_the_floor(self):
        for name in ("sit", "curl"):
            V, _ = self.rig.skin(R.clip_pose(self.rig, name))
            z = self.feet_z(V)
            for k, v in z.items():
                self.assertLess(abs(v), 0.012, (name, k, v))
                fv = self.foot_verts(V, *k)
                self.assertLess(float(np.ptp(fv[fv[:, 2] < 0.01][:, 2])), 0.008, (name, k))
            self.assertGreater(float(V[:, 2].min()), -0.02)

    def test_sit_lowers_the_haunches_and_curl_lowers_the_whole_body(self):
        r = self.rig
        V0 = r.V0
        top = lambda V: float(V[r.part == r.parts["torso"]][:, 2].max())
        sit, _ = r.skin(R.clip_pose(r, "sit"))
        curl, _ = r.skin(R.clip_pose(r, "curl"))
        seat = (r.attr[:, 1] > r.p["u_e"] - 0.4) & (r.attr[:, 1] < r.p["u_e"]) & (r.part == r.parts["torso"])
        self.assertLess(float(sit[seat][:, 2].max()), float(V0[seat][:, 2].max()) - 0.15)
        back = (r.attr[:, 1] > 1.5) & (r.attr[:, 1] < 2.5) & (r.part == r.parts["torso"])
        self.assertLess(float(curl[back][:, 2].max()), float(V0[back][:, 2].max()) - 0.2)

    def test_the_same_pose_is_the_same_vertices(self):
        a, _ = self.rig.skin(R.clip_pose(self.rig, "walk", 0.3))
        b, _ = self.rig.skin(R.clip_pose(self.rig, "walk", 0.3))
        self.assertTrue((a == b).all())


if __name__ == "__main__":
    unittest.main()
