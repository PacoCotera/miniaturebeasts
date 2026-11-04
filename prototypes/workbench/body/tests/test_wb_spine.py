"""Chunk 22: the spine on the stage. The profile knobs are fields of the file; the section table is worked out from them in the same save and is never edited; the stage's view of the spine comes from the file and the plan alone. No Blender build."""
import copy, json, os, shutil, sys, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import forms as FM, server as SV, spine as SP, store as S
import headshape as HS
import species_v1 as V1

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_spine")
S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


class TestKnobs(unittest.TestCase):
    def test_the_type_s_section_table_is_what_the_knobs_work_out(self):
        loft = S20["spine"]["loft"]
        self.assertEqual(HS.stations(loft["section"]["stations_base"], **loft["head_profile"]), loft["section"]["stations"])

    def test_a_save_that_changes_nothing_leaves_the_file_byte_for_byte(self):
        ops = [{"op": "replace", "path": "/spine/loft/head_profile/neck_ratio", "value": 0.715}]
        self.assertEqual(S.apply_patch(S20, ops), S20)

    def test_each_range_has_its_knob_with_the_plans_band(self):
        f = FM.forms(S20)["parts"]
        for part, knob, band in (("head", "R_scale", [0.8, 1.2]), ("neck", "neck_ratio", [0.5, 0.8]), ("back", "chest_front", [0.0, 0.12]), ("seat", "rump_gain", [0.0, 0.6])):
            d = next(x for x in f[part]["fields"] if x["id"] == f"spine.loft.head_profile.{knob}")
            self.assertEqual((d["range"], d["ptr"], d["type"]), (band, f"/spine/loft/head_profile/{knob}", "number"))

    def test_the_seat_band_differs_by_plan_and_the_units_say_what_the_number_is(self):
        self.assertEqual((V1.PLANS["biped"]["prof_rump_gain"], V1.PLANS["quadruped"]["prof_rump_gain"]), ((0.0, 0.6), (0.0, 0.3)))
        self.assertEqual((V1.PLANS["biped"]["prof_neck_ratio"], V1.PLANS["quadruped"]["prof_neck_ratio"]), ((0.5, 0.8), (0.5, 0.8)))
        f = {x["id"]: x["unit"] for part in FM.forms(S20)["parts"].values() for x in part["fields"]}
        for k, u in (("R_scale", "× type"), ("neck_ratio", "× head"), ("chest_front", "%"), ("rump_gain", "%")):
            self.assertEqual(f[f"spine.loft.head_profile.{k}"], u)
        d = copy.deepcopy(S20)
        d["plan"] = "quadruped"
        d["spine"]["loft"]["head_profile"]["rump_gain"] = 0.45
        e = [x for x in V1.validate(d) if x[0].endswith("rump_gain")]
        self.assertIn("is +45 %; the quadruped plan allows +0 to +30 %", e[0][1])

    def test_a_knob_save_writes_the_table_again_in_the_same_save(self):
        new = S.apply_patch(S20, [{"op": "replace", "path": "/spine/loft/head_profile/neck_ratio", "value": 0.8}])
        loft = new["spine"]["loft"]
        self.assertEqual(loft["section"]["stations"], HS.stations(loft["section"]["stations_base"], **loft["head_profile"]))
        self.assertNotEqual(loft["section"]["stations"], S20["spine"]["loft"]["section"]["stations"])
        self.assertEqual(loft["section"]["stations_base"], S20["spine"]["loft"]["section"]["stations_base"])

    def test_the_table_is_never_edited_and_the_message_names_the_knobs(self):
        for path in ("/spine/loft/section/stations/3/1/0", "/spine/loft/section/stations_base"):
            with self.assertRaises(S.ApiError) as cm:
                S.apply_patch(S20, [{"op": "replace", "path": path, "value": 0.3}])
            self.assertIn("spine.loft.head_profile", cm.exception.message)

    def test_a_knob_outside_the_plans_band_names_the_field(self):
        d = copy.deepcopy(S20)
        d["spine"]["loft"]["head_profile"]["neck_ratio"] = 1.4
        e = V1.validate(d)
        self.assertEqual(e[0][0], "spine.loft.head_profile.neck_ratio")
        self.assertIn("the biped plan allows 0.5 to 0.8", e[0][1])


