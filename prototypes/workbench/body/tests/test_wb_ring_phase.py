"""V11 (arch-viability-2): 23 wild genomes with a tuft failed the mesh check's planarity in the neck (0.60 to 0.69 against 0.6) while the same genomes with a lantern or no tip passed (0.58). The cause: the tuft's first ring sits at 0.04 H (V3), and the whole sequence of rings from the tip to the vertical rings started there, so the last stepped ring before the vertical rings, the ring under the head, landed 0.02 H lower than the default phase puts it. A tip with its own first ring now moves that ring only; the rings from the second on are the default ones."""
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC, individual, tip  # noqa: E402
from wb import facade as F  # noqa: E402


def stations(form):
    b = F.build(DOC, individual(*tip(form))).body
    G = b.ctx["T"]
    ss = np.array(G.stations(b.ctx["spec"]))
    return G.L - ss, ss                                                       # each ring's distance from the crown, and its s from the tip


class TestRingPhase(unittest.TestCase):
    def test_a_tuft_moves_only_the_first_ring(self):
        (t, ts), (l, ls) = stations("tuft"), stations("lantern")
        self.assertAlmostEqual(float(ls[0] - ts[0]), 0.02, 6)               # the first ring: 0.06 H from the end for a lantern, 0.04 for a tuft
        both = [x for x in t[:-1] if x < 2.0 and np.min(np.abs(l - x)) < 1e-6]
        self.assertGreaterEqual(len(both), 12)                              # the rings from the neck down to the back are the same ones
        self.assertEqual([x for x in t if x < 1.2 and np.min(np.abs(l - x)) > 1e-6], [])


if __name__ == "__main__":
    unittest.main()
