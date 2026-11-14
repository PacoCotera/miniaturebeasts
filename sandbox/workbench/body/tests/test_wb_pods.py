"""Chunk 15: play, babies and growing up. The pods a make drops (a cross of the mibi, never a breeding), how different they are, the age a gated look shows from, direct kin refused as the game refuses it, keeping a pod as a mibi of its own,
and the toys that belong to the pods. No Blender here: the plush worker is off, so a picture is asked for and never drawn."""
import copy, json, os, shutil, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import play as PL, server as SV, store as S, facade as F
import expressions as E

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S71 = S.read_spec(os.path.join(BODY, "species_play", "S71.json"))
SCRATCH = os.path.join(BODY, "scratch", "t_pods")


def dist(d, a, b):
    """How far two pods' blends are apart, in shares of the pool."""
    return sum(abs(E._value(e["locus"], a[e["locus"]][0]) - E._value(e["locus"], b[e["locus"]][0])) for e in d["genome"]["loci"] if e["op"] == "blend" and e["locus"] not in E.ABS_RECORD and not E.is_modifier(e))


class TestPods(unittest.TestCase):
    def test_six_pods_each_a_whole_genome_that_builds_and_the_same_six_when_asked_again(self):
        a, b = PL.make_pods(S71, 0, "some"), PL.make_pods(S71, 0, "some")
        self.assertEqual(len(a), 6)
        self.assertEqual([p["copies"] for p in a], [p["copies"] for p in b])
        self.assertNotEqual([p["copies"] for p in a], [p["copies"] for p in PL.make_pods(S71, 1, "some")])          # More pods: the next round is six others
        ispec = F.internal(S71)
        keys = set()
        for p in a:
            self.assertEqual(set(p["copies"]), {e["locus"] for e in S71["genome"]["loci"]})
            ind = F.resolve_genome(PL.pod_selector(p["copies"]), ispec)
            keys.add(F.cage_key(S71, PL.pod_selector(p["copies"])))
            self.assertIn("appearance.body-hue", ind["t"])
        self.assertGreater(len(keys), 3)                                                                 # the pods differ in the cage, not only in colour

    def test_a_pod_never_equals_its_parent_and_every_copy_is_inside_the_pool(self):
        parent = PL.parent_copies(S71)
        for dial in PL.DIALS:
            for r in range(5):
                for p in PL.make_pods(S71, r, dial):
                    self.assertNotEqual(PL._copies_key(p["copies"]), PL._copies_key(parent))
                    for e in S71["genome"]["loci"]:
                        for c in p["copies"][e["locus"]]:
                            if e["op"] == "blend":
                                self.assertTrue(0.0 <= E._value(e["locus"], c) <= 1.0 or e["locus"] in E.ABS_RECORD)
                            else:
                                self.assertIn(str(c), [str(x) for x in e["limits"]])

    def test_how_different_alike_some_wild_are_three_widths(self):
        parent = PL.parent_copies(S71)
        mean = {}
        for dial in PL.DIALS:
            ds = [dist(S71, parent, p["copies"]) for r in range(8) for p in PL.make_pods(S71, r, dial)]
            mean[dial] = sum(ds) / len(ds)
        self.assertLess(mean["alike"], mean["some"])
        self.assertLess(mean["some"], mean["wild"])
        self.assertLess(mean["alike"], 0.5 * mean["wild"])

    def test_some_shows_visible_variety_in_the_six_not_five_alike(self):
        """The six pods share the dial's width between them: at "some" every pair is apart, and the nearest pair is not a tenth of the widest."""
        for doc in (S71,):
            par = PL.parent_copies(doc)
            ps = [p["copies"] for p in PL.make_pods(doc, 0, "some")]
            ds = [dist(doc, a, b) for i, a in enumerate(ps) for b in ps[i + 1:]]
            self.assertEqual(len(ps), 6)
            self.assertGreater(min(ds), 0.1 * max(ds))
            near = sorted(dist(doc, par, c) for c in ps)
            self.assertGreater(near[1], 0.2 * near[-1], "five of six look like the parent")
            for locus in ("form.head", "form.tail-length", "form.ear-length", "form.torso-girth"):                 # each visible shape gene has pods at both sides of the parent
                v = [E._value(locus, c[locus][0]) for c in ps]
                t0 = (E._value(locus, par[locus][0]) + E._value(locus, par[locus][1])) / 2
                self.assertTrue(min(v) < t0 - 0.05 and max(v) > t0 + 0.05 or locus == "form.torso-girth", locus)

    def test_the_body_and_face_stay_inside_the_middle_of_their_pools_even_when_wild(self):
        for r in range(6):
            for p in PL.make_pods(S71, r, "wild"):
                for e in S71["genome"]["loci"]:
                    if e["op"] == "blend" and PL._is_tight(e["locus"]):
                        t = E._value(e["locus"], p["copies"][e["locus"]][0])
                        self.assertTrue(0.15 - 1e-6 <= t <= 0.85 + 1e-6, (e["locus"], t))


