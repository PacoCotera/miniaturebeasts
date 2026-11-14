"""Chunk 30: the mesh body source. Loika's S01-m2 is built by the studio from a signed sculpt: the file's mesh block and its either-or rule, the eight mesh checks (green on Loika, each red on the broken sculpt that names it),
the built body (sculpt and leaf part at the crest socket), the face decal at the sidecar's stations, the export GLB with the mesh in its stamp, and the importer's fit. Under the bpy venv (the import and the export need Blender)."""
import copy, json, os, shutil, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import checks as CH
from checks import ctx as CX
import meshsource as MS
import species_v1 as V1
from wb import facade as F

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def s01():
    with open(os.path.join(BODY, "species_v1", "S01.json")) as fh:
        return json.load(fh)


def file_rows(doc):
    return {r["id"]: r for r in CH.run("file", CX.Ctx(doc, doc=doc))}


def write_glb(path, V, F_, uv=None, texture=False, pad=0, extra_piece=None):
    """A bare GLB of triangles (V is z up, as the studio holds it): positions, indices, optional UV, a baked texture, padding bytes."""
    V = np.asarray(V, float)
    F_ = np.asarray(F_, int)
    if extra_piece is not None:
        V2, F2 = extra_piece
        F_ = np.vstack([F_, np.asarray(F2) + len(V)])
        V = np.vstack([V, V2])
    Y = np.stack([V[:, 0], V[:, 2], -V[:, 1]], 1).astype(np.float32)
    bin_ = bytearray()
    views, acc = [], []

    def add(arr, target, ctype, atype, mm=False):
        while len(bin_) % 4:
            bin_.append(0)
        off = len(bin_)
        bin_.extend(arr.tobytes())
        views.append(dict(buffer=0, byteOffset=off, byteLength=arr.nbytes, target=target))
        a = dict(bufferView=len(views) - 1, componentType=ctype, count=int(arr.shape[0]), type=atype)
        if mm:
            a["min"], a["max"] = Y.min(0).tolist(), Y.max(0).tolist()
        acc.append(a)
        return len(acc) - 1
    attrs = dict(POSITION=add(Y, 34962, 5126, "VEC3", True))
    if uv is not None:
        attrs["TEXCOORD_0"] = add(np.asarray(uv, np.float32), 34962, 5126, "VEC2")
    idx = add(F_.astype(np.uint32).reshape(-1), 34963, 5125, "SCALAR")
    js = dict(asset=dict(version="2.0"), scene=0, scenes=[dict(nodes=[0])], nodes=[dict(mesh=0, name="body")], meshes=[dict(primitives=[dict(attributes=attrs, indices=idx, material=0)])], materials=[dict(name="m", pbrMetallicRoughness=dict(metallicFactor=0))])
    if texture:
        png = open(os.path.join(BODY, "species_v1", "meshes", "S01", "stand", "stand-48x48.png"), "rb").read()
        while len(bin_) % 4:
            bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(png)))
        bin_.extend(png)
        js["images"] = [dict(mimeType="image/png", bufferView=len(views) - 1)]
        js["textures"] = [dict(source=0)]
        js["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"] = dict(index=0)
    if pad:
        while len(bin_) % 4:
            bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=pad))
        bin_.extend(np.random.default_rng(1).integers(0, 255, pad, dtype=np.uint8).tobytes())
    js["bufferViews"], js["accessors"] = views, acc
    MS.write_glb(path, js, bytes(bin_))


