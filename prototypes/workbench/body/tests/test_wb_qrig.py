"""Chunk 20: the quadruped's rig and clips (qrig.py), numpy only: the four-beat walk where every foot lifts and lands, soles flat on the floor, breathing in the chest and belly only, a sit, a curl, and the tail on the midline in every pose."""
import json
import math
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
        return V[R.sole_vertices(self.rig, kind, side)]                                              # the vertices of the sole itself: the rings the limb makes back up the torso are not the foot

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
                rear_inv = np.linalg.inv(r.block(pose)["rear"])
                Vt = (rear_inv @ np.hstack([V[tail], np.ones((int(tail.sum()), 1))]).T).T[:, :3]
                self.assertLess(float(np.abs(Vt[:, 1] - r.V0[tail][:, 1]).max()), 1e-9, (name, i))           # in the rear block's own frame (the walk turns it a few degrees about its vertical axis) the tail bones turn about y only: nothing of the tail leaves the midline plane
                self.assertLess(abs(float(Vt[:, 1].mean())), 1e-6, (name, i))
                for k in R.FEET:
                    ix = R.sole_vertices(r, *k)
                    self.assertLess(float(np.abs(V[ix, 1] - r.V0[ix, 1]).max()), 1e-6, (name, i, k))   # no sole moves sideways

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
            self.assertGreater(float(V[:, 2].min()), -0.03)          # the trotter template's neck is 0-0.2 H (S22 was 0.25), its back 0.05 longer: the curl pose dips 0.024 H at the most

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

    def test_the_walk_numbers_of_the_art_direction(self):
        rf = R.rest_feet(self.rig)
        n = 12
        poses = [R.clip_pose(self.rig, "walk", i / n) for i in range(n)]
        for k in R.FEET:
            xs = [p.feet[k][0] - rf[k][0] for p in poses]
            self.assertAlmostEqual(max(xs) - min(xs), 0.09, delta=0.012)                              # each foot's whole travel across the loop: 0.09 H (the sampling of twelve frames misses the very ends)
            self.assertLessEqual(max(p.feet[k][1] - rf[k][1] for p in poses), 0.08 + 1e-9)
            self.assertGreater(max(p.feet[k][1] - rf[k][1] for p in poses), 0.06)                    # lift: 0.08 H at the middle of a swing
        z = [p.pelvis[1] for p in [R.clip_pose(self.rig, "walk", i / 96) for i in range(96)]]
        self.assertAlmostEqual(max(z) - min(z), 0.025, delta=1e-4)                                    # bob 0.025 H
        zz = [R.clip_pose(self.rig, "walk", i / 96).pelvis[1] for i in range(96)]
        self.assertEqual([i for i in range(96) if zz[i] == min(zz)][:2], [0, 48])                     # twice a loop, lowest as a foot lands
        self.assertEqual(R.FRAME_MS * R.FRAMES["walk"] / 1000.0, R.PERIOD["walk"])                    # 150 ms a frame
        self.assertAlmostEqual(max(abs(p.chest[2]) for p in poses), math.radians(5.0), delta=0.01)
        self.assertAlmostEqual(max(abs(R.clip_pose(self.rig, "walk", i / 96).yaw) for i in range(96)), math.radians(3.0), delta=1e-3)

    def test_the_soles_stay_level_and_the_stance_feet_hold_on_the_strip(self):
        from wb import facade as F
        import quadruped as Q
        pxh = 95 * Q.frame(F.internal(S22))["scale"]
        for i, row in enumerate(R.walk_numbers(self.rig, pxh)):
            for r in row:
                self.assertLessEqual(abs(r["angle"]), 8.0, (i, r))                                    # the sole level within 8 degrees
                if r["ground"]:
                    self.assertLessEqual(r["hold"], 1.0, (i, r))                                      # a stance foot holds within a pixel

    def test_each_knee_bends_the_way_the_animals_does_and_never_folds_through(self):
        r = self.rig
        for i in range(24):
            V, M = r.skin(R.clip_pose(r, "walk", i / 24))
            for (kind, side), L in r.leg.items():
                A = M[f"{kind}.ik.{side}"]
                t, u = A[1] - A[0], A[2] - A[1]
                cross = t[0] * u[2] - t[2] * u[0]
                bend = math.atan2(abs(cross), t[0] * u[0] + t[2] * u[2])
                self.assertLessEqual(bend, R.MAX_BEND + 0.05, (i, kind, side))                       # the elbow or stifle never bends past its limit: the paw folds instead
                if bend > 0.1:
                    # the joint's apex side: the fore elbow points back, the hind stifle forward (the apex of the file's joint)
                    side_of = 1.0 if L["apex"][1] == "fwd" else -1.0
                    # x of the joint against the chord from the root to the wrist
                    ch = A[2] - A[0]
                    off = (A[1][0] - A[0][0]) - ch[0] * np.dot(A[1] - A[0], ch) / np.dot(ch, ch)
                    self.assertGreater(off * side_of, 0.0, (i, kind, side))
                # the paw folds the way the animal's does: the fore knee forward, the hind hock back, of the ankle
                if A[3][2] - A[4][2] > 0 and A[4][2] > 0.01:
                    self.assertGreaterEqual((A[2][0] - A[3][0]) * L["fold"], -1e-9, (i, kind, side))

    def test_the_same_pose_is_the_same_vertices(self):
        a, _ = self.rig.skin(R.clip_pose(self.rig, "walk", 0.3))
        b, _ = self.rig.skin(R.clip_pose(self.rig, "walk", 0.3))
        self.assertTrue((a == b).all())


if __name__ == "__main__":
    unittest.main()
