"""V2 (arch-viability): a whisker and a fang are shown at their cage (the species file's `subdiv_offset` -1), one subdivision level less than the body; the cage is fitted so the width and the centre line stay where they were at level 1."""
import copy
import os
import sys
import unittest

import numpy as np

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)
from tests.test_wb_viability import DOC, W, individual  # noqa: E402
from wb import facade as F  # noqa: E402
import appendages as AP  # noqa: E402
import species_v1 as SV  # noqa: E402
from s20p2 import level_arrays  # noqa: E402

IND = individual(*W())
OLD = copy.deepcopy(DOC)
for _f in ("whisker", "fang"):
    OLD["legacy"]["appendages"][_f]["subdiv_offset"] = 0


def counts(body, level):
    m = F.proxy_mesh(body, level)
    part = np.asarray(m["part"])
    return {m["names"][int(p)]: int((part == p).sum()) for p in set(part.tolist())}


class TestShallowShells(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.new = F.build(DOC, IND).body
        cls.old = F.build(OLD, IND).body

    def test_file_says_minus_one_and_the_validator_reads_it(self):
        ap = DOC["legacy"]["appendages"]
        self.assertEqual((ap["whisker"]["subdiv_offset"], ap["fang"]["subdiv_offset"]), (-1, -1))
        self.assertEqual(SV.validate(DOC), [])
        bad = copy.deepcopy(DOC)
        bad["legacy"]["appendages"]["fang"]["subdiv_offset"] = -2
        self.assertEqual([p for p, _ in SV.validate(bad)], ["legacy.appendages.fang.subdiv_offset"])

    def test_vertices_at_level_1(self):
        n = counts(self.new, 1)
        for k, v in n.items():
            if k.startswith("whisker"):
                self.assertLessEqual(v, 2 * 44, k)                  # both sides
            if k.startswith("fang"):
                self.assertLessEqual(v, 2 * 26, k)
        o = counts(self.old, 1)
        self.assertEqual(o["whisker.0"], 2 * 170)
        self.assertEqual(o["fang.0"], 2 * 98)

    def test_the_rest_of_the_body_is_the_same(self):
        n, o = counts(self.new, 1), counts(self.old, 1)
        self.assertEqual({k: v for k, v in n.items() if k.split(".")[0] not in ("whisker", "fang")}, {k: v for k, v in o.items() if k.split(".")[0] not in ("whisker", "fang")})

    def test_level_2_shells_are_one_level_in(self):
        self.assertEqual(counts(self.new, 2)["whisker.0"], counts(self.old, 1)["whisker.0"])
        self.assertEqual(counts(self.new, 2)["fang.0"], counts(self.old, 1)["fang.0"])

    def test_level_0_is_the_cage(self):
        self.assertEqual(counts(self.new, 0)["whisker.0"], 2 * 44)

    def test_width_and_centre_line_stay_within_two_thousandths_of_the_height(self):
        """Each interior ring of the cage shell against the same ring of today's level-1 shell: the centre, and the width (the equal-area circle of the ring against the mean radius)."""
        V1, F1, at1, fp1 = level_arrays(self.old, 1)
        V0, F0, at0, fp0 = level_arrays(self.new, 0)
        for nm in ("whisker.0", "whisker.1", "whisker.2", "fang.0"):
            po, pn = self.old.parts[nm], self.new.parts[nm]
            ko = np.unique(np.array(F1)[np.asarray(fp1).astype(int) == po])
            kn = np.unique(np.array(F0)[np.asarray(fp0).astype(int) == pn])
            so, sn = at1[ko, 1], at0[kn, 1]
            for s in sorted(set(np.round(sn, 6)) - {0.0, 1.0}):
                a, c = V1[ko][np.isclose(so, s, atol=1e-5) & (V1[ko][:, 1] > 0)], V0[kn][np.isclose(sn, s, atol=1e-5) & (V0[kn][:, 1] > 0)]          # the left side
                self.assertEqual((len(a), len(c)), (2 * AP.N_AROUND, AP.N_AROUND), (nm, s))
                ca, cc = a.mean(0), c.mean(0)
                self.assertLess(np.linalg.norm(ca - cc), 0.002, (nm, s, "centre"))
                wa, wc = np.linalg.norm(a - ca, axis=1).mean(), AP.HEX * np.linalg.norm(c - cc, axis=1).mean()
                self.assertLess(abs(wa - wc), 0.002, (nm, s, "width"))

    def test_no_shell_no_change(self):
        """A body without shells subdivides exactly as before."""
        import subdiv as SD
        b = F.build(DOC, "type").body
        Vf, Ff, attr, fp, cr, _ = b.full()
        a = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
        c = SD.subdivide_body(b, Vf, Ff, cr, attr, fp, levels=2)
        self.assertTrue(np.array_equal(a[0], c[0]))
        self.assertEqual(list(map(tuple, a[1])), list(map(tuple, c[1])))


if __name__ == "__main__":
    unittest.main()
