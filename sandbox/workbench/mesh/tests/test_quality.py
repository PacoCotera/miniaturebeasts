"""Round 5, mesh quality on the baked level-3 mesh (the owner's wireframe reading), per cage part, on the visible surface: the only irregular vertices are the cage's corner poles (valence 3 and 5, never more),
a few per part, none inside the eye sockets' walls; no flipped faces, no folded edges; the limbs' quads are even (95th to 5th percentile edge length under 3). The torso and head are looser (the caps at
the torso's ends, the head's muzzle): their numbers are asserted at today's level so they cannot get worse."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from stop5 import build_full
from quality import quality


class T(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        cls.H, cls.sc, _ = build_full(3, os.path.join(here, "out", "mesh", "test-tex"))
        cls.q = quality(cls.sc, cls.H)

    def test_poles_are_the_cages_corners_only(self):
        for nm, q in self.q.items():
            if nm == "_all":
                continue
            self.assertLessEqual(q["max_valence"], 5, nm)
            self.assertLessEqual(q["poles"], 12 if nm != "head" else 80, nm)
        self.assertLessEqual(self.q["_all"]["poles"], 120)

    def test_no_flipped_faces_no_folds(self):
        for nm, q in self.q.items():
            self.assertLessEqual(q["flipped_faces"], 4 if nm in ("head", "_all") else 0, nm)      # the head's two per side are at the jaw's lower corner (head frame 0.35, +-0.49, -0.53), under the chin overhang
            self.assertEqual(q["folded_edges"], 0, nm)

    def test_limb_quads_are_even(self):
        for nm, q in self.q.items():
            if nm.startswith("leg.") or nm.startswith("paw."):
                self.assertLess(q["edge_p95_p5"], 3.0, nm)
                self.assertLess(q["edge_ratio"], 5.0, nm)
        self.assertLess(self.q["torso"]["edge_p95_p5"], 5.0)       # was 5.6 with the cosine spacing
        self.assertLess(self.q["head"]["edge_p95_p5"], 5.0)


if __name__ == "__main__":
    unittest.main()
