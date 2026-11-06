"""Chapter 21: the Shape forms. The outline and each part's fields come from the file and the plan alone; a save is a JSON patch the server checks against the schema and the plan. No Blender."""
import copy, json, os, shutil, sys, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import forms as FM, server as SV, store as S
import species_v1 as V1

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_forms")
S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


class TestOutline(unittest.TestCase):
    def test_the_spine_ranges_with_the_parts_nested_under_the_range_they_grow_from(self):
        rows = FM.outline(S20)
        self.assertEqual([(r["id"], r["under"]) for r in rows if r["kind"] != "section"],
                         [("head", None), ("ears", "head"), ("crown", "head"), ("face", "head"), ("neck", None), ("back", None), ("arms", "back"), ("seat", None), ("legs", "seat"), ("tail", None), ("tip", "tail")])
        self.assertEqual([r["id"] for r in rows if r["kind"] == "section"], ["coat", "motion", "renders"])
        self.assertEqual(rows[-1]["id"], "renders")
        self.assertTrue(all(r["sw"] for r in rows if r["kind"] == "range") and not any(r["sw"] for r in rows if r["kind"] != "range"))

    def test_a_part_the_file_does_not_have_has_no_row(self):
        doc = copy.deepcopy(S20)
        doc["parts"] = [p for p in doc["parts"] if p["id"] != "arm.L"]
        doc["sockets"] = [s for s in doc["sockets"] if s["id"] != "crown"]
        ids = [r["id"] for r in FM.outline(doc)]
        self.assertNotIn("arms", ids)
        self.assertNotIn("crown", ids)
        self.assertIn("ears", ids)

    def test_the_ranges_are_the_files_in_the_plans_order(self):
        self.assertEqual([r["id"] for r in FM.outline(S20) if r["kind"] == "range"], V1.PLANS["biped"]["ranges"])


class TestFields(unittest.TestCase):
    def fields(self, part, doc=S20):
        return {f["id"]: f for f in FM.fields_of(doc, part)}

    def test_the_tail_has_its_schema_labels_units_and_the_plans_bands(self):
        f = self.fields("tail")
        self.assertEqual([x["label"] for x in f.values()], ["Length", "Root", "Tip radius", "Curl", "Roundness"])
        ln = f["spine.tail.length"]
        self.assertEqual((ln["ptr"], ln["full"], ln["unit"], ln["range"], ln["type"]), ("/spine/tail/length", "Tail length", "H", [0.6, 1.8], "number"))
        self.assertEqual(f["spine.tail.root"]["range"], [0.1, 0.45])
        self.assertEqual(f["spine.tail.root"]["unit"], "× seat")
        self.assertEqual(f["spine.tail.curl.turns"]["ptr"], "/spine/tail/curl/turns")
        self.assertEqual(f["spine.tail.curl.turns"]["unit"], "turn")

    def test_a_range_length_comes_from_the_plan_by_the_range_name(self):
        f = self.fields("neck")["spine.ranges.neck.length"]
        self.assertEqual((f["ptr"], f["range"], f["label"]), ("/spine/ranges/1/length", [0.15, 0.4], "Length"))
        self.assertEqual(self.fields("head")["spine.ranges.head.length"]["range"], [0.7, 1.3])
        self.assertEqual(json.loads(json.dumps(self.fields("tail"))).keys(), self.fields("tail").keys())

    def test_every_pointer_points_at_a_number_in_the_file(self):
        for part in [r["id"] for r in FM.outline(S20) if r["kind"] != "section"]:
            for f in FM.fields_of(S20, part):
                cur = S20
                for t in f["ptr"].split("/")[1:]:
                    cur = cur[int(t)] if isinstance(cur, list) else cur[t]
                self.assertIsInstance(cur, (int, float), f["id"])
                lo, hi = f["range"]
                self.assertTrue(lo <= cur <= hi, f"{f['id']}: the file's own value {cur} is inside the plan's band")

    def test_a_limb_lists_each_joint_by_its_name(self):
        f = self.fields("legs")
        self.assertEqual([x["label"] for x in f.values()], ["Roundness", "Hip to knee", "Knee to ankle", "Ankle to sole"])
        self.assertEqual(f["parts.leg.L.chain.knee.len"]["ptr"], "/parts/0/chain/0/len")

    def test_a_part_with_nothing_modelled_has_no_fields(self):
        for p in ("crown", "face", "tip"):
            self.assertEqual(FM.fields_of(S20, p), [])

    def test_the_label_drops_the_part_word_only_when_enough_is_left(self):
        self.assertEqual(FM.short_label("Tail root", "Tail"), "Root")
        self.assertEqual(FM.short_label("Tail tip radius", "Tail"), "Tip radius")
        self.assertEqual(FM.short_label("Head a", "Head"), "Head a")
        self.assertEqual(FM.short_label("Curl", "Tail"), "Curl")

    def test_the_step_is_one_a_hand_can_land_on(self):
        self.assertEqual(FM.nice_step(1.2), 0.01)
        self.assertEqual(FM.nice_step(0.08), 0.001)
        self.assertEqual(FM.nice_step(1440), 10)

    def test_the_schema_decides_the_kind_so_a_new_field_needs_no_form_code(self):
        d = FM._field(S20, "Ears", "/parts/1/socket/join", "parts.ear.L.socket.join", "parts[].socket.join")
        self.assertEqual((d["type"], d["options"]), ("enum", ["hard", "soft"]))


class TestShapeServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        cls.file = os.path.join(cls.sp, "S20.json")
        S.write_spec(cls.file, S20)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def req(self, path, method="GET", body=None):
        r = urllib.request.Request(f"http://127.0.0.1:{self.srv.port}{path}", method=method, data=None if body is None else json.dumps(body).encode(),
                                   headers={"Content-Type": "application/json", "Authorization": "Bearer wb-local-maker"})
        try:
            with urllib.request.urlopen(r) as resp:
                return resp.status, json.load(resp)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_the_server_answers_with_the_outline_and_the_fields(self):
        st, j = self.req("/api/species/S20/forms")
        self.assertEqual(st, 200)
        self.assertEqual(j["plan"], "biped")
        self.assertEqual(j["parts"]["tail"]["fields"][0]["ptr"], "/spine/tail/length")
        self.assertEqual(j["parts"]["tail"]["kind"], "range")
        self.assertEqual(j["parts"]["ears"]["kind"], "part")

    def test_a_save_changes_the_file_and_names_the_field_in_the_log(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "test", "path": "/spine/tail/length", "value": 1.25}, {"op": "replace", "path": "/spine/tail/length", "value": 1.2}])
        self.assertEqual(st, 200, j)
        self.assertEqual([(c["path"], c["old"], c["new"]) for c in j["changed"]], [("/spine/tail/length", 1.25, 1.2)])
        self.assertEqual(json.load(open(self.file))["spine"]["tail"]["length"], 1.2)
        st, j = self.req("/api/species/S20")
        self.assertEqual(j["history"][-1]["path"], "/spine/tail/length")

    def test_the_server_refuses_a_value_the_plan_will_not_have_and_says_which_field(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/tail/length", "value": 9}])
        self.assertEqual(st, 400)
        self.assertEqual(j["field"], "spine.tail.length")
        self.assertIn("the biped plan allows 0.6 to 1.8", j["error"])
        self.assertNotEqual(json.load(open(self.file))["spine"]["tail"]["length"], 9)

    def test_a_save_over_a_hand_that_changed_the_field_meanwhile_is_refused(self):
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "test", "path": "/spine/tail/length", "value": 0.7}, {"op": "replace", "path": "/spine/tail/length", "value": 1.0}])
        self.assertEqual(st, 409)
        self.assertEqual(j["field"], "/spine/tail/length")


if __name__ == "__main__":
    unittest.main()


class TestCopywritersWords(unittest.TestCase):
    """The words of chunks 21, 21B and 22 (cw-chunks-21-22): ids unchanged, labels and names the copywriter picked."""
    def test_the_head_attachment_and_the_profile_knobs_have_plain_labels_and_the_inspector_shortens_them(self):
        f = {x["id"]: x for x in FM.fields_of(S20, "head")}
        self.assertEqual((f["spine.head_attach.a"]["full"], f["spine.head_attach.a"]["label"]), ("Head spine reach", "Spine reach"))
        self.assertEqual((f["spine.head_attach.d"]["full"], f["spine.head_attach.d"]["label"]), ("Head overhang", "Overhang"))
        self.assertEqual(f["spine.loft.head_profile.R_scale"]["full"], "Head size")
        n = {x["id"]: x for x in FM.fields_of(S20, "neck")}["spine.loft.head_profile.neck_ratio"]
        self.assertEqual((n["full"], n["label"], n["unit"]), ("Neck width", "Width", "× head"))
        self.assertEqual({x["id"]: x for x in FM.fields_of(S20, "seat")}["spine.loft.head_profile.rump_gain"]["full"], "Seat fullness")

    def test_default_look_and_wild_odds_replace_default_family_and_how_often(self):
        d = {x["id"]: x for x in FM.socket_fields(S20, "ears")}
        self.assertEqual(d["sockets.ear.L.default"]["label"], "Default look")
        self.assertEqual(d["sockets.ear.L.default"]["names"]["frond"][0], "Frond ears (frond)")
        w = d["genome.loci.form.ear-kind.weights"]
        self.assertEqual((w["label"], w["full"]), ("Wild odds", "Ear shape, wild odds"))
        self.assertEqual(w["help"], "Each look's share of wild draws. They add up to 100%.")
        c = {x["id"]: x for x in FM.socket_fields(S20, "crown")}["sockets.crown.default"]
        self.assertEqual([c["options"], [c["names"][o][0] for o in c["options"]]], [["none", "cowlick"], ["Smooth crown (smooth)", "Cowlick (cowlick)"]])

    def test_a_refusal_says_what_the_plan_allows(self):
        d = copy.deepcopy(S20)
        d["spine"]["tail"]["length"] = 9
        self.assertIn(("spine.tail.length", "spine.tail.length is 9 H; the biped plan allows 0.6 to 1.8"), V1.validate(d))