class Sculpts(unittest.TestCase):
    """A scratch copy of S01-m2's sidecar next to a broken GLB, and the file that names it."""
    @classmethod
    def setUpClass(cls):
        cls.dir = tempfile.mkdtemp(prefix="mesh30-")
        cls.m = MS.Mesh("meshes/S01/S01-m2.json")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir, ignore_errors=True)

    def doc_for(self, name, V, F_, pin=None, **kw):
        d = os.path.join(self.dir, name)
        os.makedirs(d, exist_ok=True)
        glb = os.path.join(d, "S01-m2.glb")
        write_glb(glb, V, F_, **kw)
        sc = copy.deepcopy(self.m.sc)
        sc["glb"].update(file="S01-m2.glb", sha256=MS.sha256_file(glb), bytes=os.path.getsize(glb))
        sc["read"]["stand"] = {"files": {k: os.path.join(os.path.dirname(self.m.path), v) for k, v in self.m.sc["read"]["stand"]["files"].items()}}
        MS.write_json(os.path.join(d, "S01-m2.json"), sc)
        doc = s01()
        doc["mesh"]["source"] = os.path.join(d, "S01-m2.json")
        doc["mesh"]["sha256"] = pin or sc["glb"]["sha256"]
        return doc

    def states(self, doc):
        return {k: v["state"] for k, v in file_rows(doc).items() if k.startswith("mesh.")}

    def test_the_six_broken_sculpts_are_each_red_on_the_check_that_names_them(self):
        V, F_ = self.m.V, self.m.F
        Vw, Fw = MS.weld(V, F_)
        # an open hole: forty triangles gone from the back
        keep = np.ones(len(F_), bool)
        back = np.where(V[F_].mean(1)[:, 0] < -1.0)[0]
        keep[back[:40]] = False
        hole = self.states(self.doc_for("hole", V, F_[keep]))
        # an invented tail: a closed piece the stand does not show, hung off the rump as its own piece
        a = np.linspace(0, 2 * np.pi, 12, endpoint=False)
        tv = np.array([[-1.9 - 0.9 * t, 0.12 * np.cos(x), 1.0 + 0.12 * np.sin(x)] for t in (0, 1) for x in a] + [[-1.9, 0, 1.0], [-2.8, 0, 1.0]], float)
        tf = [[i, (i + 1) % 12, 12 + (i + 1) % 12] for i in range(12)] + [[i, 12 + (i + 1) % 12, 12 + i] for i in range(12)] + [[24, (i + 1) % 12, i] for i in range(12)] + [[25, 12 + i, 12 + (i + 1) % 12] for i in range(12)]
        tail = self.states(self.doc_for("tail", V, F_, extra_piece=(tv, tf)))
        # a carved stripe across the back
        N = MS.vertex_normals(Vw, Fw)
        Vc = Vw.copy()
        sel = (abs(Vw[:, 0] + 0.2) < 0.06) & (Vw[:, 2] > 1.0) & (abs(Vw[:, 1]) < 0.6)
        Vc[sel] -= N[sel] * 0.04
        stripe = self.states(self.doc_for("stripe", Vc, Fw))
        # a baked colour texture
        tex = self.states(self.doc_for("tex", V, F_, uv=self.m.UV, texture=True))
        # 4 MB
        big = self.states(self.doc_for("big", V, F_, pad=4 * 1024 * 1024))
        # a wrong sha: the file's pin is not the sculpt
        sha = self.states(self.doc_for("sha", V, F_, pin="0" * 64))
        for name, got, red in (("hole", hole, "mesh.watertight"), ("tail", tail, "mesh.parts"), ("stripe", stripe, "mesh.relief"), ("texture", tex, "mesh.flat"), ("4 MB", big, "mesh.size"), ("sha", sha, "mesh.stamp")):
            self.assertEqual(got[red], "fail", (name, got))
            others = [k for k, v in got.items() if v == "fail" and k != red]
            self.assertEqual(others, ["mesh.relief"] if name == "tail" else [], (name, got))          # a thin extra piece is itself a ridge off the smoothed surface

    def test_the_red_rows_carry_their_proof(self):
        V, F_ = self.m.V, self.m.F
        keep = np.ones(len(F_), bool)
        keep[np.where(V[F_].mean(1)[:, 0] < -1.0)[0][:40]] = False
        r = file_rows(self.doc_for("hole2", V, F_[keep]))["mesh.watertight"]
        self.assertIn("open edges", r["measure"])
        self.assertTrue(r["proof"]["svg"].count("<ellipse") >= 1)


