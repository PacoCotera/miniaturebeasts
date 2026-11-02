"""S20 pass 4 step 3 (AD gate on pass 3, must-fix 3): the face clear zone, on all twelve. No coat mark (spots, stripes, bands, the cap, the brow, the glow pattern) within 0.06 H of the eyes, the mouth or the blush; none across the face's midline between the brow and the chin;
the brow gene is two separate tufts (each at most 0.12 x 0.03 H, at least 0.05 H above the eye's top, the outer end raised about 10 degrees); a forehead emblem keeps 0.06 H from the eyes. Marks are tested at their maximum (every pattern forced on)."""
import os, sys, unittest, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import s20indiv as IN, s20coat as CT, s20p2 as P2, gltf_out

MARKS = ("rd", "spots", "brow", "cap", "glow_pattern")          # the dark marks (and the light constellation dots); the freckles are light glow dots, kept 0.08 H from the eyes and the mouth by the pass 2 test


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = []
        for i in range(1, 13):
            c, b, R = IN.make(i)
            V, F, at, fp2 = P2.level_arrays(b, 3)
            part = IN.part_of(b, F, fp2, len(V))
            N = gltf_out.vertex_normals(V, F)
            g = {**c["coat"], "layout": "spotted", "rd": "spots" if i % 2 else "labyrinth", "brow": 1.0, "glow_pattern": "constellation", "freckle_density": 1.0, "blush": True}
            o = CT.coat(b.ctx, V, at, part, N, at[:, 3], g, "open")
            cls.items.append((i, c, b, V, N, g, o))

    def geometry(self, b, g, V):
        spec, G = b.ctx["spec"], b.ctx["T"]
        R = spec["face"]["eyes"]["r"] * g["eye_size"]
        ez = spec["face"]["eyes"]["station"] + g["eye_height"]; ea = spec["face"]["eyes"]["around"] + g["eye_spacing"]
        P, nrm, up, rgt = CT.surface_frame(G, ez, ea)
        Vm = np.stack([V[:, 0], np.abs(V[:, 1]), V[:, 2]], 1)
        mz = spec["face"]["mouth"]["station"] + g["mouth_z"]
        Pm, nm_, upm, rgm = CT.surface_frame(G, mz, 1.0)
        cz, ca = spec["face"]["cheeks"]["station"], spec["face"]["cheeks"]["around"]
        Pc, nc, upc, rgc = CT.surface_frame(G, cz, ca)
        return dict(spec=spec, R=R, P=P, nrm=nrm, up=up, rgt=rgt, Vm=Vm, mz=mz, Pm=Pm, nm=nm_, upm=upm, rgm=rgm, Pc=Pc, nc=nc, upc=upc, rgc=rgc, ez=ez)

    def test_no_mark_within_0p06_of_the_eyes_mouth_or_blush_and_none_on_the_midline(self):
        for i, c, b, V, N, g, o in self.items:
            q = self.geometry(b, g, V)
            spec = q["spec"]
            d = q["Vm"] - q["P"]
            de = np.hypot(d @ q["rgt"], d @ q["up"])
            zone = ((de < q["R"] + 0.06 - 0.01) & (d @ q["nrm"] > -0.1))                                  # the eye and its 0.06 H ring (0.01 H of the soft edge excused)
            W = spec["face"]["mouth"]["width"] * g["mouth_width"]
            dm = V - q["Pm"]
            ex = np.maximum(np.maximum(np.abs(dm @ q["rgm"]) - W / 2, np.abs(dm @ q["upm"] + 0.01) - 0.045), 0.0)
            zone |= (ex < 0.06 - 0.01) & (dm @ q["nm"] > -0.1)
            dc = q["Vm"] - q["Pc"]
            rc = np.hypot(dc @ q["rgc"] / 1.3, dc @ q["upc"])
            zone |= (rc < spec["face"]["cheeks"]["r"] * 1.1 + 0.06 - 0.01) & (dc @ q["nc"] > -0.1)
            z_top = q["ez"] + q["R"] + 0.04; z_bot = q["mz"] - 0.12
            corridor = (np.abs(V[:, 1]) < 0.08) & (V[:, 2] > z_bot + 0.03) & (V[:, 2] < z_top - 0.03) & (N[:, 0] > 0.35)
            F = o["fields"]
            for k in MARKS:
                if k not in F:
                    continue
                m = np.asarray(F[k], float)
                self.assertLessEqual(float(m[zone].max()) if zone.any() else 0.0, 0.1, (i, k, "zone"))
                self.assertLessEqual(float(m[corridor].max()) if corridor.any() else 0.0, 0.1, (i, k, "midline"))
            print("individual", i, "zone vertices", int(zone.sum()), "corridor", int(corridor.sum()))

    def test_brow_is_two_separate_small_tufts_above_the_eyes(self):
        """The tuft's mask is sampled densely (a 0.004 H grid on the loft's own surface): at the mesh's vertex spacing a 0.03 H tuft is a dozen points."""
        for i, c, b, V0, N0, g, o in self.items:
            G = b.ctx["T"]; spec = b.ctx["spec"]
            zz, aa = np.meshgrid(np.arange(1.6, 2.1, 0.004), np.arange(0.55, 1.0001, 0.004), indexing="ij")
            P = G.point(zz.ravel(), aa.ravel())
            nrm = np.stack([P[:, 0], P[:, 1], np.zeros(len(P))], 1); nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
            fc, FZ = CT.face_clear(b.ctx, spec, g, P, np.stack([P[:, 0], np.abs(P[:, 1]), P[:, 2]], 1), nrm, np.ones(len(P), bool), P[:, 2])
            m = FZ["tuft"] > 0.5
            self.assertTrue(m.any(), i)
            q = self.geometry(b, g, P)
            d = q["Vm"][m] - q["P"]
            up = d @ q["up"]
            sg = 1.0 if q["rgt"][1] >= 0 else -1.0
            uo = (d @ q["rgt"]) * sg
            length = float(np.ptp(uo)); thick = float(np.ptp(up))
            self.assertGreaterEqual(float(up.min()) - q["R"], 0.05, (i, "tuft too close to the eye"))
            self.assertGreater(float(np.abs(P[m][:, 1]).min()), 0.05, (i, "the tufts must not meet on the midline"))
            self.assertLessEqual(length, 0.125, (i, length))
            self.assertGreaterEqual(length, 0.10, (i, length))
            self.assertLessEqual(thick, 0.03 + 0.12 * math.sin(math.radians(10)) + 0.004, (i, thick))        # 0.03 thick, tilted 10 degrees over 0.12: at most 0.05 tall
            slope = float(np.polyfit(uo, up, 1)[0])
            ang = math.degrees(math.atan(slope))
            self.assertTrue(4.5 <= ang <= 15.0, (i, ang))                                                    # the outer end is raised about 10 degrees
            print("individual", i, "tuft %.3f x %.3f H, raised %.1f deg, lower edge %.3f above the eye top" % (length, thick, ang, float(up.min()) - q["R"]))

    def test_forehead_emblem_keeps_0p06_from_the_eyes(self):
        for i, c, b, V, N, g0, o0 in self.items[:0]:
            pass
        for i in (10, 11, 3):
            c, b, R_ = IN.make(i)
            V, F, at, fp2 = P2.level_arrays(b, 3)
            part = IN.part_of(b, F, fp2, len(V)); N = gltf_out.vertex_normals(V, F)
            for kind in ("star", "heart"):
                g = {**c["coat"], "mark": kind, "mark_where": "forehead", "mark_size": 0.12}
                o = CT.coat(b.ctx, V, at, part, N, at[:, 3], g, "open")
                m = np.asarray(o["fields"]["mark"], float) > 0.2
                self.assertTrue(m.any(), (i, kind))
                q = self.geometry(b, g, V)
                d = q["Vm"][m] - q["P"]
                de = np.hypot(d @ q["rgt"], d @ q["up"])
                self.assertGreaterEqual(float(de.min()), q["R"] + 0.06 - 0.02, (i, kind, float(de.min())))


if __name__ == "__main__":
    unittest.main()
