"""Chunk 17: the quadruped's cage. A horizontal spine in the plan's ranges, the head entered from behind on the spine axis, the neck band. No Blender here except the one render test at the end; the cage is plain numpy."""
import collections
import copy
import json
import os
import shutil
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import numpy as np
import quadruped as Q
import species_v1 as V1
from wb import facade as F, hashing as H, spine as SP, store as S, keys as K

S22 = json.load(open(os.path.join(BODY, "species_v1", "S22.json")))
PLAN = V1.PLANS["quadruped"]


def with_(doc, **kv):
    d = copy.deepcopy(doc)
    for path, v in kv.items():
        node = d
        keys = path.split(".")
        for k in keys[:-1]:
            node = node[k]
        node[keys[-1]] = v
    return d


def with_range(doc, name, length):
    d = copy.deepcopy(doc)
    next(r for r in d["spine"]["ranges"] if r["name"] == name)["length"] = length
    return d


def closed(body):
    """(edges not shared by exactly two faces, volume) of the mirrored cage."""
    V, Fc, *_ = body.full()
    V = np.asarray(V)
    E = collections.Counter()
    for f in Fc:
        for k in range(4):
            a, b = f[k], f[(k + 1) % 4]
            E[(min(a, b), max(a, b))] += 1
    vol = sum(np.dot(V[f[0]], np.cross(V[f[1]], V[f[2]])) + np.dot(V[f[0]], np.cross(V[f[2]], V[f[3]])) for f in Fc) / 6.0
    return sum(1 for v in E.values() if v != 2), float(vol)


class TestFile(unittest.TestCase):
    def test_the_quadruped_file_is_valid_and_has_the_plans_ranges(self):
        self.assertEqual(V1.validate(S22), [])
        self.assertEqual([r["name"] for r in S22["spine"]["ranges"]], PLAN["ranges"])
        self.assertEqual(S22["spine"]["head_attach"]["a"], 0.0)               # entered from behind on the spine axis
        self.assertEqual(S22["name"], "")                                       # a test species: it has no name yet

    def test_the_knob_bands_are_the_rulings(self):
        self.assertEqual((PLAN["prof_neck_ratio"], PLAN["prof_R_scale"], PLAN["prof_chest_front"], PLAN["prof_rump_gain"]), ((0.5, 0.8), (0.8, 1.2), (0.0, 0.12), (0.0, 0.3)))


class TestCage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = Q.build(S22)

    def test_a_closed_quad_cage_of_positive_volume_and_the_same_every_time(self):
        open_edges, vol = closed(self.body)
        self.assertEqual(open_edges, 0)
        self.assertGreater(vol, 1.0)
        self.assertEqual(H.cage_hash(self.body), H.cage_hash(Q.build(copy.deepcopy(S22))))

    def test_the_spine_is_horizontal_and_every_ring_centre_is_on_the_axis(self):
        p = Q.params(S22)
        info = self.body.ctx["info"]["rings"]
        trunk = [i for i in info if i["s"] <= p["u_e"]]
        self.assertTrue(all(abs(i["centre"][2] - p["axis_z"]) < 1e-9 and abs(i["centre"][1]) < 1e-9 for i in trunk))     # level at the axis height, on the mirror plane
        self.assertTrue(all(abs(i["T"][2]) < 1e-3 and i["T"][0] < -0.9999 for i in trunk))                                 # pointing back along -x: the head is at +x
        self.assertAlmostEqual(trunk[0]["centre"][0], p["x0"] - trunk[0]["s"], places=6)

    def test_the_head_is_the_first_lobe_and_the_neck_is_a_concave_band_a_share_of_the_heads_radius(self):
        p = Q.params(S22)
        u = np.linspace(0, p["total"], 4000)
        r = Q.table(S22, u, p)[0]
        head = r[u <= p["head"]].max()
        neck = r[(u >= p["head"]) & (u <= p["head"] + p["neck"])].min()
        chest = r[(u > p["head"] + p["neck"]) & (u < p["u_p"])].max()
        self.assertAlmostEqual(head, p["R_head"] * 1.0, delta=0.04)                           # the ball's equator is the head's radius
        self.assertLess(neck / head, 0.85)                                                       # the concave band: under 0.85 of the head and of the chest
        self.assertLess(neck / chest, 0.85)
        self.assertAlmostEqual(neck / head, p["neck_ratio"], delta=0.05)                         # the measured neck runs a little over the knob
        # concave: the radius falls from the head's equator to the band and rises again to the chest
        a, b = int(np.argmax(r * (u <= p["head"]))), int(np.argmin(np.where((u >= p["head"]) & (u <= p["head"] + p["neck"]), r, 9)))
        self.assertLess(a, b)
        self.assertGreater(r[b + 400], r[b] * 1.1)

    def test_the_head_ball_is_ahead_of_the_chest_on_the_axis(self):
        V, *_ = self.body.full()
        p = Q.params(S22)
        V = np.asarray(V)
        self.assertAlmostEqual(V[:, 0].max(), p["x0"], delta=0.02)                              # the nose is the front end
        head = V[V[:, 0] > p["x0"] - p["head"]]
        self.assertAlmostEqual(0.5 * (head[:, 2].max() + head[:, 2].min()), p["axis_z"], delta=0.05)  # the head's centre is on the spine axis

    def test_the_vertex_budget_holds(self):
        self.assertLess(len(F.proxy_mesh(self.body, 1)["V"]), 3500)

    def test_the_stations_crowd_where_the_section_turns(self):
        st = np.array(self.body.ctx["stations"])
        gaps = np.diff(st)
        self.assertLess(gaps[:3].max(), gaps.max())                                              # the nose rings are closer than the barrel's