class Loika(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.doc = s01()
        cls.rows = F.check_rows(cls.doc)
        cls.by = {r["id"]: r for r in cls.rows}

    def test_the_file_is_valid_and_has_no_cage_fields(self):
        self.assertEqual(V1.validate(self.doc), [])
        self.assertNotIn("spine", self.doc)
        self.assertIn("mesh", self.doc)

    def test_a_file_has_the_cage_or_the_mesh_never_both(self):
        d = copy.deepcopy(self.doc)
        d["spine"] = {}
        e = V1.validate(d)
        self.assertEqual(e[0][0], "spine")
        self.assertIn("never both", e[0][1])
        d = copy.deepcopy(self.doc)
        del d["mesh"]
        self.assertTrue(any(f == "spine" for f, _ in V1.validate(d)))                     # no mesh: the cage fields are required again
        s22 = json.load(open(os.path.join(BODY, "species_v1", "S22.json")))
        self.assertEqual(V1.validate(s22), [])                                           # the cage's file is unchanged

    def test_the_eight_mesh_checks_are_green_and_only_on_a_mesh_file(self):
        ids = ["mesh.watertight", "mesh.budget", "mesh.parts", "mesh.relief", "mesh.flat", "mesh.size", "mesh.stamp", "mesh.read"]
        for i in ids:
            self.assertEqual(self.by[i]["state"], "pass", (i, self.by[i]["measure"]))
        s22 = json.load(open(os.path.join(BODY, "species_v1", "S22.json")))
        self.assertFalse([r for r in CH.run("file", CX.Ctx(s22, doc=s22)) if r["id"].startswith("mesh.")])

    def test_loika_needs_no_exception_and_every_check_passes(self):
        self.assertEqual(self.by["face.flush"]["state"], "pass")
        self.assertEqual(self.by["face.front"]["state"], "pass")
        bad = sorted(i for i, r in self.by.items() if r["state"] != "pass")
        self.assertEqual(bad, [])                                                         # the eyes sit 35 and 36 degrees off the front, the ring is a zone, not a rim

    def test_the_read_scores_are_the_sidecars(self):
        sc = MS.load_json(self.doc["mesh"]["source"])["read"]["scores"]
        got = self.by["mesh.read"]["extra"]["scores"]
        for k in ("304", "96", "48"):
            self.assertAlmostEqual(got[k], sc[k], places=3)
            self.assertGreaterEqual(got[k], 0.82)

    def test_the_sculpt_is_pinned_and_small(self):
        m = MS.Mesh(self.doc["mesh"]["source"])
        self.assertEqual(m.sha, self.doc["mesh"]["sha256"])
        self.assertLess(os.path.getsize(m.glb_path), MS.MAX_BYTES)
        self.assertEqual(len(m.F), m.sc["glb"]["triangles"])
        self.assertEqual(m.sc["schema"], "mb-mesh/1")
        self.assertEqual(MS.sidecar_problems(m.sc), [])
        self.assertEqual(m.glb.flat_faults(), [])
        png, meta = m.glb.zone_map()
        self.assertTrue(png.startswith(b"\x89PNG"))
        self.assertEqual(meta["values"]["1"], "cream")

    def test_the_leaf_is_a_library_part(self):
        sc = MS.load_json("parts/P0001/P0001-p2.json")
        self.assertEqual(sc["schema"], "mb-part/1")
        self.assertEqual(MS.sidecar_problems(sc, "part"), [])
        g = os.path.join(MS.part_dir_of("P0001"), sc["glb"]["file"])
        self.assertEqual(MS.sha256_file(g), sc["glb"]["sha256"])
        self.assertLess(os.path.getsize(g), MS.MAX_PART_BYTES)
        V, F_, _ = MS.Glb(g).triangles()
        Vw, Fw = MS.weld(V, F_)
        self.assertEqual(MS.topology(Fw, len(Vw)), (0, 0, 1))
        self.assertAlmostEqual(float(V[:, 2].max() - V[:, 2].min()), 1.0, places=2)

    def test_the_built_body_has_the_sculpt_and_three_leaves_at_the_crest(self):
        r = F.build(self.doc)
        b = r.body
        self.assertEqual(len(b.placed), 3)
        self.assertEqual(sorted(b.parts), ["P0001", "body"])
        top = b.mesh.socket("crest")["point"]
        for p in b.placed:
            self.assertAlmostEqual(float(p["V"][:, 0].mean()), top[0], delta=0.5)
            self.assertGreater(float(p["V"][:, 2].max()), top[2])
        self.assertIn("mesh S01-m2 " + b.mesh.sha[:8], b.stamp())
        two = F.build(dict(self.doc, signature=dict(self.doc["signature"], count=5))).body
        self.assertEqual(len(two.placed), 5)

    def test_the_face_decal_lands_on_the_skin_at_the_sidecars_stations(self):
        from wb import clayface as CF
        import facedecal as FD
        r = F.build(self.doc)
        mesh = F.proxy_mesh(r.body, 1)
        st = CF.quad_stations(self.doc, FD.Surface(mesh["V"], mesh["F"]), {})
        self.assertEqual(sorted(s["kind"] for s in st), ["eye", "eye", "mouth"])
        side = MS.Mesh(self.doc["mesh"]["source"]).stations()
        for s in st:
            if s["kind"] == "eye":
                self.assertAlmostEqual(abs(float(s["point"][1])), abs(side["eyes"][0]["point"][1]), delta=0.1)


class Fit(unittest.TestCase):
    def test_four_feet_and_a_socket_on_the_head_from_the_mesh_alone(self):
        import meshimport as MI
        m = MS.Mesh("meshes/S01/S01-m2.json")
        bones, meas, soc = MI.fit(m.V, "trotter", ("crest",))
        self.assertEqual(sorted(k for k in meas["feet"]), ["foot.fore.L", "foot.fore.R", "foot.hind.L", "foot.hind.R"])
        self.assertEqual(sorted(bones), sorted(MS.armature_bones("trotter", False, ("crest",))))
        self.assertGreater(soc["crest"][0], 0.3 * meas["length"] + meas["x0"])
        self.assertAlmostEqual(soc["crest"][2], meas["height"], delta=0.01)

    def test_weights_sum_to_one_and_a_sole_is_rigid(self):
        m = MS.Mesh("meshes/S01/S01-m2.json")
        names, J, W = m.glb.skin()
        self.assertEqual(sorted(names), sorted(m.sc["armature"]["bones"]))
        self.assertTrue(np.allclose(W.sum(1), 1.0, atol=1e-3))
        low = m.V[:, 2] < 0.04 * m.sc["bands"]["standing_height"]
        top = np.take_along_axis(J, W.argmax(1)[:, None], 1)[:, 0]
        paws = {i for i, n in enumerate(names) if ".paw." in n}
        feet = low & np.isin(top, list(paws))
        self.assertGreater(feet.sum(), 0.5 * (low & (abs(m.V[:, 1]) > 0.3)).sum())


class Reliefs(unittest.TestCase):
    def test_a_stripe_is_found_and_the_smooth_sculpt_has_none(self):
        m = MS.Mesh("meshes/S01/S01-m2.json")
        self.assertEqual(MS.relief_features(m.V, m.F), [])
        N = MS.vertex_normals(m.V, m.F)
        V = m.V.copy()
        sel = (abs(V[:, 0] + 0.2) < 0.05) & (V[:, 2] > 1.0) & (abs(V[:, 1]) < 0.6)
        V[sel] -= N[sel] * 0.04
        f = MS.relief_features(V, m.F)
        self.assertTrue(f and f[0]["kind"] == "stripe")


class Export(unittest.TestCase):
    def test_the_export_opens_with_the_mesh_in_its_stamp(self):
        from wb import export as EX
        d = tempfile.mkdtemp(prefix="mesh30-exp-")
        try:
            man = EX.make(os.path.join(BODY, "species_v1", "S01.json"), d, stands=False, log=lambda *_: None)
            sha8 = MS.Mesh("meshes/S01/S01-m2.json").sha[:8]
            self.assertIn("mesh S01-m2 " + sha8, man["build"])
            self.assertIn("part P0001-p2", man["build"])
            g = MS.Glb(os.path.join(d, "S01.glb"))
            self.assertIn("mesh S01-m2 " + sha8, g.json["asset"]["extras"]["build"])
            self.assertEqual(g.json["asset"]["extras"]["parts"], ["body", "P0001"])
            self.assertTrue(os.path.isfile(os.path.join(d, "viewer.html")))
            self.assertEqual(len(g.json["skins"]), 1)
            self.assertLess(os.path.getsize(os.path.join(d, "S01.glb")), 3 * 1024 * 1024)
        finally:
            shutil.rmtree(d, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
