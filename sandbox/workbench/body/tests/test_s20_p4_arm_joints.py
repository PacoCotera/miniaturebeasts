"""S20 pass 4 (owner, 2 Nov): each arm chain is shoulder -> upper arm -> elbow -> forearm -> wrist -> hand. The elbow is half way along the visible arm, the wrist where the mitten hand begins; the shell's vertices are weighted smoothly across the three joints so that an elbow bent 60 degrees and a wrist bent 30 degrees gives no collapse, fold or candy-wrapper twist; the Bones overlay names elbow.L/R and wrist.L/R."""
import os, sys, math, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20p2 as P2, s20normals as NM, s20rig


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = [IN.make(i) for i in (1, 2, 8)]

    def test_three_bones_per_arm_in_a_chain_and_named_joints_in_bones(self):
        for c, b, R in self.items:
            for sd in ("L", "R"):
                for nm in (f"arm.{sd}", f"arm.fore.{sd}", f"arm.hand.{sd}"):
                    self.assertIn(nm, R.bones)
                self.assertEqual(R.parent[f"arm.{sd}"], f"clav.{sd}")
                self.assertEqual(R.parent[f"arm.fore.{sd}"], f"arm.{sd}")
                self.assertEqual(R.parent[f"arm.hand.{sd}"], f"arm.fore.{sd}")
                # the joints are shared: the elbow is the upper arm's tail and the forearm's head, the wrist the forearm's tail and the hand's head
                self.assertTrue(np.allclose(R.bones[f"arm.{sd}"][1], R.bones[f"arm.fore.{sd}"][0]))
                self.assertTrue(np.allclose(R.bones[f"arm.fore.{sd}"][1], R.bones[f"arm.hand.{sd}"][0]))
            ov = R.overlay()
            names = [p["name"] for p in ov["points"]]
            for nm in ("elbow.L", "elbow.R", "wrist.L", "wrist.R"):
                self.assertIn(nm, names)
            ae = R.arm_s
            vis = ae["end"] - ae["skin"]
            print("arm: visible %.3f, elbow at %.2f of it, wrist %.3f before the tip" % (vis, (ae["elbow"] - ae["skin"]) / vis, ae["end"] - ae["wrist"]))
            self.assertTrue(0.38 <= (ae["elbow"] - ae["skin"]) / vis <= 0.6)                 # about half way (a 60 degree bend needs a blend window of 0.2 H)
            self.assertTrue(0.08 <= ae["end"] - ae["wrist"] <= 0.14)                         # the wrist where the fuller end begins

    def test_weights_blend_smoothly_over_the_three_bones(self):
        for c, b, R in self.items:
            V, F, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp, len(V))
            W = R.weights(V, at, part)
            self.assertLess(float(np.abs(W.sum(1) - 1).max()), 1e-9)
            idx = {n: i for i, n in enumerate(R.names)}
            arm = (part == b.parts["arm.L"]) & (V[:, 1] > 0)
            tip = arm & (V[:, 2] == V[arm][:, 2].min())
            self.assertGreater(float(W[tip][:, idx["arm.hand.L"]].min()), 0.99)               # the end of the mitten is the hand's
            used = [float(W[arm][:, idx[n]].max()) for n in ("arm.L", "arm.fore.L", "arm.hand.L")]
            self.assertTrue(min(used) > 0.8, used)                                              # (the forearm is short: its two blends overlap a little)
            mixed = int(((W[arm][:, idx["arm.L"]] > 0.05) & (W[arm][:, idx["arm.fore.L"]] > 0.05)).sum())
            self.assertGreater(mixed, 10)                                                      # a real blend across the elbow, not a hard cut

    def test_bent_arms_have_no_collapse_no_fold_and_no_twist(self):
        for c, b, R in self.items:
            V, F, at, fp = P2.level_arrays(b, 2)
            part = IN.part_of(b, F, fp, len(V))
            W = R.weights(V, at, part)
            rest = R.pose()
            bent = R.pose(elbow=math.radians(60.0), wrist=math.radians(30.0))
            Vb = R.skin(V, W, bent)
            Fa = np.array(F, int)
            armf = np.isin(Fa[:, 0], np.where(part == b.parts["arm.L"])[0]) & np.isin(Fa[:, 2], np.where(part == b.parts["arm.L"])[0])
            E, FA, FB = NM.edges(Fa[armf])
            ok = FB >= 0
            def mind(X):
                fn = NM.face_normals(X, Fa[armf])
                return float((fn[FA[ok]] * fn[FB[ok]]).sum(1).min())
            d0, d1 = mind(V), mind(Vb)
            print("individual", c["shape"]["ear"], "arm faces: min adjacent normal dot rest %.2f, bent %.2f" % (d0, d1))
            self.assertGreater(d1, 0.3)                                                         # no fold: adjacent faces stay within about 70 degrees (a fold is a negative dot)
            self.assertGreater(d1, d0 - 0.5)
            # collapse: the arm's section (the mean distance of the ring's vertices from their centroid) at the elbow and the wrist, rest against bent
            ae = R.arm_s
            import s20tex as TX
            m = (part == b.parts["arm.L"]) & (V[:, 1] > 0)
            s = TX.tube_uv(b.ctx, "arm.L", np.stack([V[m, 0], np.abs(V[m, 1]), V[m, 2]], 1))[1]
            for nm, at_s, lo in (("elbow", ae["elbow"], 0.78), ("wrist", ae["wrist"], 0.9)):
                k = np.abs(s - at_s) < 0.02
                self.assertGreater(int(k.sum()), 6, nm)
                r0 = np.linalg.norm(V[m][k] - V[m][k].mean(0), axis=1).mean()
                r1 = np.linalg.norm(Vb[m][k] - Vb[m][k].mean(0), axis=1).mean()
                print("  %s section: rest %.3f bent %.3f (%.0f %%)" % (nm, r0, r1, 100 * r1 / r0))
                self.assertGreater(r1 / r0, lo, nm)                                             # no collapse: a candy-wrapper twist pinches the section to a line
            # the hand really moved: the tip comes up and forward
            self.assertGreater(float(Vb[m][:, 2].max() - V[m][:, 2].max()), -0.5)
            tipz0 = V[m][:, 2].min(); tipz1 = Vb[m][:, 2].min()
            self.assertGreater(float(tipz1), float(tipz0) + 0.05)


if __name__ == "__main__":
    unittest.main()
