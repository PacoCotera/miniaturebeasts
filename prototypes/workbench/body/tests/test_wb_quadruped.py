"""Chunks 17 and 18: the quadruped's cage. A horizontal spine in the plan's ranges, the head entered from behind on the spine axis, the neck band; the girdles, four three-joint legs with flat soles and balance over the four soles. No Blender here except the render tests at the end; the cage is plain numpy."""
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
        V, _, attr, *_ = self.body.full()
        p = Q.params(S22)
        V = np.asarray(V)
        V = V[np.rint(np.asarray(attr)[:, 0]).astype(int) == self.body.parts["torso"]]           # the trunk's own vertices: a forefoot may reach as far forward as the head's rear
        self.assertAlmostEqual(V[:, 0].max(), p["x0"], delta=0.02)                              # the nose is the front end
        head = V[V[:, 0] > p["x0"] - p["head"]]
        self.assertAlmostEqual(0.5 * (head[:, 2].max() + head[:, 2].min()), p["axis_z"], delta=0.05)  # the head's centre is on the spine axis

    def test_the_vertex_budget_holds(self):
        self.assertLess(len(F.proxy_mesh(self.body, 1)["V"]), 3500)

    def test_the_stations_crowd_where_the_section_turns(self):
        st = np.array(self.body.ctx["stations"])
        gaps = np.diff(st)
        self.assertLess(gaps[:3].max(), gaps.max())                                              # the nose rings are closer than the barrel's


def with_girdles(doc, **kv):
    d = copy.deepcopy(doc)
    d["skeleton"].update(kv)
    return d


class TestGirdles(unittest.TestCase):
    def test_the_file_places_the_girdles_by_their_ranges_and_the_legs_by_offsets_from_them(self):
        self.assertEqual(V1.validate(S22), [])
        g = Q.girdle_joints(S22)
        p = Q.params(S22)
        back_u = (p["head"] + p["neck"], p["head"] + p["neck"] + p["back"])
        seat_u = (back_u[1], p["trunk"])
        self.assertTrue(back_u[0] <= g["u"]["chest"] <= back_u[1] and seat_u[0] <= g["u"]["pelvis"] <= seat_u[1])
        for j in ("chest", "pelvis"):
            self.assertEqual((g[j][1], g[j][2]), (0.0, p["axis_z"]))                              # on the spine axis
            self.assertAlmostEqual(g[j][0], p["x0"] - g["u"][j], places=9)
        lp = Q.limb_parts(S22)
        self.assertEqual(sorted(lp), ["fore.L", "hind.L"])
        self.assertTrue(np.allclose(lp["fore.L"]["P"][0], g["chest"] + np.array(S22["skeleton"]["shoulder_off"])))
        self.assertTrue(np.allclose(lp["hind.L"]["P"][0], g["pelvis"] + np.array(S22["skeleton"]["hip_off"])))

    def test_a_girdle_off_its_range_or_a_limb_that_is_not_on_the_floor_names_its_field(self):
        for k, v, field in (("chest_at", 1.2, "skeleton.chest_at"), ("pelvis_at", -0.1, "skeleton.pelvis_at")):
            errs = V1.validate(with_girdles(S22, **{k: v}))
            self.assertEqual([e[0] for e in errs], [field])
        d = copy.deepcopy(S22)
        d["parts"][0]["chain"][2]["len"] += 0.1
        self.assertEqual([e[0] for e in V1.validate(d)], ["parts.fore.L.chain"])
        self.assertIn("from the floor", V1.validate(d)[0][1])
        d = copy.deepcopy(S22)
        del d["skeleton"]["hip_off"]
        self.assertEqual([e[0] for e in V1.validate(d)], ["skeleton.hip_off"])
        d = copy.deepcopy(S22)
        d["parts"][1]["id"] = "hind.R"
        self.assertEqual([e[0] for e in V1.validate(d)], ["parts.hind.R"])

    def test_the_biped_still_needs_its_girdle_joints(self):
        s20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
        self.assertEqual(V1.validate(s20), [])
        del s20["skeleton"]["chest"]
        self.assertEqual([e[0] for e in V1.validate(s20)], ["skeleton.chest"])