class TestRangesAndKnobs(unittest.TestCase):
    def test_each_end_of_each_range_builds_a_closed_cage_with_the_neck_band_in_range(self):
        for name, (lo, hi) in PLAN["range_len"].items():
            for e in (lo, hi):
                d = with_range(S22, name, e)
                self.assertEqual(V1.validate(d), [], (name, e))
                b = Q.build(d)
                self.assertEqual(closed(b)[0], 0, (name, e))
                self.assertGreater(closed(b)[1], 0.5, (name, e))
                self.assertLess(len(F.proxy_mesh(b, 1)["V"]), 3500, (name, e))
        for e in PLAN["tail_length"]:
            d = with_(S22, **{"spine.tail.length": e})
            self.assertEqual(V1.validate(d), [])
            self.assertEqual(closed(Q.build(d))[0], 0)

    def test_each_end_of_each_knob_builds_and_the_ranges_stay_where_the_file_puts_them(self):
        for k, (lo, hi) in ((k, PLAN["prof_" + k]) for k in Q.DEFAULT_KNOBS):
            for e in (lo, hi):
                d = copy.deepcopy(S22)
                d["spine"]["loft"]["head_profile"][k] = e
                self.assertEqual(V1.validate(d), [], (k, e))
                b = Q.build(d)
                self.assertEqual(closed(b)[0], 0, (k, e))
                p = Q.params(d)
                u = np.linspace(0, p["total"], 2000)
                r = Q.table(d, u, p)[0]
                nk = r[(u >= p["head"]) & (u <= p["head"] + p["neck"])].min()
                self.assertLess(nk / r[u <= p["head"]].max(), 0.85, (k, e))

    def test_a_longer_head_range_moves_the_rest_back_and_keeps_the_trunk_centred(self):
        a, b = Q.params(S22), Q.params(with_range(S22, "head", 1.0))
        self.assertAlmostEqual(a["x0"] - a["u_e"], -a["x0"])
        self.assertAlmostEqual(b["x0"] - b["u_e"], -b["x0"])
        self.assertNotEqual(a["u_c"], b["u_c"])

    def test_the_tail_runs_back_from_the_seat_in_the_files_segments(self):
        p = Q.params(S22)
        pa = Q._path(S22, p)
        self.assertAlmostEqual(float(pa.pts[:, 0].min()), p["x0"] - p["u_e"] - p["tail"], delta=0.45)
        self.assertGreater(pa.length, p["trunk"])


class TestFacade(unittest.TestCase):
    def test_the_facade_builds_the_quadruped_and_keys_it_by_the_spine_and_the_framework(self):
        r = F.build(S22)
        self.assertEqual((r.species, r.vertices, r.stage), ("S22", 674, "base"))
        self.assertEqual(r.cage_hash, H.cage_hash(Q.build(S22)))
        k = F.cage_key(S22, "type")
        self.assertEqual(r.key, k)
        self.assertEqual(K.cage_key(S22, "type"), k)
        self.assertNotEqual(F.cage_key(with_range(S22, "neck", 0.3), "type"), k)
        self.assertEqual(F.cage_key(with_(S22, name="Other"), "type"), k)                       # a name moves no cage

    def test_the_quadruped_has_no_genes_yet(self):
        with self.assertRaises(F.BuildError) as c:
            F.build(S22, "seed:3")
        self.assertIn("no genes yet", c.exception.message)

    def test_a_file_outside_its_plan_is_a_build_error_naming_its_field(self):
        d = with_range(S22, "neck", 0.9)
        with self.assertRaises(F.BuildError) as c:
            F.build(d)
        self.assertEqual(c.exception.field, "spine.ranges.neck.length")

    def test_the_biped_is_untouched(self):
        s20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
        base = json.load(open(os.path.join(BODY, "tests", "fixtures", "wb_s20_baseline.json")))
        self.assertEqual(F.build(s20).cage_hash, base["type_cage_hash"])


