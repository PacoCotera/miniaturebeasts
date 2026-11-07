"""R4, the studio GLB: every sculpt and part has a compressed studio GLB beside it, pinned by sha in its sidecar. The sculpt's carries the family's bones, one morph target per scripted key named like the species file's `keys`, and a weight on every vertex;
both are meshopt-compressed and at most 300 KB. The server finds sculpts and parts by the sha the species file pins, serves the studio GLB at /cas/<sha>.glb, and lists Loika with no error (a missing sha is an error on the row, never a blank stage).
Under the bpy venv's python (numpy); the decoding checks need `npm ci` in wb/glbpack and say so when it is not done."""
import json, os, shutil, sys, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import meshrig as MR
import meshsource as MS
import studio_glb as SG
from wb import server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_studio_glb")
MESH = "meshes/S01/S01-m2.json"
PARTS = ["parts/P0001/P0001-p1.json", "parts/P0001/P0001-p2.json"]


def s01():
    with open(os.path.join(BODY, "species_v1", "S01.json")) as fh:
        return json.load(fh)


def get(url):
    try:
        r = urllib.request.urlopen(url, timeout=10)
    except urllib.error.HTTPError as e:
        r = e
    return r.status, dict(r.headers), r.read()


class Pinned(unittest.TestCase):
    def test_each_sidecar_pins_its_studio_glb_by_sha_and_size_inside_the_cap(self):
        for rel in [MESH] + PARTS:
            sc = MS.load_json(rel)
            st = sc["studio"]
            p = os.path.join(os.path.dirname(MS.abspath(rel)), st["file"])
            self.assertEqual(st["schema"], SG.SCHEMA, rel)
            self.assertEqual(MS.sha256_file(p), st["sha256"], rel)
            self.assertEqual(os.path.getsize(p), st["bytes"], rel)
            self.assertLessEqual(st["bytes"], 300 * 1024, rel)
            self.assertEqual(st["source_sha256"], sc["glb"]["sha256"], rel)                     # made from the signed sculpt the file pins
        self.assertEqual(MS.sha256_file(MS.abspath("meshes/S01/S01-m2.glb")), s01()["mesh"]["sha256"])      # the signed sculpt itself is untouched

    def test_the_sculpts_bones_are_the_family_registrys_and_its_targets_are_the_files_keys(self):
        sc = MS.load_json(MESH)
        g = MS.Glb(os.path.join(os.path.dirname(MS.abspath(MESH)), sc["studio"]["file"]))
        joints = [g.json["nodes"][j]["name"] for j in g.json["skins"][0]["joints"]]
        self.assertEqual(sorted(joints), sorted(MS.armature_bones(sc["family"], tail=False, sockets=("crest",))))
        self.assertEqual(sorted(sc["studio"]["bones"]), sorted(joints))
        names = g.json["meshes"][0]["extras"]["targetNames"]
        self.assertEqual(names, [k["id"] for k in s01()["keys"]])
        self.assertEqual(names, sc["studio"]["morph_targets"])
        self.assertEqual(len(g.json["meshes"][0]["primitives"][0]["targets"]), len(names))
        self.assertEqual(g.json["extensionsRequired"], ["EXT_meshopt_compression", "KHR_mesh_quantization"])
        self.assertEqual(g.flat_faults(), [])                                                     # no material, no colour: the zone map is the only image
        self.assertIsNotNone(g.zone_map())

    def test_a_part_is_its_surface_alone(self):
        for rel in PARTS:
            sc = MS.load_json(rel)
            g = MS.Glb(os.path.join(os.path.dirname(MS.abspath(rel)), sc["studio"]["file"]))
            self.assertEqual(sorted(g.json["meshes"][0]["primitives"][0]["attributes"]), ["NORMAL", "POSITION", "TEXCOORD_0"])
            self.assertNotIn("skins", g.json)


@unittest.skipUnless(SG.available(), "meshoptimizer is not installed: run `npm ci` in wb/glbpack")
class Decoded(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.m = MS.Mesh(MESH)
        cls.sc = cls.m.sc
        cls.r = SG.check_packed(os.path.join(cls.m.dir, cls.sc["studio"]["file"]))

    def test_the_surface_is_the_sculpts_surface(self):
        V, F, _ = self.m.glb.triangles()
        self.assertEqual(self.r["vertices"], len(V))
        self.assertEqual(self.r["triangles"], len(F))
        self.assertEqual(self.r["index_max"], len(V) - 1)
        T = V[F]
        area = 0.5 * np.linalg.norm(np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]), axis=1).sum()
        self.assertAlmostEqual(self.r["area"] / area, 1.0, delta=0.002)
        got = np.array(self.r["bounds"])                                                          # in the file's y-up axes
        want = np.array([[V[:, 0].min(), V[:, 0].max()], [V[:, 2].min(), V[:, 2].max()], [-V[:, 1].max(), -V[:, 1].min()]])
        self.assertLess(float(np.abs(got - want).max()), 2e-3)
        self.assertTrue(0.98 < self.r["normal_len"][0] and self.r["normal_len"][1] < 1.02, self.r["normal_len"])

    def test_every_vertex_is_weighted_and_the_weights_add_up_to_one(self):
        self.assertEqual(self.r["unweighted"], 0)
        self.assertEqual(self.sc["studio"]["weights_empty"], 0)
        self.assertAlmostEqual(self.r["weight_sum"][0], 1.0, places=6)
        self.assertAlmostEqual(self.r["weight_sum"][1], 1.0, places=6)
        self.assertLess(self.r["joint_max"], len(self.r["joints"]))

    def test_the_torso_girth_target_is_the_rigs_key_at_amount_one(self):
        rig = MR.of(self.m)
        want = float(np.linalg.norm(rig.key_offset({"key.form.torso-girth": 1.0}), axis=1).max())
        t = self.r["targets"][0]
        self.assertAlmostEqual(t["max"] / want, 1.0, delta=0.01)
        self.assertGreater(t["moved"], 1000)
        self.assertEqual(self.r["target_names"], ["key.form.torso-girth"])


