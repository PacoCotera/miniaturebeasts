"""Chapter 13: the play surface. The plan declares the toys, the file may relabel, hide or narrow them and never widen them; the safe-step sweep trims the steps that fail at a corner of the step box; a play save refuses a failing edit.
The pure parts run with no Blender; the server tests run a proxy worker and build real clay."""
import copy, json, os, shutil, sys, time, unittest, urllib.error, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import play as PL, server as SV, store as S, cli
import species_v1 as V1

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_play")
S20 = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))


def with_play(**kw):
    d = copy.deepcopy(S20)
    d["play"] = kw
    return d


class TestSurface(unittest.TestCase):
    def test_the_plan_declares_up_to_six_toys_each_with_a_few_steps(self):
        toys = PL.toys_of(S20)
        self.assertLessEqual(len(toys), PL.MAX_TOYS)
        self.assertEqual([t["id"] for t in toys], ["body", "ears", "tail", "paint", "pattern"])
        for t in toys:
            for a in t["axes"]:
                if a["kind"] == "range":
                    self.assertIn(len(a["steps"]), (5, 6, 7, 8))                     # sliders 5 to 7 steps, the 8 paint pots
                else:
                    self.assertGreaterEqual(len(a["options"]), 3)

    def test_a_step_is_inside_the_genes_hard_limits_and_has_the_genome_that_builds_its_picture(self):
        ax = PL.toys_of(S20)[0]["axes"][0]
        self.assertEqual((ax["steps"][0]["value"], ax["steps"][-1]["value"]), (0.95, 1.06))
        self.assertEqual(ax["steps"][0]["end"]["genome"], "set:form.torso-girth=0.95")
        self.assertEqual(ax["home"], 3)

    def test_a_file_may_relabel_hide_and_narrow(self):
        d = with_play(toys=[dict(id="tail", label="Wag", narrow=dict(length=dict(lo=0.9, hi=1.2), tip=dict(only=["lantern", "plain"]))), dict(id="ears", hide=True)])
        self.assertEqual(V1.validate(d), [])
        t = {x["id"]: x for x in PL.toys_of(d)}
        self.assertEqual((t["tail"]["label"], t["tail"]["plain"], t["ears"]["hidden"]), ("Wag", "Tail", True))
        ln = t["tail"]["axes"][0]["steps"]
        self.assertEqual((ln[0]["value"], ln[-1]["value"]), (0.9, 1.2))
        self.assertEqual([o["id"] for o in t["tail"]["axes"][2]["options"]], ["lantern", "plain"])

    def test_a_widening_is_refused_and_names_the_field(self):
        for toy, narrow, field in ((("tail"), dict(length=dict(lo=0.7)), "play.toys.tail.narrow.length.lo"), ("tail", dict(length=dict(hi=1.5)), "play.toys.tail.narrow.length.hi"),
                                   ("ears", dict(kind=dict(only=["prick", "frond"])), "play.toys.ears.narrow.kind.only"), ("body", dict(size=dict(lo=0.5, hi=2)), "play.toys.body.narrow.size.lo")):
            errs = dict(V1.validate(with_play(toys=[dict(id=toy, narrow=narrow)])))
            self.assertIn(field, errs, (toy, narrow))
            self.assertIn("never widen", errs[field])

    def test_a_species_cannot_add_a_toy_or_an_axis_and_a_state_must_stay_inside_the_narrowed_toy(self):
        self.assertIn("play.toys.wings", dict(V1.validate(with_play(toys=[dict(id="wings")]))))
        self.assertIn("play.toys.tail.narrow.spin", dict(V1.validate(with_play(toys=[dict(id="tail", narrow=dict(spin=dict(lo=0)))]))))
        d = with_play(toys=[dict(id="tail", narrow=dict(length=dict(hi=1.1)))], state={"form.tail-length": 1.2})
        self.assertIn("play.state.form.tail-length", dict(V1.validate(d)))
        self.assertEqual(V1.validate(with_play(state={"form.tail-length": 1.2, "form.ear-kind": "lop"}, starter=True)), [])

    def test_a_toy_the_files_genes_do_not_reach_is_left_out(self):
        d = copy.deepcopy(S20)
        d["genome"]["loci"] = [l for l in d["genome"]["loci"] if l["locus"] != "form.tail-curl"]
        d["genome"]["chapters"] = d["genome"]["chapters"]
        tail = [t for t in PL.toys_of(d) if t["id"] == "tail"][0]
        self.assertEqual([a["id"] for a in tail["axes"]], ["length", "tip"])

    def test_the_quadruped_declares_its_toys_against_the_plan_interface(self):
        d = copy.deepcopy(S20)
        d["plan"] = "quadruped"
        self.assertEqual([t["id"] for t in PL.toys_of(d)], ["body", "ears", "tail", "paint", "pattern"])
        self.assertFalse(PL.BUILT["quadruped"])
        r = PL.unbuilt(d)
        self.assertTrue(r["unbuilt"] and r["builds"] == 0 and r["toys"] == {})