class TestLegs(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.body = Q.build(S22)
        cls.V, cls.F, *_ = cls.body.full()
        cls.V = np.asarray(cls.V)
        cls.sk = Q.skeleton(S22)

    def test_four_legs_in_a_closed_cage_the_right_side_the_mirror_of_the_left(self):
        self.assertEqual(sorted(self.body.parts), ["fore.L", "hind.L", "torso"])
        self.assertEqual(closed(self.body)[0], 0)
        ys = self.V[:, 1]
        for n in ("fore.L", "hind.L"):
            self.assertTrue((ys > 0.01).any())
        mirrored = {tuple(np.round(v * [1, -1, 1], 6)) for v in self.V}
        self.assertTrue(all(tuple(np.round(v, 6)) in mirrored for v in self.V))                  # every vertex has its mirror image: two legs a side, four in all
        self.assertEqual(len(F.proxy_mesh(self.body, 1)["V"]) < 3500, True)

    def test_each_leg_is_three_joints_after_its_root_and_the_chain_stands_on_the_floor(self):
        for name, lp in Q.limb_parts(S22).items():
            self.assertEqual(len(lp["joints"]), 4, name)                                            # the root, then the knee, the ankle and the sole
            self.assertEqual(len(S22["parts"][0]["chain"]), V1.PLANS["quadruped"]["limb_joints"])
            self.assertLess(abs(lp["P"][-1][2]), Q.LEG_ON_FLOOR, name)
            self.assertTrue(lp["P"][0][2] > lp["P"][1][2] > lp["P"][2][2] > lp["P"][3][2], name)    # every joint lower than the one above it

    def test_the_soles_are_flat_and_the_four_stand_at_one_height(self):
        import subdiv as SD
        Vf, Ff, at, fpp, cr, mir = self.body.full()
        V2, F2, _, a2, fp2 = SD.subdivide_body(self.body, Vf, Ff, cr, at, fpp, levels=2)
        V2 = np.asarray(V2)
        self.assertLess(V2[:, 2].min(), 0.02)
        floor = {}
        for n, i in self.body.parts.items():
            if n == "torso":
                continue
            fv = np.unique(np.asarray(F2, int)[np.asarray(fp2).astype(int) == i])
            pts = V2[fv]
            for side, sel in (("L", pts[:, 1] > 0), ("R", pts[:, 1] < 0)):
                s = pts[sel]
                low = s[s[:, 2] < Q.SOLE_Z]
                floor[f"{n.split('.')[0]}.{side}"] = (low[:, 2].min(), low[:, 2].max(), len(low))
        self.assertEqual(sorted(floor), ["fore.L", "fore.R", "hind.L", "hind.R"])
        zmin = [v[0] for v in floor.values()]
        self.assertLess(max(zmin) - min(zmin), 1e-3)                                              # the four soles reach the same height
        self.assertTrue(all(abs(v[0]) < 0.02 and v[2] > 20 for v in floor.values()))               # on the floor, each a sole of many vertices
        for n, lp in Q.limb_parts(S22).items():
            ri = self.body.ctx["info"]["limbs"][n]["ringinfo"]
            self.assertTrue(np.allclose(ri[-1]["N"], [1, 0, 0]) and np.allclose(ri[-1]["B"], [0, -1, 0]), n)   # the foot's last rings are level

    def test_balance_is_the_centre_of_mass_inside_the_polygon_of_the_four_soles_with_room_to_spare(self):
        b = Q.balance(self.body)
        self.assertTrue(b["inside"])
        self.assertGreaterEqual(b["margin"], 0.15)                                                 # at least 0.15 of the polygon's shorter side from any edge
        self.assertEqual(sorted(b["soles"]), ["fore.L", "fore.R", "hind.L", "hind.R"])
        c = {k: v["centre"] for k, v in b["soles"].items()}
        self.assertTrue(c["hind.L"][0] < b["com"][0] < c["fore.L"][0] + 0.2)                        # the centre of mass lies between the hind soles and the front of the forefeet
        self.assertGreater(c["fore.L"][1], 0)
        self.assertAlmostEqual(c["fore.L"][1], -c["fore.R"][1], places=6)
        self.assertAlmostEqual(b["com"][1], 0.0, places=6)                                          # a mirrored body's centre of mass is on the midline
        self.assertGreater(b["volume"], 2.0)

    def test_the_polygon_moves_with_the_legs_and_a_front_heavy_mibi_tips_out_of_it(self):
        d = copy.deepcopy(S22)
        d["skeleton"]["shoulder_off"] = [-0.4, 0.5, -0.23]                                           # forelegs far back: the head hangs over nothing
        d["parts"][0]["chain"][1]["pitch"] = -118
        d["parts"][0]["chain"][2]["len"] = round(0.72 + 0.2 * np.sin(np.radians(-95)) + 0.24 * np.sin(np.radians(-118)), 4)     # the sole still ends on the floor
        b = Q.balance(Q.build(d))
        self.assertLess(b["margin"], Q.balance(self.body)["margin"])

    def test_the_legs_follow_the_ranges(self):
        for name, e in (("head", 0.9), ("neck", 0.35), ("back", 1.4), ("seat", 0.6)):
            d = with_range(S22, name, e)
            self.assertEqual(V1.validate(d), [], (name, e))
            b = Q.build(d)
            self.assertEqual(closed(b)[0], 0, (name, e))
            g = Q.girdle_joints(d)
            p = Q.params(d)
            self.assertAlmostEqual(g["u"]["chest"] - (p["head"] + p["neck"]), S22["skeleton"]["chest_at"] * p["back"], places=9)
            self.assertLess(abs(Q.limb_parts(d)["fore.L"]["P"][-1][2]), Q.LEG_ON_FLOOR)
            self.assertTrue(Q.balance(b)["inside"], (name, e))

    def test_the_skeleton_is_a_spine_two_girdles_and_three_bones_to_a_leg(self):
        J, B = self.sk["joints"], self.sk["bones"]
        names = [b[0] for b in B]
        self.assertEqual(len(names), len(set(names)))
        for b in B:
            self.assertIn(b[2], J)
            self.assertIn(b[3], J)
        legs = [b for b in B if b[1] == "leg"]
        self.assertEqual(sorted(b[0] for b in legs), sorted(f"{k}.{bn}.{s}" for k in ("fore", "hind") for bn in ("upper", "lower", "paw") for s in "LR"))
        girdle = {b[0]: (b[2], b[3]) for b in B if b[1] == "girdle"}
        self.assertEqual(sorted(girdle), ["girdle.fore.L", "girdle.fore.R", "girdle.hind.L", "girdle.hind.R"])
        self.assertTrue(all(v[0] == ("chest" if "fore" in k else "pelvis") for k, v in girdle.items()))       # each girdle bone runs from its girdle joint to the leg's root
        for k in ("fore.shoulder.L", "hind.hip.R"):
            self.assertIn(k, J)
        self.assertTrue(np.allclose(J["fore.sole.L"] * [1, -1, 1], J["fore.sole.R"]))
        for s in "LR":
            self.assertLess(abs(J[f"fore.sole.{s}"][2]), Q.LEG_ON_FLOOR)


class TestRangesAndKnobs(unittest.TestCase):
    def test_each_end_of_each_range_builds_a_closed_cage_with_the_neck_band_in_range(self):
        for name, (lo, hi) in PLAN["range_len"].items():
            for e in (lo, hi):
                d = with_range(S22, name, e)
                self.assertEqual(V1.validate(d), [], (name, e))
                b = Q.build(d)
                self.assertEqual(closed(b)[0], 0, (name, e))
                self.assertGreater(closed(b)[1], 0.5, (name, e))
                self.assertLess(len(F.proxy_mesh(b, 1)["V"]), 4200, (name, e))                    # the vertex budget by range is chunk 19's (mesh by range)
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
        self.assertEqual((r.species, r.vertices, r.stage), ("S22", 834, "base"))
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
        self.assertEqual([x["id"] for x in rows], ["joins", "head.attach", "head.neck", "tail.taper", "tail.size", "balance", "limbs", "verts", "mesh"])
        self.assertEqual({x["state"] for x in rows}, {"pass"})


def rows_of(doc):
    from checks import run as crun
    return {r["id"]: r for r in F.check_rows(doc)}


def broken(**kv):
    """S22 with the fields set (dotted paths, in the plan's bands: the file is valid, the cage is built and the check says no)."""
    d = copy.deepcopy(S22)
    for path, v in kv.items():
        node = d
        keys = path.split(".")
        for k in keys[:-1]:
            node = node[k]
        node[keys[-1]] = v
    return d


class TestPlanChecks(unittest.TestCase):
    """Chunk 19: the head, neck and chest, the tail by the plan, the mesh by range and balance over four soles; the template passes them all."""
    @classmethod
    def setUpClass(cls):
        cls.base = rows_of(S22)

    def test_the_bare_base_is_green_on_every_check_the_quadruped_has(self):
        self.assertEqual(sorted(self.base), sorted(["schema", "express", "ranges", "joins", "head.attach", "head.neck", "tail.taper", "tail.size", "balance", "limbs", "verts", "mesh"]))
        self.assertEqual({k: v["state"] for k, v in self.base.items()}, {k: "pass" for k in self.base})

    def test_the_template_is_the_bare_base_with_its_own_id_and_passes_every_check(self):
        t = V1.new_from_template("S23", "quadruped")
        self.assertEqual((t["id"], t["name"], t["plan"], V1.validate(t)), ("S23", "", "quadruped", []))
        rows = rows_of(t)
        self.assertEqual({k: v["state"] for k, v in rows.items()}, {k: "pass" for k in self.base})
        self.assertEqual({k: v["value"] for k, v in rows.items()}, {k: v["value"] for k, v in self.base.items()})
        self.assertEqual(V1.template("quadruped")["genome"]["loci"], [])                                   # the template stays bare when S22 grows genes

    def test_a_template_asked_for_in_words_it_cannot_say_refuses_in_plain_words(self):
        with self.assertRaises(ValueError) as e:
            V1.new_from_template("S23", "biped")
        self.assertIn("no template yet", str(e.exception))
        with self.assertRaises(ValueError):
            V1.new_from_template("Moss", "quadruped")

    def test_wb_new_writes_the_file_and_never_over_one(self):
        import io, contextlib
        from wb import cli
        out = os.path.join(BODY, "scratch", "t_new")
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
        try:
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                rc = cli.main(["new", "S23", "--plan", "quadruped", "--from", "template", "--out", out])
            self.assertEqual(rc, 0, buf.getvalue())
            self.assertEqual(json.load(open(os.path.join(out, "S23.json")))["id"], "S23")
            self.assertEqual(buf.getvalue().count("PASS"), 12)
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                rc = cli.main(["new", "S23", "--plan", "quadruped", "--from", "template", "--out", out])
            self.assertEqual(rc, 2)
            self.assertIn("never writes over", err.getvalue())
        finally:
            shutil.rmtree(out, ignore_errors=True)

    def test_a_neck_wider_than_the_chest_fails_with_the_checks_own_words(self):
        r = rows_of(broken(**{"spine.loft.head_profile.R_scale": 1.2, "spine.loft.head_profile.neck_ratio": 0.8}))["head.neck"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("of the chest, limit 0.85", r["measure"])
        self.assertGreaterEqual(r["value"], 0.85)

    def test_the_head_must_stand_over_the_neck_band(self):
        from checks import quad as QD
        self.assertEqual(QD.QUAD["dome_overhang"], 0.12)
        self.assertGreater(float(self.base["head.neck"]["measure"].split("overhangs the neck by ")[1].split(" H")[0]), 0.12)

    def test_a_tail_that_grows_toward_its_tip_fails_the_taper(self):
        r = rows_of(broken(**{"spine.tail.root": 0.1, "spine.tail.tip_r": 0.14}))["tail.taper"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("Radius grows", r["measure"])
        self.assertEqual(self.base["tail.taper"]["value"], 0.0)

    def test_the_quadrupeds_tail_may_be_heavier_than_the_bipeds_and_has_a_limit_of_its_own(self):
        from checks import biped as BP, quad as QD
        self.assertGreater(QD.QUAD["tail_side_area"], BP.BIPED["tail_side_area"])
        self.assertGreater(QD.QUAD["tail_root"], 0.47)
        self.assertEqual(self.base["tail.size"]["limit"], QD.QUAD["tail_side_area"])
        big = rows_of(broken(**{"spine.tail.length": 2.4, "spine.tail.root": 0.8, "spine.tail.tip_r": 0.15}))["tail.size"]
        self.assertEqual(big["state"], "fail")
        self.assertGreater(big["value"], QD.QUAD["tail_side_area"])
        mid = rows_of(broken(**{"spine.tail.length": 2.0, "spine.tail.root": 0.8, "spine.tail.tip_r": 0.15}))["tail.size"]
        self.assertGreater(mid["value"], BP.BIPED["tail_side_area"])                                   # a tail the biped could not carry
        self.assertEqual(mid["state"], "pass")

    def test_a_file_may_only_tighten_the_tails_limit(self):
        r = rows_of(broken(**{"limits": {"tail_side_area": 0.1, "balance_margin": 0.3}, "spine.tail.length": 1.4, "spine.tail.root": 0.6, "spine.tail.tip_r": 0.1}))
        self.assertEqual((r["tail.size"]["state"], r["tail.size"]["limit"]), ("fail", 0.1))
        self.assertEqual((r["balance"]["state"], r["balance"]["limit"]), ("fail", 0.3))

    def test_a_tight_bend_on_a_heavy_short_tail_fails_the_mesh_in_the_tail_range_and_the_caps_are_not_judged(self):
        r = rows_of(broken(**{"spine.tail.length": 1.1, "spine.tail.root": 0.8, "spine.tail.tip_r": 0.15, "spine.tail.fillet": 0.5}))["mesh"]
        self.assertEqual((r["state"], r["extra"]["bad_ranges"], r["extra"]["fail"]), ("fail", ["tail"], "Thin or bent faces in the tail"))
        self.assertIn("tail: area", r["measure"])
        self.assertLess(self.base["mesh"]["extra"]["ranges"]["tail"]["nonplanar"], 0.3)                    # the tip's grid cap is 0.64 and is left out
        self.assertEqual(sorted(self.base["mesh"]["extra"]["ranges"]), ["back", "head", "neck", "seat", "tail"])

    def test_the_whole_tail_band_stays_under_the_vertex_budget_and_passes_the_mesh_in_every_range(self):
        for L in (0.6, 1.4, 2.1, 2.4):
            for root, tip in ((0.4, 0.06), (0.8, 0.15), (0.1, 0.02), (0.8, 0.02)):
                r = rows_of(broken(**{"spine.tail.length": L, "spine.tail.root": root, "spine.tail.tip_r": tip}))
                self.assertLessEqual(r["verts"]["value"], 3500, (L, root, tip))
                self.assertEqual(r["verts"]["state"], "pass")
                self.assertEqual(r["mesh"]["state"], "pass", (L, root, tip, r["mesh"]["measure"]))

    def test_every_check_runs_on_the_quadruped_with_its_own_numbers(self):
        from checks import quad as QD
        for k in ("joins", "head.attach", "limbs"):
            self.assertEqual(self.base[k]["state"], "pass", k)
        self.assertIn("soft, grows from", self.base["joins"]["measure"])
        self.assertIn("a 0.00, d 0.00", self.base["head.attach"]["measure"])
        self.assertEqual((QD.LEG_REACH, QD.LEG_PINCH), (0.7, 0.8))

    def test_the_tail_is_quadrupeds_provisional_limit_says_so(self):
        from checks import quad as QD
        self.assertEqual((QD.QUAD["tail_side_area"], QD.QUAD["tail_side_area_provisional"]), (0.4, True))
        self.assertTrue(self.base["tail.size"]["extra"]["provisional"])
        self.assertEqual(self.base["tail.size"]["extra"]["limit_text"], "Side area at most 0.40 of the trunk \u00b7 root at most 0.80 of the seat radius")

    def test_forelegs_at_the_back_of_the_back_put_the_centre_of_mass_off_the_soles(self):
        r = rows_of(broken(**{"skeleton.chest_at": 1.0}))["balance"]
        self.assertEqual(r["state"], "fail")
        self.assertIn("outside their edge, needs 15% inside", r["measure"])
        self.assertEqual(r["extra"]["fail"], "Tips over forwards")

    def test_every_new_check_draws_its_proof_on_the_plans_own_frame(self):
        for k in ("head.neck", "tail.taper", "tail.size", "balance", "mesh"):
            p = self.base[k]["proof"]
            self.assertTrue(p["svg"].count("<") > 5, k)
            self.assertEqual(p["az"], 90 if k != "mesh" else 90)

    def test_the_biped_still_runs_its_own_measures(self):
        from checks import quad as QD
        self.assertFalse(QD.is_quad(type("C", (), dict(spec=json.load(open(os.path.join(BODY, "species_v1", "S20.json")))))()))


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
        self.assertEqual(j.result["cage"]["vertices"], 834)
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
        self.assertEqual({r["id"]: r["state"] for r in j.result["rows"]}, dict(schema="pass", express="pass", ranges="pass", **{"joins": "pass", "head.attach": "pass", "head.neck": "pass", "tail.taper": "pass", "tail.size": "pass", "balance": "pass", "limbs": "pass"}, verts="pass", mesh="pass"))


if __name__ == "__main__":
    unittest.main()