class TestGrowing(unittest.TestCase):
    def test_a_look_that_waits_for_an_age_sleeps_in_a_young_mibi_and_shows_when_grown(self):
        one = next(p for r in range(60) for p in PL.make_pods(S71, r, "wild") if "on" in p["copies"]["anatomy.whisker-presence"])
        young, grown = PL.at_stage(S71, one["copies"], "juvenile"), PL.at_stage(S71, one["copies"], "adult")
        self.assertEqual(young["anatomy.whisker-presence"], ["off", "off"])
        self.assertEqual(grown["anatomy.whisker-presence"], one["copies"]["anatomy.whisker-presence"])
        ispec = F.internal(S71)
        self.assertEqual(F.resolve_genome(PL.pod_selector(young), ispec)["t"]["face.whisker-count"], 0.0)
        self.assertGreater(F.resolve_genome(PL.pod_selector(grown), ispec)["t"]["face.whisker-count"], 0.0)
        self.assertNotEqual(F.cage_key(S71, PL.pod_selector(young)), F.cage_key(S71, PL.pod_selector(grown)))
        # what is passed on is unchanged: the young one still carries the copies
        self.assertIn("on", one["copies"]["anatomy.whisker-presence"])
        self.assertEqual(PL.gated_looks(S71, one["copies"], "juvenile"), [("whiskers", "Whiskers", False)])
        self.assertEqual(PL.gated_looks(S71, one["copies"], "adult"), [("whiskers", "Whiskers", True)])

    def test_a_pod_with_no_gated_look_is_the_same_picture_at_every_age(self):
        none = next(p for p in PL.make_pods(S71, 0, "alike") if p["copies"]["anatomy.whisker-presence"] == ["off", "off"])
        self.assertEqual(PL.at_stage(S71, none["copies"], "juvenile"), PL.at_stage(S71, none["copies"], "elder"))

    def test_the_family_strip_says_often_sometimes_rarely_and_when_grown(self):
        rows = PL.family_rows(S71)
        self.assertEqual(len(rows), 4)
        by = {r["id"]: r["how"] for r in rows}
        self.assertEqual(by["whiskers"], "grown")
        self.assertEqual(by["lantern-tail"], "often")
        self.assertTrue(all(r["how"] in ("often", "sometimes", "rarely", "grown") for r in rows))
        self.assertEqual((PL.how_often(60, False), PL.how_often(20, False), PL.how_often(3, False), PL.how_often(3, True)), ("often", "sometimes", "rarely", "grown"))


class TestToys(unittest.TestCase):
    def test_how_different_and_grow_are_toys_of_the_plan_that_the_file_may_narrow_never_widen(self):
        toys = {t["id"]: t for t in PL.toys_of(S71)}
        self.assertEqual(list(toys), ["body", "ears", "tail", "paint", "pattern", "diff", "grow"])
        self.assertEqual((toys["diff"]["label"], toys["diff"]["screen"]), ("How different?", "pods"))
        self.assertEqual([o["id"] for o in toys["diff"]["axes"][0]["options"]], ["alike", "some", "wild"])
        self.assertEqual(toys["diff"]["axes"][0]["home"], "some")
        self.assertEqual(toys["grow"]["axes"][0]["home"], "juvenile")
        d = copy.deepcopy(S71)
        d["play"] = dict(d["play"], toys=[dict(id="diff", narrow=dict(width=dict(only=["alike", "some"])))], diff="alike")
        self.assertEqual(PL.validate(d), [])
        self.assertEqual([o["id"] for o in next(t for t in PL.toys_of(d) if t["id"] == "diff")["axes"][0]["options"]], ["alike", "some"])
        d["play"]["toys"] = [dict(id="diff", narrow=dict(width=dict(only=["alike", "bewildered"])))]
        self.assertTrue(PL.validate(d))
        d["play"] = dict(d["play"], toys=[], grow="ancient")
        self.assertEqual(PL.validate(d)[0][0], "play.grow")

    def test_the_pods_toys_are_never_built_swept_or_warmed(self):
        self.assertTrue(all(i["toy"] not in ("diff", "grow") for i in PL.warm_set(S71)))
        self.assertTrue(all(a["toy"] not in ("diff", "grow") for a in PL.axes_of(S71)))
        self.assertTrue(all("play." not in k for k in PL.home_state(S71)))
        self.assertEqual(PL.edit_ops(S71, "diff", "width", "wild"), [dict(op="add", path="/play/diff", value="wild")])
        with self.assertRaises(ValueError):
            PL.edit_ops(S71, "grow", "age", "ancient")