class TestSpineView(unittest.TestCase):
    def test_the_view_is_the_cages_own_path_with_the_ranges_and_the_four_knobs(self):
        v = SP.spine_view(S22)
        self.assertTrue(v["built"])
        self.assertEqual([r["name"] for r in v["ranges"]], PLAN["ranges"])
        self.assertEqual({k["name"] for k in v["knobs"]}, set(Q.DEFAULT_KNOBS))
        self.assertAlmostEqual(v["path"][0][0], Q.params(S22)["x0"], places=3)              # from the nose
        self.assertEqual({round(p[2], 3) for p in v["path"][:40]}, {Q.params(S22)["axis_z"]})   # level along the head, neck and back
        self.assertGreater(v["path"][0][0], v["path"][-1][0])
        self.assertEqual(v["ranges"][0]["lo"], 0.0)
        self.assertAlmostEqual(v["ranges"][-1]["hi"], Q.params(S22)["total"], delta=0.03)
        self.assertEqual(sorted(v["outline"]), ["back", "front"])
        self.assertLess(v["camera"]["ppH"], 190)                                                  # framed for the long body

    def test_a_knobs_gain_is_what_a_drag_of_one_h_changes(self):
        v = SP.spine_view(S22)
        k = next(x for x in v["knobs"] if x["name"] == "neck_ratio")
        d = copy.deepcopy(S22)
        d["spine"]["loft"]["head_profile"]["neck_ratio"] += 0.02
        v2 = SP.spine_view(d)
        k2 = next(x for x in v2["knobs"] if x["name"] == "neck_ratio")
        self.assertAlmostEqual((k2["at"][2] - k["at"][2]) * k["gain"], 0.02, delta=0.004)


class TestFrame(unittest.TestCase):
    def test_the_plan_frames_its_own_clay_to_fit_the_plate(self):
        fr = Q.frame(S22)
        self.assertLess(fr["scale"], 1.0)
        pa = Q._path(S22, Q.params(S22))
        width = (Q.params(S22)["x0"] + 0.1 - (pa.pts[:, 0].min() - 0.1)) * 95.0 * fr["scale"]
        self.assertLessEqual(width, 304 * 0.81)
        self.assertGreaterEqual(width, 304 * 0.7)


class TestChecks(unittest.TestCase):
    def test_the_file_checks_judge_a_quadruped_and_the_biped_only_ones_wait_for_the_plans_own(self):
        from checks import run as crun
        from checks.ctx import Ctx
        rows = {r["id"]: r for r in crun("file", Ctx(S22, doc=S22))}
        self.assertEqual(sorted(rows), ["express", "ranges", "schema"])
        self.assertEqual((rows["schema"]["state"], rows["ranges"]["state"]), ("pass", "pass"))
        bad = crun("file", Ctx(with_range(S22, "neck", 0.9), doc=with_range(S22, "neck", 0.9)))
        self.assertEqual({r["id"]: r["state"] for r in bad}["ranges"], "fail")

    def test_the_vertex_budget_judges_the_quadruped_cage(self):
        from checks import run as crun
        from checks.ctx import Ctx
        r = F.build(S22)
        m = F.proxy_mesh(r.body, 1)
        rows = crun("cage", Ctx(S22, r.body, dict(r.summary(), vertices_l1=len(m["V"])), m, doc=S22))
        self.assertEqual([x["id"] for x in rows], ["verts"])
        self.assertEqual(rows[0]["state"], "pass")


class TestRender(unittest.TestCase):
    """One real proxy worker: the four clay views of the bare base at 304, framed by the plan."""
    @classmethod
    def setUpClass(cls):
        from wb import server as SV
        cls.root = os.path.join(BODY, "scratch", "t_quad")
        shutil.rmtree(cls.root, ignore_errors=True)
        sp = os.path.join(cls.root, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S22.json"), S22)
        cls.srv = SV.Server(os.path.join(cls.root, "home"), [sp], proxy_workers=1)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(cls.root, ignore_errors=True)

    def test_four_clay_views_and_the_cached_cage(self):
        j = self.srv.submit("S22", "render", dict(modes=["clay"], az=[0, 32, 90, 180], sizes=[304]), None)
        self.srv.wait(j, 120)
        self.assertEqual(j.state, "done", j.error)
        self.assertEqual(j.result["cage"]["vertices"], 674)
        for v in j.result["views"]:
            self.assertEqual(open(v["path"], "rb").read(8), b"\x89PNG\r\n\x1a\n")
        self.assertEqual(len({v["key"] for v in j.result["views"]}), 4)
        j2 = self.srv.submit("S22", "render", dict(modes=["clay"], az=[90], sizes=[96]), None)
        self.srv.wait(j2, 60)
        self.assertTrue(j2.result["cage"]["cached"])                                             # the frame travels with the cached cage

    def test_the_checks_say_what_they_can(self):
        j = self.srv.submit("S22", "check", dict(stage="all"), None)
        self.srv.wait(j, 120)
        self.assertEqual(j.state, "done", j.error)
        self.assertEqual({r["id"]: r["state"] for r in j.result["rows"]}, dict(schema="pass", express="pass", ranges="pass", verts="pass"))


if __name__ == "__main__":
    unittest.main()