class TestSentences(unittest.TestCase):
    def test_the_order_is_the_files_words_then_the_checks_then_the_copywriters_words(self):
        self.assertEqual(PL.sentence_of(S20, "tail.size"), ("check", "Any more tail and I'd tip over backwards!"))
        self.assertEqual(PL.sentence_of(S20, "joins"), ("words", "Then I wouldn't fit together any more!"))
        self.assertEqual(PL.sentence_of(S20, "joins", "ears")[1], "Then my ears wouldn't fit on my head!")
        self.assertEqual(PL.sentence_of(S20, "verts"), ("words", "That's as far as I can go!"))
        d = with_play(words={"tail.size": "Wobbly!"})
        self.assertEqual(PL.sentence_of(d, "tail.size"), ("file", "Wobbly!"))

    def test_every_cage_check_that_a_toy_can_reach_has_a_slot_and_the_ones_no_toy_reaches_say_so(self):
        sl = PL.slots(S20)
        self.assertTrue({"head.neck", "tail.size", "tail.taper", "balance", "joins", "limbs", "head.attach"} <= {s["check"] for s in sl if s["toy"]})
        self.assertEqual({s["check"] for s in sl if s["toy"] is None}, {"verts", "normals", "mesh"})
        self.assertTrue(all(s["situation"] and s["sentence"] for s in sl))

    def test_a_words_entry_must_name_a_check(self):
        self.assertIn("play.words.nope", dict(V1.validate(with_play(words={"nope": "x"}))))


class TestSweep(unittest.TestCase):
    """The algorithm with a stand-in for the build: a corner fails when the tail length is above step 4 and the body is thin."""
    def fails_factory(self, rule):
        calls = []

        def fails_of(states):
            calls.append(len(states))
            return [rule(s) for s in states]
        return fails_of, calls

    def test_a_box_that_passes_everywhere_trims_nothing(self):
        f, calls = self.fails_factory(lambda s: [])
        r = PL.sweep(S20, f)
        self.assertEqual(r["still_failing"], 0)
        self.assertTrue(all(not a.get("trimmed") and not a.get("banned") for t in r["toys"].values() for a in t.values()))
        self.assertEqual(r["rounds"], 1)
        self.assertEqual(r["builds"], 28)                                       # 2^4 corners of the four sliders and the six chips crossed with their toy's corners (the paint and pattern toys have no clay of their own)

    def test_a_failing_end_is_trimmed_on_the_toy_the_check_is_about_and_the_rest_are_left(self):
        tail = lambda s: s.get("form.tail-length", 1.0) > 1.1
        f, _ = self.fails_factory(lambda s: ["tail.size"] if tail(s) else [])
        r = PL.sweep(S20, f)
        ln = r["toys"]["tail"]["length"]
        self.assertEqual((ln["lo"], ln["hi"]), (0, 3))                          # steps 4 to 6 (1.133, 1.217, 1.3) are trimmed, 1.05 is not
        self.assertEqual(sorted(x["step"] for x in ln["trimmed"]), [4, 5, 6])
        self.assertTrue(all(x["checks"] == ["tail.size"] for x in ln["trimmed"]))
        self.assertEqual((r["toys"]["body"]["size"]["lo"], r["toys"]["body"]["size"]["hi"]), (0, 6))
        self.assertEqual(r["still_failing"], 0)

    def test_a_chip_that_fails_is_banned(self):
        f, _ = self.fails_factory(lambda s: ["tail.size"] if s.get("anatomy.tail-tip-form") == "plain" else [])
        r = PL.sweep(S20, f)
        self.assertEqual([b["option"] for b in r["toys"]["tail"]["tip"]["banned"]], ["plain"])

    def test_two_toys_that_fail_together_are_found_by_putting_each_back_home(self):
        f, _ = self.fails_factory(lambda s: ["tail.size"] if s.get("form.tail-length", 1.0) > 1.1 and s.get("form.torso-girth", 1.005) < 1.0 else [])
        r = PL.sweep(S20, f)
        self.assertEqual(r["still_failing"], 0)
        tr = [x for t in r["toys"].values() for a in t.values() for x in a.get("trimmed", [])]
        self.assertTrue(tr)
        self.assertEqual(r["toys"]["ears"]["size"]["lo"], 0)                    # the ears toy is not blamed for a body and tail corner

    def test_the_sweep_never_passes_the_step_the_mibi_stands_on(self):
        f, _ = self.fails_factory(lambda s: ["tail.size"] if s else [])
        r = PL.sweep(S20, f)
        self.assertEqual((r["toys"]["tail"]["length"]["lo"], r["toys"]["tail"]["length"]["hi"]), (2, 2))

    def test_the_trims_are_laid_over_the_toys(self):
        f, _ = self.fails_factory(lambda s: ["tail.size"] if s.get("form.tail-length", 1.0) > 1.1 else [])
        r = PL.sweep(S20, f)
        steps = [t for t in PL.toys_of(S20, r) if t["id"] == "tail"][0]["axes"][0]["steps"]
        self.assertEqual([x["ok"] for x in steps], [True] * 4 + [False] * 3)
        self.assertEqual(steps[6]["why"], ["tail.size"])