class TestKin(unittest.TestCase):
    def test_direct_kin_never_cross_as_in_the_game(self):
        recs = dict(A=dict(id="A", parents=[]), B=dict(id="B", parents=[]), C=dict(id="C", parents=["A", "B"]), D=dict(id="D", parents=["A", "B"]), E=dict(id="E", parents=["C", "X"]),
                    F=dict(id="F", parents=["E", "Y"]), G=dict(id="G", parents=["F", "Z"]), H=dict(id="H", parents=["G", "W"]), U=dict(id="U", parents=[]), K=dict(id="K", parents=["C", "U"]))
        look = recs.get
        kin = lambda x, y: (PL.direct_kin(recs[x], recs[y], look) or {}).get("rel")
        self.assertEqual(kin("C", "A"), "parent")
        self.assertEqual(kin("A", "C"), "child")
        self.assertEqual(kin("E", "A"), "grandparent")
        self.assertEqual(kin("F", "A"), "great-grandparent")
        self.assertIsNone(kin("G", "A"))                                  # four generations up is not direct kin
        self.assertEqual(kin("C", "D"), "same-parents")                   # two children of the same pair
        self.assertIsNone(kin("E", "K"))                                  # cousins and further cross, with the penalty
        self.assertIsNone(kin("A", "U"))

    def test_pods_of_two_mibis_refuse_a_parent_and_its_child(self):
        a, b = copy.deepcopy(S71), copy.deepcopy(S71)
        a["id"], b["id"] = "M0001", "M0002"
        a["play"] = dict(a["play"], name="Churro")
        b["play"] = dict(b["play"], parents=["M0001", "M0001"], name="Luna")
        with self.assertRaises(PL.KinError) as r:
            PL.pods_with(a, b, lambda i: None)
        self.assertEqual(str(r.exception), "Luna is Churro's child. Family can't cross.")
        self.assertEqual(r.exception.rel, "child")
        c = copy.deepcopy(S71)
        c["id"] = "M0003"
        pods = PL.pods_with(a, c, lambda i: None)
        self.assertEqual(len(pods), 6)
        with self.assertRaises(ValueError):
            PL.pods_with(a, a, lambda i: None)


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        S.write_spec(os.path.join(cls.sp, "S71.json"), S71)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], plush_workers=0)
        cls.srv.start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_pods_come_with_pictures_asked_for_in_order_and_the_strip(self):
        r = self.srv.pods(self.srv.species["S71"], 0)
        self.assertEqual((len(r["pods"]), r["diff"], r["grow"]), (6, "some", "juvenile"))
        jobs = [self.srv.queue.jobs[p["job"]] for p in r["pods"]]
        self.assertEqual([j.priority for j in jobs], [1] * 6)
        self.assertEqual(len({p["pic"]["key"] if "pic" in p else p["key"] for p in r["pods"]}), 6)
        self.assertEqual(len(r["family"]), 4)
        self.assertEqual([e["stage"] for e in r["grow_ends"]], ["juvenile", "elder"])
        again = self.srv.pods(self.srv.species["S71"], 0)
        self.assertEqual([p["genome"] for p in again["pods"]], [p["genome"] for p in r["pods"]])
        with self.assertRaises(SV.ApiError):
            self.srv.pods(self.srv.species["S71"], 0, "wilder")

    def test_a_pod_whose_picture_would_not_build_is_drawn_again(self):
        sp = self.srv.species["S71"]
        r = self.srv.pods(sp, 3)
        bad = r["pods"][2]
        self.srv.bad_pics.add(bad["key"])
        r2 = self.srv.pods(sp, 3)
        self.assertNotEqual(r2["pods"][2]["genome"], bad["genome"])
        self.assertEqual(r2["pods"][2]["tries"], 1)
        self.assertEqual([p["genome"] for i, p in enumerate(r2["pods"]) if i != 2], [p["genome"] for i, p in enumerate(r["pods"]) if i != 2])

    def test_how_different_and_grow_are_saved_in_the_file_without_a_build(self):
        res = self.srv.play_save("S71", dict(toy="diff", axis="width", to="wild"), dict(name="t", role="maker"))
        self.assertTrue(res["ok"] and res["virtual"])
        self.assertEqual(self.srv.species["S71"].spec["play"]["diff"], "wild")
        self.assertEqual(self.srv.pods(self.srv.species["S71"], 0)["diff"], "wild")
        self.assertEqual(self.srv.pods(self.srv.species["S71"], 0, "alike")["diff"], "alike")                # a request's own dial wins for that request
        self.srv.play_save("S71", dict(toy="diff", axis="width", to="some"), dict(name="t", role="maker"))
        self.assertTrue(self.srv.play_save("S71", dict(toy="grow", axis="age", to="adult"), dict(name="t", role="maker"))["ok"])
        self.assertEqual(self.srv.pods(self.srv.species["S71"], 0)["grow"], "adult")
        self.srv.play_save("S71", dict(toy="grow", axis="age", to="juvenile"), dict(name="t", role="maker"))

    def test_keep_makes_a_mibi_of_its_own_that_is_a_starter_with_the_pods_own_look(self):
        sp = self.srv.species["S71"]
        r = self.srv.pods(sp, 5)
        k = self.srv.keep("S71", dict(round=5, i=2, tries=0, name="Churro"), dict(name="t", role="maker"))
        self.assertEqual((k["id"], k["name"], k["parents"]), ("M0001", "Churro", ["S71", "S71"]))
        kept = self.srv.species["M0001"].spec
        self.assertTrue(kept["play"]["starter"] and kept["play"]["kept"])
        self.assertEqual(kept["id"], "M0001")
        self.assertTrue(os.path.isfile(os.path.join(self.srv.mine_dir, "M0001.json")))
        self.assertEqual(PL.validate(kept), [])
        self.assertEqual(PL.state_genome(kept), PL.pod_selector(kept["play"]["genome"]))                 # its toys stand where its own copies put them: nothing on top
        mine = [s for s in self.srv.starters() if s["mine"]]
        self.assertEqual([m["id"] for m in mine], ["M0001"])
        self.assertEqual(mine[0]["name"], "Churro")
        warm = [j for j in self.srv.queue.jobs.values() if j.kind in ("warm", "sweep") and j.species == "M0001"]
        self.assertTrue(warm)                                                                       # a kept mibi gets its own sweep and warm set
        toys = self.srv.toys(self.srv.species["M0001"])
        self.assertEqual(toys["genome"], PL.state_genome(kept))
        k2 = self.srv.keep("S71", dict(round=5, i=3, tries=0, name="Luna"), dict(name="t", role="maker"))
        self.assertEqual(k2["id"], "M0002")
        for bad in ("", "x" * 11, "Lu na!", None, 3):
            with self.assertRaises(SV.ApiError):
                self.srv.keep("S71", dict(round=5, i=0, name=bad), dict(name="t", role="maker"))
        with self.assertRaises(SV.ApiError) as r:
            self.srv.keep("S71", dict(round=5, i=0, name="Churro"), dict(name="t", role="maker"))
        self.assertEqual((r.exception.message, r.exception.extra), ("Churro has that name", dict(refused="taken", holder="Churro")))
        with self.assertRaises(SV.ApiError) as r:
            self.srv.keep("S71", dict(round=5, i=0, name="X"), dict(name="t", role="maker"))
        self.assertEqual((r.exception.message, r.exception.extra), ("A name needs two letters", dict(refused="short")))

    def test_zz_a_toy_move_on_a_kept_mibi_builds_on_its_own_copies(self):
        k = self.srv.species.get("M0001")
        if k is None:
            self.skipTest("the keep test did not run first")
        spec = k.spec
        tail = next(t for t in PL.toys_of(spec) if t["id"] == "tail")["axes"][0]
        other = 0 if tail["home"] != 0 else 1
        s = PL.state_genome(S.apply_patch(spec, PL.edit_ops(spec, "tail", "length", other)))
        self.assertTrue(s.startswith("pod:") and '"set"' in s)
        self.assertEqual(json.loads(s[4:])["copies"], spec["play"]["genome"])

    def test_zzz_two_mibis_cross_unless_they_are_direct_kin(self):
        if "M0002" not in self.srv.species:
            self.skipTest("the keep test did not run first")
        S72 = S.read_spec(os.path.join(BODY, "species_play", "S72.json"))
        S.write_spec(os.path.join(self.sp, "S72.json"), S72)
        self.srv.scan()
        sp = lambda i: self.srv.species[i]
        for a, b, rel in (("S71", "M0001", "child"), ("M0001", "S71", "parent"), ("M0001", "M0002", "same-parents")):
            with self.assertRaises(SV.ApiError) as r:
                self.srv.pods(sp(a), 0, mate=b)
            na, nb = PL.mibi_name(sp(a).spec), PL.mibi_name(sp(b).spec)
            want = f"{na} and {nb} have the same parents. Family can't cross." if rel == "same-parents" else f"{nb} is {na}'s {rel}. Family can't cross."
            self.assertEqual((r.exception.status, r.exception.message, r.exception.extra), (409, want, dict(rel=rel)))
        ok = self.srv.pods(sp("M0001"), 0, mate="S72")
        self.assertEqual(len(ok["pods"]), 6)
        self.assertEqual([p["genome"] for p in ok["pods"]], [p["genome"] for p in self.srv.pods(sp("M0001"), 0, mate="S72")["pods"]])
        self.assertNotEqual(ok["pods"][0]["genome"], self.srv.pods(sp("M0001"), 0)["pods"][0]["genome"])


