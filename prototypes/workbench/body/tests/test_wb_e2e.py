"""Workbench chunk 3, end to end with a real proxy worker (one S20 build, about 20 s): a render job builds the cage and the views into the cache; the same request again is answered from the cache; a build job reuses the stored cage; the cage hash is S20's baseline."""
import json, os, shutil, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_e2e")
BASE = json.load(open(os.path.join(BODY, "tests", "fixtures", "wb_s20_baseline.json")))


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S20x.json"), dict(S.read_spec(os.path.join(BODY, "species", "S20.json")), species="S20x"))
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=1)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_render_then_cache_hits(self):
        j = self.srv.submit("S20x", "render", dict(modes=["clay", "wire"], az=[32], sizes=[96]), None)
        self.srv.wait(j, 120)
        self.assertEqual(j.state, "done", j.error)
        r = j.result
        self.assertEqual(r["cage"]["cage_hash"], BASE["type_cage_hash"])
        self.assertFalse(r["cage"]["cached"])
        self.assertEqual([v["cached"] for v in r["views"]], [False, False])
        for v in r["views"]:
            self.assertEqual(open(v["path"], "rb").read(8), b"\x89PNG\r\n\x1a\n")
        j2 = self.srv.submit("S20x", "render", dict(modes=["clay", "wire"], az=[32], sizes=[96]), None)
        self.assertEqual((j2.state, j2.cached), ("done", True))
        # a new view of the same cage: the cage comes from the cache, the picture is rendered
        j3 = self.srv.submit("S20x", "render", dict(modes=["parts"], az=[90], sizes=[48]), None)
        self.srv.wait(j3, 60)
        self.assertEqual(j3.state, "done", j3.error)
        self.assertTrue(j3.result["cage"]["cached"])
        self.assertFalse(j3.result["views"][0]["cached"])
        j4 = self.srv.submit("S20x", "build", {}, None)
        self.assertEqual((j4.state, j4.cached), ("done", True))
        self.assertEqual(j4.result["cage"]["vertices"], BASE["type_cage_vertices"])

    def test_z_a_broken_file_fails_with_its_field(self):
        sp = self.srv.species["S20x"]
        bad = json.loads(json.dumps(sp.spec))
        del bad["parts"]["torso"]["section"]
        S.write_spec(sp.path, bad)
        j = self.srv.submit("S20x", "build", {}, None)
        self.srv.wait(j, 60)
        self.assertEqual(j.state, "failed")
        self.assertEqual((j.field, j.error), ("torso", "torso: missing section"))


if __name__ == "__main__":
    unittest.main()
