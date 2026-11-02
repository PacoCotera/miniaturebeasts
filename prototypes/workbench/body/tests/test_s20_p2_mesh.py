"""S20 pass 2, the owner's mesh rules (2 Nov): the coat is a texture on the cage's UVs, the glb ships at subdivision level 2 with smooth vertex normals (at most a third of the old level-3 vertex count, the silhouette unchanged), the cage is relaxed, and normals do
not change abruptly (face-normal angle at most 20 degrees at level 2 and the junction gradient at most 35 degrees per 0.1 H, everywhere except the tagged toe creases)."""
import os, sys, json, unittest, struct
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20tex as TX, s20pipe as PP, s20glb, s20coat as CT, s20normals as NM, s20p2 as P2, s20sil as SL, subdiv as SD

SHIP_LEVEL = 1                         # the owner: ship subdivision level 1 of the relaxed cage, at most 3,500 vertices
MAX_SHIPPED = 4000          # pass 3 brief: a total of about 4,000 or less (the toes, the root rings and the hard arm shells are the detail the owner asked for; pass 2 was 3,500)
OLD_L3_VERTICES = 49162                 # the pass-1 glb: level 3 of the type specimen, the coat as vertex colours
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c, cls.b, cls.R = IN.make(1)
        os.makedirs(OUT, exist_ok=True)
        cls.tex = PP.make_tex(cls.b, cls.c["coat"])
        cls.M = TX.render_mesh(cls.b, SHIP_LEVEL)

    def test_vertex_budget_and_level(self):
        n = P2.counts(self.b)
        shipped = len(self.M["V"])
        print("vertex counts: cage", n["cage_full"], "level 1", n["L1"], "level 2", n["L2"], "level 3", n["L3"], "; shipped (level 2 split at the UV seams)", shipped, "; pass-1 glb", OLD_L3_VERTICES)
        self.assertLessEqual(shipped, MAX_SHIPPED)
        self.assertLessEqual(shipped, OLD_L3_VERTICES / 3.0)
        self.assertEqual(len(self.M["Vw"]), n["L1"])

    def test_silhouette_unchanged_by_the_density_drop(self):
        Vf, Ff, attr, fp, cr, mir = self.b.full()
        sil = {}
        for L in (SHIP_LEVEL, 3):
            V, F, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=L)
            sil[L] = SL.silhouette(V, np.array(F), 304)
        i = SL.iou(sil[SHIP_LEVEL], sil[3])
        print("304 silhouette IoU, the shipped level vs level 3 of the same cage", round(i, 4))
        self.assertGreaterEqual(i, 0.98)

    def test_atlas_is_a_real_texture(self):
        self.assertGreaterEqual(self.tex["col"].shape[0], 1024)
        self.assertEqual(self.tex["col"].shape[:2], self.tex["emit"].shape[:2])
        self.assertGreater(self.tex["emit"].max(), 60)                          # the glow is in its own map

    def test_texture_reproduces_the_coat(self):
        """Sample the baked atlas at the centre of every level-2 face and compare it with the coat evaluated directly there: no wrong islands, no overlaps."""
        M, b = self.M, self.b
        Vw, Fw, Nw = M["Vw"], M["Fw"], M["Nw"]
        uv = TX.face_uv(b, Vw, Fw, M["fpart"], M["attr"])[0]
        uc = uv.mean(1)
        size = self.tex["col"].shape[0]
        x = np.clip(uc[:, 0].astype(int), 0, size - 1); y = np.clip(uc[:, 1].astype(int), 0, size - 1)
        got = self.tex["col"][y, x]
        Pc = Vw[Fw].mean(1); Nc = Nw[Fw].mean(1); Ac = M["attr"][Fw].mean(1)
        o = CT.coat(b.ctx, Pc, Ac, M["fpart"], Nc, Ac[:, 3], self.c["coat"], "open")
        want = CT.lin_to_srgb(o["col"])
        err = np.abs(got - want).max(1)
        print("texture vs coat at the face centres: median error", round(float(np.median(err)), 1), "p90", round(float(np.percentile(err, 90)), 1), "/ 255")
        self.assertLess(float(np.median(err)), 6.0)
        self.assertLess(float(np.percentile(err, 90)), 40.0)

    def test_glb_has_uvs_normals_and_a_material_texture(self):
        p = os.path.join(OUT, "_p2_mesh.glb")
        r = s20glb.build(self.b, self.R, self.M, self.tex, p)
        d = open(p, "rb").read()
        n = struct.unpack("<I", d[12:16])[0]
        js = json.loads(d[20:20 + n])
        a = js["meshes"][0]["primitives"][0]["attributes"]
        self.assertIn("TEXCOORD_0", a); self.assertIn("NORMAL", a); self.assertNotIn("COLOR_0", a)
        m = js["materials"][0]
        self.assertIn("baseColorTexture", m["pbrMetallicRoughness"]); self.assertIn("emissiveTexture", m)
        self.assertEqual(r["verts"], len(self.M["V"]))
        os.remove(p)

    def test_normals_continuous_across_uv_seams(self):
        M = self.M
        Nn = M["N"]
        w = M["Nw"][M["vid"]]
        self.assertLess(float(np.abs(Nn - w).max()), 1e-9)                       # a split vertex carries the welded vertex's smooth normal
        self.assertLess(float(np.abs(np.linalg.norm(Nn, axis=1) - 1).max()), 1e-6)

    def test_normals_do_not_change_abruptly(self):
        rep = P2.normal_report(self.b)
        print("face angle max", round(rep["face_max"], 1), "deg;", rep["face_bad"], "edges over 20 of", rep["edges"], "; creases (toe beads) excluded:", rep["creases"],
              "; junction gradient max (edges >= 0.01 H)", round(rep["grad_max_ge_0p01"], 1), "deg per 0.1 H;", rep["grad_bad_ge_0p01"], "over 35 of", rep["grad_edges_ge_0p01"], "; worst", rep["worst"][:3])
        self.assertEqual(rep["face_bad"], 0, rep["by_part"] if "by_part" in rep else "")
        self.assertEqual(rep["grad_bad_ge_0p01"], 0)

    def test_the_cage_was_relaxed(self):
        lg = self.b.ctx["log"]
        print("relax", lg["relax"], "junctions", lg["junctions"])
        self.assertLess(lg["relax"]["edge_ratio_after"], lg["relax"]["edge_ratio_before"])
        self.assertLessEqual(lg["limit"]["max_err"], 0.004)


if __name__ == "__main__":
    unittest.main()