class TestNamer(unittest.TestCase):
    """The name sheet meets the game's namer: its list, its order, its rules and its eight refusal lines."""
    def test_the_offers_are_the_games_list_in_its_order_without_held_names(self):
        names = PL.game_names()
        self.assertEqual(names[:4], ["Tita", "Kenya", "Simba", "Nina"])
        offered = PL.offered_names(held=["Tita", "Nina"])
        self.assertEqual(offered[:3], ["Kenya", "Simba", "Arya"])
        self.assertEqual(len(offered), 12)
        self.assertTrue(all(len(n) <= 10 for n in offered))
        self.assertNotIn("Moss", PL.offered_names())
        self.assertNotIn("Pemmi", PL.offered_names())

    def test_the_game_says_no_the_games_way(self):
        line = lambda n, **k: (PL.refuse_line(PL.name_problem(n, **k)) if PL.name_problem(n, **k) else None)
        self.assertEqual(line("A"), "A name needs two letters")
        self.assertEqual(line("Abcdefghijk"), "No room for more letters")
        self.assertEqual(line("-Ab"), "Start with a letter")
        self.assertEqual(line("Ab-"), "End with a letter")
        self.assertEqual(line("A--b"), "One space or dash at a time")
        self.assertEqual(line("Tuliko"), "A species has that name")
        self.assertEqual(line("Lathreta"), "A clan has that name")
        self.assertEqual(line("Churro", held=["churro"]), "churro has that name")
        self.assertIsNone(line("Mo-Mo"))
        self.assertEqual(sorted(PL.refusals()), sorted(["short", "full", "first", "last", "twice", "species", "clan", "taken"]))

    def test_the_plural_is_the_species_name_with_an_s(self):
        self.assertEqual(PL.plural_of(dict(name="Tuliko", id="S20")), "Tulikos")
        self.assertEqual(PL.plural_of(dict(name="Tuliko", plural="Tuliko")), "Tuliko")

    def test_the_paint_pots_and_family_words(self):
        rows = PL.family_rows(dict(S71, id="S71"))
        self.assertTrue(rows)
        self.assertTrue(all(r["label"].endswith("s") or r["label"] in ("Whiskers",) for r in rows), [r["label"] for r in rows])


if __name__ == "__main__":
    unittest.main()
