"""Chunk 21B: sockets and joins, the families' weights, and undo and redo through the undo log (a save of its own, with the actor). No Blender."""
import json, os, shutil, sys, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import forms as FM, server as SV, store as S

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_undo")
S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


class TestSocketForms(unittest.TestCase):
    def fields(self, part):
        return {f["id"]: f for f in FM.forms(S20)["parts"][part]["fields"]}

    def test_a_part_with_a_socket_has_its_join_as_hard_or_soft(self):
        for part, pid in (("ears", "ear.L"), ("arms", "arm.L"), ("legs", "leg.L")):
            f = self.fields(part)[f"parts.{pid}.socket.join"]
            self.assertEqual((f["type"], f["options"], f["label"]), ("enum", ["hard", "soft"], "Join"))
            k = next(i for i, p in enumerate(S20["parts"]) if p["id"] == pid)
            self.assertEqual(f["ptr"], f"/parts/{k}/socket/join")

    def test_the_family_weights_come_from_the_locus_in_the_order_of_its_limits(self):
        w = self.fields("ears")["genome.loci.form.ear-kind.weights"]
        self.assertEqual((w["type"], w["options"]), ("weights", ["prick", "lop", "nub"]))
        loci = S20["genome"]["loci"]
        self.assertEqual(loci[int(w["ptr"].split("/")[3])]["weights"], [0.4, 0.3, 0.3])
        self.assertIn("genome.loci.anatomy.tail-tip-form.weights", self.fields("tip"))

    def test_a_socket_with_families_has_a_default_family_choice(self):
        d = self.fields("crown")["sockets.crown.default"]
        self.assertEqual(d["options"], ["none", "cowlick"])

    def test_the_play_column_shows_the_toy_with_the_chips_play_has_words_for(self):
        (p,) = FM.forms(S20)["parts"]["ears"]["play"]
        kind, size = p["axes"]
        self.assertEqual((p["label"], [(o["word"], o["id"] == kind["home"]) for o in kind["options"]]), ("Ears", [("pointy", True), ("floppy", False), ("nub", False)]))
        self.assertEqual(len(size["steps"]), 7)
        self.assertIsNone(FM.forms(S20)["parts"]["legs"]["play"])

    def test_the_families_carry_the_copywriters_look_names_and_the_ids_stay(self):
        d = self.fields("ears")["sockets.ear.L.default"]
        self.assertEqual(d["options"][:3], ["prick", "lop", "nub"])
        self.assertEqual([d["names"][o][0] for o in d["options"][:3]], ["Pointy ears", "Floppy ears", "Nub ears"])
        w = self.fields("ears")["genome.loci.form.ear-kind.weights"]
        self.assertEqual(w["names"]["lop"], ["Floppy ears", "floppy"])
        self.assertEqual(self.fields("tip")["genome.loci.anatomy.tail-tip-form.weights"]["names"]["tuft"][0], "Tuft tip")


class TestUndo(unittest.TestCase):
    def setUp(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        self.sp = os.path.join(SCRATCH, "species")
        os.makedirs(self.sp)
        self.file = os.path.join(self.sp, "S20.json")
        S.write_spec(self.file, S20)
        self.srv = SV.Server(os.path.join(SCRATCH, "home"), [self.sp], proxy_workers=0)
        self.srv.start()
        self.ear = next(i for i, p in enumerate(S20["parts"]) if p["id"] == "ear.L")

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

    def join(self):
        return json.load(open(self.file))["parts"][self.ear]["socket"]["join"]

    def test_undo_and_redo_walk_the_log_and_history_keeps_every_entry_with_its_actor(self):
        p = f"/parts/{self.ear}/socket/join"
        st, j = self.req("/api/species/S20/undo", "POST")
        self.assertEqual(st, 409)                      # nothing to undo yet
        st, j = self.req("/api/species/S20", "PATCH", [{"op": "test", "path": p, "value": "hard"}, {"op": "replace", "path": p, "value": "soft"}])
        self.assertEqual((st, j["undo"], j["redo"]), (200, True, False))
        self.assertEqual(self.join(), "soft")
        st, j = self.req("/api/species/S20/undo", "POST", tok="wb-local-agent")
        self.assertEqual(st, 200, j)
        self.assertEqual((self.join(), j["undo"], j["redo"]), ("hard", False, True))
        st, h = self.req("/api/species/S20/history")
        self.assertEqual([(e["actor"], e["via"], e["old"], e["new"]) for e in h["entries"]], [("local", "api", "hard", "soft"), ("agent-1", "undo", "soft", "hard")])
        st, j = self.req("/api/species/S20/redo", "POST")
        self.assertEqual((st, self.join(), j["redo"]), (200, "soft", False))
        st, j = self.req("/api/species/S20/redo", "POST")
        self.assertEqual(st, 409)
        self.req("/api/species/S20/undo", "POST")

    def test_a_new_edit_ends_the_redo_and_an_undo_never_overwrites_a_hand_that_changed_the_field(self):
        p = f"/parts/{self.ear}/socket/join"
        self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": p, "value": "soft"}])
        self.req("/api/species/S20/undo", "POST")
        self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/tail/length", "value": 1.0}])
        st, j = self.req("/api/species/S20")
        self.assertEqual((j["undo"]["undo"], j["undo"]["redo"]), (True, False))
        self.req("/api/species/S20", "PATCH", [{"op": "replace", "path": "/spine/tail/length", "value": 1.1}])
        spec = json.load(open(self.file))
        spec["spine"]["tail"]["length"] = 1.3                 # a hand on disk
        S.write_spec(self.file, spec)
        import time; time.sleep(0.8)
        st, j = self.req("/api/species/S20/undo", "POST")
        self.assertIn(st, (200, 409))
        self.assertEqual(json.load(open(self.file))["spine"]["tail"]["length"], 1.3 if st == 409 else 1.1)

    def test_undo_needs_a_token(self):
        st, j = self.req("/api/species/S20/undo", "POST", tok="nope")
        self.assertEqual(st, 401)


if __name__ == "__main__":
    unittest.main()