class Served(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S01.json"), S.read_spec(os.path.join(BODY, "species_v1", "S01.json")))
        bad = s01()
        bad["id"] = "S99"
        bad["mesh"]["source"] = "meshes/S99/S99-m1.json"
        bad["mesh"]["sha256"] = "00" * 32
        with open(os.path.join(sp, "S99.json"), "w") as fh:
            json.dump(bad, fh, indent=1)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        cls.srv.start()
        cls.url = f"http://127.0.0.1:{cls.srv.port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_loika_is_listed_with_no_error_and_a_missing_sha_is_an_error_on_its_row(self):
        rows = {r["id"]: r for r in json.loads(get(self.url + "/api/species")[2])}
        self.assertIsNone(rows["S01"]["error"])
        self.assertIn("00000000", rows["S99"]["error"])
        self.assertIn("not here", rows["S99"]["error"])

    def test_the_studio_answer_names_the_studio_glbs_and_each_is_served_by_its_sha(self):
        a = json.loads(get(self.url + "/api/species/S01")[2])
        self.assertIsNone(a["error"])
        st = json.loads(get(self.url + "/api/species/S01/studio")[2])
        self.assertEqual(st["sculpt"]["morph_targets"], ["key.form.torso-girth"])
        self.assertEqual(len(st["parts"]), 1)
        for one in [st["sculpt"]] + st["parts"]:
            status, h, body = get(self.url + one["url"])
            self.assertEqual(status, 200)
            self.assertEqual(h["Content-Type"], "model/gltf-binary")
            self.assertIn("immutable", h["Cache-Control"])
            self.assertEqual(len(body), one["bytes"])
            import hashlib
            self.assertEqual(hashlib.sha256(body).hexdigest(), one["sha256"])
        self.assertEqual(get(self.url + "/cas/" + "ab" * 32 + ".glb")[0], 404)
        self.assertEqual(get(self.url + "/api/species/S99")[0], 200)
        self.assertIsNone(json.loads(get(self.url + "/api/species/S99/studio")[2])["sculpt"])


class ByTheSha(unittest.TestCase):
    def test_a_sculpt_or_part_is_found_by_its_pinned_sha_when_the_path_is_not_there(self):
        doc = s01()
        self.assertEqual(MS.resolve("meshes/gone/none.json", doc["mesh"]["sha256"]), MS.abspath(MESH))
        pe = dict(doc["mesh"]["parts"][0], part="parts/gone/none.json")
        self.assertEqual(MS.part_path(pe), MS.abspath(PARTS[1]))
        self.assertIsNone(MS.mesh_problem(doc["mesh"]))
        doc["mesh"]["source"] = "meshes/gone/none.json"
        self.assertIsNone(MS.mesh_problem(doc["mesh"]))                                          # found by sha
        m = MS.Mesh(doc["mesh"]["source"], doc["mesh"]["sha256"])
        self.assertEqual(m.sc["id"], "S01-m2")

    def test_a_path_that_is_there_is_never_swapped_for_another_file(self):
        doc = s01()
        self.assertEqual(MS.resolve("meshes/S01/S01-m1.json", doc["mesh"]["sha256"]), MS.abspath("meshes/S01/S01-m1.json"))   # the stamp check, not the resolver, refuses a different sculpt

    def test_a_cache_folder_is_searched_after_the_code(self):
        d = os.path.join(SCRATCH, "cache")
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(os.path.join(d, "meshes", "X1"))
        sc = dict(schema=MS.SCHEMA_MESH, id="X1-m1", glb=dict(file="X1-m1.glb", sha256="cd" * 32, bytes=1))
        with open(os.path.join(d, "meshes", "X1", "X1-m1.json"), "w") as fh:
            json.dump(sc, fh)
        old = os.environ.get("WB_SCULPT_CACHE")
        os.environ["WB_SCULPT_CACHE"] = d
        try:
            self.assertEqual(MS.find_by_sha("cd" * 32), os.path.join(d, "meshes", "X1", "X1-m1.json"))
            self.assertIsNone(MS.find_by_sha("ef" * 32))
        finally:
            if old is None:
                del os.environ["WB_SCULPT_CACHE"]
            else:
                os.environ["WB_SCULPT_CACHE"] = old
            MS._INDEX.clear()
            shutil.rmtree(SCRATCH, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
