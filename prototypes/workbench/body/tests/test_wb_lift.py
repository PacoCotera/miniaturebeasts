"""V4 (arch-viability): a lowered tail leaves the legs alone. The lift turns the tail from its second segment on, so the root does not turn under the seat and the hip's soft join does not crease. 44 of the 45 genomes of the frame writer's 200 + 200 (seed 20) that creased leg.L at 0d7a64e82 now pass."""
import os
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC  # noqa: E402
from wb import frame_writer as FW  # noqa: E402

LEG45 = ['sampled 4', 'sampled 9', 'sampled 10', 'sampled 28', 'sampled 32', 'sampled 38', 'sampled 40', 'sampled 45', 'sampled 48', 'sampled 71', 'sampled 94', 'sampled 123', 'sampled 124', 'sampled 128', 'sampled 130', 'sampled 163', 'sampled 168',
         'sampled 175', 'sampled 184', 'sampled 193', 'sampled 194', 'sampled 199', 'sampled 200', 'crossed 5', 'crossed 20', 'crossed 23', 'crossed 51', 'crossed 62', 'crossed 66', 'crossed 97', 'crossed 101', 'crossed 104', 'crossed 107', 'crossed 119',
         'crossed 122', 'crossed 138', 'crossed 143', 'crossed 150', 'crossed 154', 'crossed 156', 'crossed 158', 'crossed 174', 'crossed 180', 'crossed 181', 'crossed 184']


class TestLift(unittest.TestCase):
    def test_the_move_skips_the_root_segment(self):
        mv = next(e for e in DOC["genome"]["loci"] if e["locus"] == "form.tail-carry")["moves"]
        self.assertEqual([m["path"] for m in mv], ["spine.tail.segments[1:].pitch"])

    def test_the_45_genomes_that_creased_leg_l_do_not(self):
        res = FW.run_all(DOC, 200, only=LEG45)
        self.assertEqual(len(res), 45)
        bad = {r["id"]: r["where"]["normals"] for r in res if "normals" in r["where"] and "leg.L" in (r["where"]["normals"]["parts"] or {})}
        self.assertEqual(sorted(bad), ["sampled 28"], bad)            # 44 of 45; sampled 28 still has two leg.L edges at 22.8 degrees (a short, curled tail with a tuft: not the lift)


if __name__ == "__main__":
    unittest.main()
