"""S20 chunk 6: the rig and the clips. Weights are a partition of unity, the stand pose shows the lantern beside the head, no new fold at the four waddle keys (the absolute fold number is reported: the leg's crotch fold from chunk 2 fails it), feet flat in stance within 10 degrees, no fold at the waist while the head nods 6 degrees either way."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
import s20build, s20rig, s20render as RN, mquality as Q, subdiv as SD, bpyio as B

HERE = os.path.dirname(os.path.abspath(__file__))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.b = s20build.make_s20(upto="base")
        cls.R = s20rig.Rig(cls.b.ctx)
        Vf, Ff, at, fpp, cr, mir = cls.b.full()
        cls.V2, cls.F2, _, cls.attr2, cls.fp2 = SD.subdivide(Vf, Ff, cr, at, fpp, levels=2)
        F2 = np.array(cls.F2, int)
        cnt = np.zeros((len(cls.V2), len(cls.b.parts) + 1))
        for k in range(4):
            np.add.at(cnt, (F2[:, k], cls.fp2.astype(int)), 1.0)
        cls.part2 = cnt.argmax(1)
        cls.W = cls.R.weights(cls.V2, cls.attr2, cls.part2)

    def dot(self, M):
        V = self.R.skin(self.V2, self.W, M)
        return Q.flips(V, self.F2)["min_adjacent_normal_dot"], V

    def test_weights_partition_of_unity(self):
        self.assertTrue(np.allclose(self.W.sum(1), 1.0))
        self.assertGreaterEqual(self.W.min(), -1e-12)
        used = (self.W > 1e-6).any(0)
        unused = [n for n, u in zip(self.R.names, used) if not u]
        print("bones with no vertex weight:", unused)
        self.assertEqual(unused, ["root", "leg.lower.L", "leg.lower.R"])     # the root is the handle; the lower leg is buried in the stub (the column is carried by the upper bone); pass 3: the tip bone carries only the bulb's lower third, so tail.6 carries the last stalk (it carried nothing: the failure pass 2 left)

    def test_bones_per_the_plan(self):
        names = set(self.R.names)
        for need in ("root", "body", "head", "tip", "arm.L", "arm.R", "leg.upper.L", "leg.lower.R", "leg.foot.L", "ear.1.L", "ear.2.R") + tuple(f"tail.{k}" for k in range(1, 7)):
            self.assertIn(need, names)

    def test_stand_pose_lantern_beside_the_head(self):
        M = self.R.stand_pose()
        V = self.R.skin(self.V2, self.W, M)
        tip = (self.part2 == self.b.ctx["body_parts"]["torso"]) & (self.attr2[:, 1] <= self.b.ctx["T"].bulb[0])         # the bulb: the last stretch of the one spine
        c = V[tip].mean(0)
        c0 = self.V2[tip].mean(0)
        print("lantern centre rest", c0.round(2), "stand", c.round(2))
        self.assertGreater(c[1], c0[1] + 0.25)             # swung toward the creature's left (the camera's side)
        # in the house view (az 32) the lantern is not hidden behind the head: a ray from the camera reaches most of its vertices
        sc = B.reset()
        P = RN.prepare(self.b, dict(), level=2, pose=M, rig=self.R)
        ob = RN.mesh_obj(P, dict())
        cam = B.camera(sc, 32.0, 10.0, 304, 312, np.array([-0.35, 0, 1.3]), ppH=95.0)
        from mathutils import Vector
        fwd = cam["fwd"]
        pts = P["V"][tip][::5]
        vis = 0
        for p in pts:
            o = Vector((p - fwd * 20.0).tolist())
            hit = ob.ray_cast(o, Vector(fwd.tolist()), distance=40.0)
            vis += (not hit[0]) or (Vector(hit[1]) - o).length >= 20.0 - 0.02
        frac = vis / len(pts)
        print("lantern visible fraction at az 32", round(frac, 2))
        self.assertGreaterEqual(frac, 0.4)

    def test_waddle_folds_at_four_keys(self):
        rest, _ = self.dot(self.R.pose())
        print("rest min dot", round(rest, 3))
        for ph in s20rig.WALK_KEYS:
            M, st = self.R.waddle_pose(ph)
            d, _ = self.dot(M)
            print("waddle key", ph, "min dot", round(d, 3))
            self.assertGreater(d, -0.2, ph)            # absolute: fails while the leg's crotch fold is in the rest mesh

    def folds(self, V):
        F2 = np.array(self.F2, int)
        n = np.cross(V[F2[:, 2]] - V[F2[:, 0]], V[F2[:, 3]] - V[F2[:, 1]]); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-300)
        E = Q.edge_faces(F2)
        return sum(1 for fs in E.values() if len(fs) == 2 and float(n[fs[0]] @ n[fs[1]]) < -0.2)

    def test_waddle_adds_few_new_folds(self):
        """Folded edges (adjacent normal dot < -0.2) at each key against the rest mesh (the rest has the leg crotch): no more than 25 % more."""
        rest = self.folds(self.R.skin(self.V2, self.W, self.R.pose()))
        for ph in s20rig.WALK_KEYS:
            n = self.folds(self.R.skin(self.V2, self.W, self.R.waddle_pose(ph)[0]))
            print("folded edges at rest", rest, "at key", ph, n)
            self.assertLessEqual(n, rest * 1.25 + 4, ph)

    def test_feet_flat_in_stance(self):
        lo = self.part2 == self.b.ctx["body_parts"]["leg.L"]
        sole = lo & (self.V2[:, 2] < 0.035)
        for ph in s20rig.WALK_KEYS:
            M, st = self.R.waddle_pose(ph)
            V = self.R.skin(self.V2, self.W, M)
            for sd, sg in (("L", 1), ("R", -1)):
                if not st[sd]:
                    continue
                sel = sole & (np.sign(self.V2[:, 1]) == sg)
                P = V[sel]
                c = P - P.mean(0)
                u, s_, vt = np.linalg.svd(c, full_matrices=False)
                n = vt[-1]
                tilt = math.degrees(math.acos(min(1.0, abs(n[2]))))
                self.assertLessEqual(tilt, 10.0, (ph, sd, tilt))

    def test_no_fold_at_the_waist_when_the_head_nods(self):
        zv = self.V2[:, 2]
        F2 = np.array(self.F2, int)
        band = (zv[F2].mean(1) > 0.95) & (zv[F2].mean(1) < 1.45)
        def waist_dot(M):
            V = self.R.skin(self.V2, self.W, M)
            n = np.cross(V[F2[:, 2]] - V[F2[:, 0]], V[F2[:, 3]] - V[F2[:, 1]]); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-300)
            E = Q.edge_faces(F2)
            md = 1.0
            for fs in E.values():
                if len(fs) == 2 and band[fs[0]] and band[fs[1]]:
                    md = min(md, float(n[fs[0]] @ n[fs[1]]))
            return md
        for deg in (-6.0, 0.0, 6.0):
            d = waist_dot(self.R.pose(head_nod=math.radians(deg)))
            print("waist band min dot, nod", deg, round(d, 3))
            self.assertGreater(d, -0.2, deg)


if __name__ == "__main__":
    unittest.main()