class TestEdit(unittest.TestCase):
    def test_a_move_is_a_patch_of_the_mibis_own_state(self):
        self.assertEqual(PL.edit_ops(S20, "tail", "length", 5), [dict(op="add", path="/play", value=dict(state={"form.tail-length": 1.216667}))])
        d = with_play(state={"form.ear-kind": "lop"})
        self.assertEqual(PL.edit_ops(d, "tail", "tip", "tuft"), [dict(op="add", path="/play/state/anatomy.tail-tip-form".replace("/", "/", 1), value="tuft")])
        self.assertEqual(PL.state_genome(S.apply_patch(d, PL.edit_ops(d, "tail", "tip", "tuft"))), "set:anatomy.tail-tip-form=tuft;form.ear-kind=lop")

    def test_a_step_the_toy_does_not_have_is_refused(self):
        for args in (("tail", "length", 7), ("tail", "length", -1), ("tail", "tip", "frond"), ("wings", "x", 1), ("tail", "spin", 1)):
            with self.assertRaises(ValueError):
                PL.edit_ops(S20, *args)
        d = with_play(toys=[dict(id="ears", hide=True)])
        with self.assertRaises(ValueError):
            PL.edit_ops(d, "ears", "kind", "lop")

    def test_the_cage_key_and_the_type_do_not_move_for_a_play_field(self):
        from wb import facade as F
        d = with_play(state={"form.tail-length": 1.2})
        self.assertEqual(F.cage_key(d, "type"), F.cage_key(S20, "type"))


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        S.write_spec(os.path.join(cls.sp, "S20.json"), S20)
        tight = copy.deepcopy(S20)
        tight["id"], tight["name"], tight["limits"] = "S21", "Tuliko, tight tail", {"tail_side_area": 0.2}
        S.write_spec(os.path.join(cls.sp, "S21.json"), tight)
        quad = copy.deepcopy(S20)
        quad["id"], quad["name"], quad["plan"] = "S22", "", "quadruped"
        quad["spine"]["head_attach"].update(a=0.0, d=0.0)
        S.write_spec(os.path.join(cls.sp, "S22.json"), quad)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=1, plush_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        for _ in range(120):                                            # the proof pictures of the failing builds are composed in a browser; let them finish before the folder goes
            if cls.srv.proofs.empty():
                break
            time.sleep(0.5)
        time.sleep(6)
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def req(self, path, method="GET", body=None):
        r = urllib.request.Request(f"http://127.0.0.1:{self.srv.port}{path}", method=method, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type": "application/json", "Authorization": "Bearer wb-local-maker"})
        try:
            with urllib.request.urlopen(r, timeout=300) as resp:
                return resp.status, json.load(resp)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_1_the_toys_route_answers_with_the_toys_the_slots_and_the_sentences(self):
        st, j = self.req("/api/species/S20/toys")
        self.assertEqual(st, 200)
        self.assertEqual((j["plan"], j["built"], j["sweep"]["state"]), ("biped", True, "none"))
        self.assertEqual(j["sentences"]["tail.size"], "Any more tail and I'd tip over backwards!")
        self.assertTrue(all(s["source"] in ("check", "words") for s in j["slots"]))
        self.assertEqual(j["by_toy"]["tail"]["joins"], "Then my tail wouldn't fit on right!")

    def test_2_a_play_save_that_passes_is_saved_and_a_toy_step_that_does_not_exist_is_a_400(self):
        st, j = self.req("/api/species/S20/play", "POST", dict(toy="ears", axis="kind", to="lop"))
        self.assertEqual((st, j["ok"]), (200, True))
        self.assertEqual(j["genome"], "set:form.ear-kind=lop")
        self.assertEqual((j["plush"]["ready"], len(j["plush"]["key"]), bool(j["plush"]["job"]), bool(j["clay_job"])), (False, 64, True, True))      # not drawn yet: the clay at once, the plush behind it
        self.assertEqual(self.srv.species["S20"].spec["play"]["state"], {"form.ear-kind": "lop"})
        self.assertEqual(self.req("/api/species/S20/play", "POST", dict(toy="tail", axis="length", to=12))[0], 400)

    def test_3_a_play_save_that_fails_a_check_is_refused_with_the_mibis_sentence_and_nothing_is_saved(self):
        before = json.dumps(self.srv.species["S21"].spec, sort_keys=True)
        st, j = self.req("/api/species/S21/play", "POST", dict(toy="tail", axis="length", to=6))
        self.assertEqual((st, j["ok"], j["refused"], j["why"]), (409, False, True, "check"))
        self.assertEqual((j["checks"][0]["check"], j["sentence"]), ("tail.size", "Any more tail and I'd tip over backwards!"))
        self.assertEqual(j["back_to"], 2)
        self.assertEqual(json.dumps(self.srv.species["S21"].spec, sort_keys=True), before)
        st, j = self.req("/api/species/S21/play", "POST", dict(toy="tail", axis="length", to=1))
        self.assertEqual((st, j["ok"]), (200, True))

    def test_4_studio_still_saves_the_same_edit_and_shows_it_red(self):
        st, j = self.req("/api/species/S20", "PATCH", [dict(op="replace", path="/spine/tail/length", value=1.6)])
        self.assertEqual(st, 200)
        self.assertEqual(self.srv.species["S20"].spec["spine"]["tail"]["length"], 1.6)

    def test_5_the_sweep_trims_the_steps_that_fail_and_a_trimmed_step_is_refused_without_a_build(self):
        sp = self.srv.species["S21"]
        S.write_spec(sp.path, S.read_spec(sp.path))
        j = self.srv.submit("S21", "sweep", {}, dict(name="t", role="maker"))
        j.event.wait(900)
        self.assertEqual(j.state, "done", j.error)
        r = j.result
        self.assertEqual(r["still_failing"], 0)
        self.assertGreater(r["builds"], 4)
        tail = r["toys"]["tail"]["length"]
        self.assertTrue(tail["trimmed"])
        self.assertTrue(all("tail.size" in x["checks"] for x in tail["trimmed"]))
        again = self.srv.submit("S21", "sweep", {}, dict(name="t", role="maker"))
        self.assertTrue(again.cached)
        st, t = self.req("/api/species/S21/toys")
        self.assertEqual(t["sweep"]["state"], "fresh")
        steps = [x for x in t["toys"] if x["id"] == "tail"][0]["axes"][0]["steps"]
        self.assertFalse(steps[-1]["ok"])
        st, ref = self.req("/api/species/S21/play", "POST", dict(toy="tail", axis="length", to=len(steps) - 1))
        self.assertEqual((st, ref["why"]), (409, "trimmed"))

    def test_6_a_plan_with_no_cage_builder_lists_its_steps_and_the_sweep_says_so(self):
        j = self.srv.submit("S22", "sweep", {}, dict(name="t", role="maker"))
        j.event.wait(60)
        self.assertEqual(j.state, "done")
        self.assertTrue(j.result["unbuilt"] and j.result["builds"] == 0)
        st, t = self.req("/api/species/S22/toys")
        self.assertEqual((t["built"], len(t["toys"])), (False, 5))
        st, ref = self.req("/api/species/S22/play", "POST", dict(toy="tail", axis="length", to=1))
        self.assertEqual((st, ref["why"]), (409, "unbuilt"))


class TestCli(unittest.TestCase):
    def test_the_commands_exist(self):
        import io, contextlib
        for cmd in ("toys", "sweep", "step"):
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf), self.assertRaises(SystemExit):
                cli.main([cmd, "--help"])
            self.assertIn(cmd, buf.getvalue())


if __name__ == "__main__":
    unittest.main()
