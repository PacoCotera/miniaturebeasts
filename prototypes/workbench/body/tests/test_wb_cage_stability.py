"""A locus changes only its own region of the cage. Known failure, left in the open: the rings come from the stalk, so a tail gene slides them past the limb sockets (leg u 1.45, arm u 1.22 from the crown) and the nearest ring changes,
which moves leg.L and the arm by up to 0.06 H and, at tail length x1.10, x1.25 and x1.30, creases leg.L. The fix (the nearest ring at or below the socket, fix78/socket-ring.patch) changes the cage hashes of the twelve's seeds 4, 6 and 12, which
the brief keeps identical, so it is not applied; this test is the one that must pass when it is."""
import json
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from wb import facade as F  # noqa: E402

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
TAIL = [e for e in DOC["genome"]["loci"] if e["locus"].startswith("body.tail-") and e["op"] == "blend"]


def part_vertices(b, name):
    return np.array(b.cage.V)[np.array(b.part) == b.parts[name]]


class TestOwnRegion(unittest.TestCase):
    @unittest.expectedFailure
    def test_a_tail_locus_leaves_the_limbs_alone(self):
        base = F.build(DOC, "type").body
        for e in TAIL:
            for v in (e["limits"][0], e["limits"][1], 1.1 if e["locus"] == "body.tail-length" else e["limits"][1]):
                b = F.build(DOC, f"value:{e['locus']}={v}").body
                for part in ("leg.L", "arm.L"):
                    a, c = part_vertices(base, part), part_vertices(b, part)
                    self.assertTrue(a.shape == c.shape and np.allclose(a, c, atol=1e-9), f"{e['locus']}={v}: {part} moved")


if __name__ == "__main__":
    unittest.main()
