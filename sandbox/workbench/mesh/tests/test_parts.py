"""Round 5, the parts view: the body carries _PART (the cage part each vertex came from), the names are in the glb's asset.extras.parts, the left parts are on the left and the right on the right, and the glb is
byte-identical across two builds."""
import os, sys, json, struct, hashlib, subprocess, unittest
import numpy as np
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
import bpy
from stop5 import build_full


class T(unittest.TestCase):
    def test_part_attribute_on_the_body(self):
        root = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
        H, sc, _ = build_full(2, os.path.join(root, "out", "mesh", "test-tex"))
        me = sc.final.data
        part = np.zeros(len(me.vertices), dtype=np.int32); me.attributes["_PART"].data.foreach_get("value", part)
        P = np.array([v.co[:] for v in me.vertices])
        names = sc.part_names
        self.assertEqual(names[:2], ["head", "torso"])
        for i, n in enumerate(names):
            m = part == i
            self.assertGreater(m.sum(), 100, n)
            if n.endswith(".L"):
                self.assertGreater(np.median(P[m, 1]), 0.1, n)
            if n.endswith(".R"):
                self.assertLess(np.median(P[m, 1]), -0.1, n)
        self.assertEqual([g.name for g in sc.final.vertex_groups if g.name.startswith("_part")], [])      # the temporary groups are gone (they are not bones)
        self.assertGreater(P[part == 0][:, 2].mean(), P[part == 1][:, 2].mean())      # the head is above the torso

    def test_glb_carries_names_and_is_byte_identical(self):
        root = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
        shas = []
        for k in range(2):
            out = os.path.join(root, "out", "mesh", f"parts-glb-{k}"); os.makedirs(out, exist_ok=True)
            subprocess.run([sys.executable, os.path.join(HERE, "stop6.py"), out], check=True, env=dict(os.environ, GLB_LEVEL="2"), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            b = open(os.path.join(out, "loika.glb"), "rb").read(); shas.append(hashlib.sha256(b).hexdigest())
            jl = struct.unpack("<I", b[12:16])[0]; j = json.loads(b[20:20 + jl])
            self.assertEqual(j["asset"]["extras"]["parts"][:2], ["head", "torso"])
            body = [m for m in j["meshes"] if m["name"] == "loika_L"][0]["primitives"][0]["attributes"]
            self.assertIn("_PART", body)
            self.assertEqual(len(j["asset"]["extras"]["parts"]), 10)      # head, torso, four legs, four paws (join B added four bridges)
        self.assertEqual(shas[0], shas[1])


if __name__ == "__main__":
    unittest.main()
