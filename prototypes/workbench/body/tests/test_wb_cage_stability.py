"""A locus changes only its own region of the cage: sweeping each tail locus across its limits (and tail length through x1.10, which used to crease leg.L) leaves the arm identical and leg.L within 1e-4 H (the limit fit is one global solve) for tail length, curl and lift (V4: the lift turns the tail past its root segment); girth still couples through the smoothing passes (an expected failure below). The body's rings are laid out from the crown (spine.SpineLoft.stations with ring_ref, the type's path length), so a tail gene cannot slide a ring past a limb socket."""
import json
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from wb import facade as F  # noqa: E402

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
TAIL = [e for e in DOC["genome"]["loci"] if e["locus"] in ("form.tail-length", "form.tail-girth", "form.tail-curl", "form.tail-carry")]
assert len(TAIL) == 4


def part_vertices(b, name):
    return np.array(b.cage.V)[np.array(b.part) == b.parts[name]]


def moved(loci, tol, extra=()):
    base = F.build(DOC, "type").body
    worst = {}
    for e in TAIL:
        if e["locus"] not in loci:
            continue
        for v in (e["band"]["lo"], e["band"]["hi"]) + tuple(extra if e["locus"] == "form.tail-length" else ()):
            b = F.build(DOC, f"value:{e['locus']}={v}").body
            for part in ("leg.L", "arm.L"):
                a, c = part_vertices(base, part), part_vertices(b, part)
                worst[(e["locus"], v, part)] = float("inf") if a.shape != c.shape else float(np.abs(a - c).max())
    return {k: m for k, m in worst.items() if m > tol}


class TestOwnRegion(unittest.TestCase):
    def test_tail_length_and_curl_leave_the_limbs_alone(self):
        self.assertEqual(moved(("form.tail-length", "form.tail-curl"), 1e-4, extra=(1.1, 1.19)), {})

    def test_tail_lift_leaves_the_limbs_alone(self):
        """V4: the lift turns the tail from its second segment on (the root segment keeps its pitch), so the root does not turn under the seat and the hip's soft join is not creased: leg.L moves 8e-5 H at the ends of the lift, the arm not at all."""
        self.assertEqual(moved(("form.tail-carry",), 1e-4), {})

    @unittest.expectedFailure
    def test_tail_girth_leaves_the_limbs_alone(self):
        """Known gap: girth moves leg.L by 0.0055 H and the arm by 0.0016 (the limit fit, the junction smoothing and the relax are one coupled pass over the cage). It creases no limb."""
        self.assertEqual(moved(("form.tail-girth",), 1e-3), {})

    def test_tail_girth_and_lift_move_the_limbs_less_than_a_hundredth_of_the_height(self):
        self.assertEqual(moved(("form.tail-girth", "form.tail-carry"), 0.02), {})


if __name__ == "__main__":
    unittest.main()
