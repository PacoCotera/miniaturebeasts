"""Round 5, the toes in three.js (the glb the viewer plays): through the rest pose and the walk clip every paw's beans follow their own paw's bone (own side, own phase), stay glued to the paw's dome, and the
middle bean stays the front-most of the three along the paw's own forward. Needs node and the Playwright in /home/mb/pw156 (as the other three.js tools do)."""
import os, sys, json, subprocess, unittest
import numpy as np
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
from housefield import House

PAWS = ("fore_paw.L", "fore_paw.R", "hind_paw.L", "hind_paw.R")
LEG = ("fore.L", "fore.R", "hind.L", "hind.R")
gl = lambda v: np.array([v[1], v[2], v[0]])      # Blender (x, y, z) -> the glb's frame (y, z, x)


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
        out = os.path.join(root, "out", "mesh", "toes-three"); os.makedirs(out, exist_ok=True)
        env = dict(os.environ, GLB_LEVEL="2")
        subprocess.run([sys.executable, os.path.join(HERE, "stop6.py"), out], check=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run([sys.executable, os.path.join(HERE, "viewer_gen.py"), os.path.join(out, "loika.glb"), os.path.join(out, "viewer.html")], check=True, stdout=subprocess.DEVNULL)
        cls.poses = json.loads(subprocess.run(["node", os.path.join(HERE, "tools", "toes-three.mjs"), os.path.join(out, "viewer.html")], check=True, capture_output=True, text=True).stdout)
        cls.legs = {lg["name"]: lg for lg in House("S01").legs}

    def test_beans_follow_their_own_paw_and_the_middle_bean_leads(self):
        self.assertEqual(len(self.poses), 9)
        for pose in self.poses:
            for pi, p in enumerate(PAWS):
                r = pose["paws"][p]
                self.assertEqual(r["beanBone"].replace(".", ""), p.replace(".", ""))
                D = np.array(r["D"]).reshape(4, 4).T
                rest = self.poses[0]["paws"][p]
                for t in range(3):
                    np.testing.assert_allclose(r["beans"][t], D[:3, :3] @ rest["beans"][t] + D[:3, 3], atol=3e-3, err_msg=f"{p} bean {t} {pose['name']}")
                np.testing.assert_allclose(r["dome"], D[:3, :3] @ rest["dome"] + D[:3, 3], atol=0.02, err_msg=f"{p} dome {pose['name']}")
                R = self.legs[LEG[pi]]["paw_R"]
                fwd, lat = D[:3, :3] @ gl(R[:, 0]), D[:3, :3] @ gl(R[:, 1])
                dc = np.array(r["dome"]); cen = [np.array(c) for c in r["beans"]]
                proj = [(c - dc) @ fwd for c in cen]; lats = [(c - dc) @ lat for c in cen]
                self.assertGreater(proj[1] - max(proj[0], proj[2]), 0.015, f"{p} {pose['name']}: the middle bean is not the front-most")
                self.assertLess(lats[0] * lats[2], 0, f"{p} {pose['name']}: the side beans are not on opposite sides")
        # the walk moves the paws: the left and right paws of a pair are in opposite phase (a fore with the far hind), not the same
        d = lambda pose, p: np.array(pose["paws"][p]["beans"][1])
        a = np.array([d(q, "fore_paw.L")[2] for q in self.poses[1:]]); b = np.array([d(q, "hind_paw.L")[2] for q in self.poses[1:]])
        self.assertGreater(np.ptp(a), 0.02)
        self.assertLess(np.corrcoef(a, b)[0, 1], 0.0)


if __name__ == "__main__":
    unittest.main()