class TestView(unittest.TestCase):
    def view(self, doc=S20):
        return SP.spine_view(doc)

    def test_the_camera_is_the_proxys_hero_camera(self):
        import wb.proxy as PX
        self.assertEqual((SP.HERO, SP.EL, tuple(SP.CENTRE)), (PX.SIZES[608], PX.EL, tuple(PX.CENTRE)))
        r, u, f, _ = PX.basis(90, PX.EL)
        c = self.view()["camera"]
        self.assertEqual((c["right"], c["up"]), ([round(float(x), 6) for x in r], [round(float(x), 6) for x in u]))

    def test_the_ranges_run_head_to_tail_without_a_gap_and_the_head_ends_on_the_heads_underside(self):
        v = self.view()
        self.assertEqual([r["name"] for r in v["ranges"]], ["head", "neck", "back", "seat", "tail"])
        self.assertTrue(all(abs(a["hi"] - b["lo"]) < 1e-9 for a, b in zip(v["ranges"], v["ranges"][1:])))
        self.assertIsNone(v["ranges"][-1]["ptr"])
        z = v["path"][int(round(v["ranges"][0]["hi"] / v["step"]))][2]
        self.assertAlmostEqual(z, S20["spine"]["head_attach"]["z_under"], delta=0.02)
        self.assertEqual(v["ranges"][1]["ptr"], "/spine/ranges/1/length")

    def test_a_knob_sits_on_the_edge_of_the_derived_table_and_moves_it_by_its_gain(self):
        v = self.view()
        k = next(x for x in v["knobs"] if x["name"] == "neck_ratio")
        row = next(r for r in S20["spine"]["loft"]["section"]["stations"] if abs(r[0] - 1.2) < 1e-9)
        self.assertAlmostEqual(k["at"][0], row[1][2], places=4)
        moved = S.apply_patch(S20, [{"op": "replace", "path": k["ptr"], "value": k["value"] + 0.02}])
        row2 = next(r for r in moved["spine"]["loft"]["section"]["stations"] if abs(r[0] - 1.2) < 1e-9)
        self.assertAlmostEqual((row2[1][2] - row[1][2]) * k["gain"], 0.02, places=3)

    def test_the_quadruped_plan_answers_in_the_same_shape_without_a_cage(self):
        q = copy.deepcopy(S20)
        q["plan"] = "quadruped"
        v = self.view(q)
        self.assertFalse(v["built"])
        self.assertEqual([r["name"] for r in v["ranges"]], ["head", "neck", "back", "seat", "tail"])
        self.assertEqual({k["name"] for k in v["knobs"]}, {"neck_ratio", "R_scale", "chest_front", "rump_gain"})
        self.assertIsNone(v["outline"])
        zs = {round(p[2], 3) for p in v["path"]}
        self.assertEqual(len(zs), 1)                         # a horizontal spine
        self.assertGreater(v["path"][0][0], v["path"][-1][0])  # the head at the front, +x

    def test_a_plan_with_no_spine_view_answers_nothing(self):
        self.assertIsNone(SP.spine_view(dict(S20, plan="serpent")))


class TestServer(unittest.TestCase):
    def setUp(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        self.sp = os.path.join(SCRATCH, "species")
        os.makedirs(self.sp)
        self.file = os.path.join(self.sp, "S20.json")
        S.write_spec(self.file, S20)
        self.srv = SV.Server(os.path.join(SCRATCH, "home"), [self.sp], proxy_workers=0)
        self.srv.start()

    def tearDown(self):
        self.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def req(self, path, method="GET", body=None, tok="wb-local-maker"):
        r = urllib.request.Request(f"http://127.0.0.1:{self.srv.port}{path}", method=method, data=None if body is None else json.dumps(body).encode(),
                                   headers={"Content-Type": "application/json", "Authorization": f"Bearer {tok}"})
        try:
            with urllib.request.urlopen(r) as resp:
                return resp.status, json.load(resp)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_the_spine_view_is_served(self):
        st, j = self.req("/api/species/S20/spine")
        self.assertEqual((st, j["plan"], j["built"]), (200, "biped", True))

    def test_a_knob_save_logs_the_knob_alone_and_undo_brings_the_table_back(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/loft/head_profile/neck_ratio", "value": 0.8}])
        self.assertEqual(st, 200)
        self.assertEqual([c["path"] for c in j["changed"]], ["/spine/loft/head_profile/neck_ratio"])
        saved = json.load(open(self.file))
        self.assertNotEqual(saved["spine"]["loft"]["section"]["stations"], S20["spine"]["loft"]["section"]["stations"])
        st, h = self.req("/api/species/S20/history")
        self.assertEqual([e["path"] for e in h["entries"]], ["/spine/loft/head_profile/neck_ratio"])
        st, j = self.req("/api/species/S20/undo", "POST")
        self.assertEqual(st, 200)
        self.assertEqual(json.load(open(self.file))["spine"]["loft"], S20["spine"]["loft"])

    def test_the_server_refuses_to_edit_the_table(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/loft/section/stations/0/1/0", "value": 0.5}])
        self.assertEqual(st, 400)
        self.assertIn("never edited", j["error"])

    def test_a_knob_beyond_the_band_is_refused_naming_the_field(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/loft/head_profile/neck_ratio", "value": 1.2}])
        self.assertEqual(st, 400)
        self.assertEqual(j["field"], "spine.loft.head_profile.neck_ratio")


if __name__ == "__main__":
    unittest.main()
