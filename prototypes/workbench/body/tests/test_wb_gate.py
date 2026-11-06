"""Chunk 25: the gate. Rounds, the six ticks, the reviewer's signature then the owner's, who is refused (a maker, any agent token, the person who asked), a change after signing voiding both, the release export's reasons,
and the same rules over HTTP on a scratch server (the sheets' drawing is stubbed there: it needs workers). Under the bpy venv or any python3 with numpy."""
import copy
import json
import os
import shutil
import sys
import unittest
import urllib.error
import urllib.request
from unittest import mock

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

from wb import export as EX, gate as GT, server as SV, store as S

S20 = os.path.join(BODY, "species_v1", "S20.json")
SCRATCH = os.path.join(BODY, "scratch", "t_gate")
MAKER = dict(name="dev-1", role="maker", agent=False)
AGENT = dict(name="agent-9", role="maker", agent=True)
AGENT_OWNER = dict(name="agent-7", role="owner", agent=True)         # an agent whose token carries a judge's role is still refused
REVIEWER = dict(name="test-reviewer", role="reviewer", agent=False)
OWNER = dict(name="test-owner", role="owner", agent=False)


def refused(case, status, fn, *a):
    with case.assertRaises(S.ApiError) as c:
        fn(*a)
    case.assertEqual(c.exception.status, status)
    return c.exception


class TestRounds(unittest.TestCase):
    def setUp(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        self.path = os.path.join(SCRATCH, "S20t.json")
        self.spec = S.read_spec(S20)
        S.write_spec(self.path, self.spec)

    def tearDown(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def ticks(self, n=1, who=REVIEWER):
        for sid in GT.SHEET_IDS:
            GT.tick(self.path, self.spec, n, sid, True, None, who)

    def test_six_sheets_and_a_round_asked_twice_is_one_round(self):
        self.assertEqual(len(GT.SHEETS), 6)
        r, new = GT.request(self.path, self.spec, MAKER)
        r2, new2 = GT.request(self.path, self.spec, AGENT)
        self.assertEqual((r["round"], new, r2["round"], new2), (1, True, 1, False))
        self.assertEqual(r["asked_by"], "dev-1")

    def test_a_maker_and_every_agent_token_is_refused_every_judgement(self):
        GT.request(self.path, self.spec, MAKER)
        for who in (MAKER, AGENT, AGENT_OWNER, None):
            e = refused(self, 403, GT.tick, self.path, self.spec, 1, "turnaround", True, None, who)
            self.assertEqual(e.field, "role")
            refused(self, 403, GT.sign, self.path, self.spec, 1, who)
            refused(self, 403, GT.back, self.path, self.spec, 1, "no", who)
        self.assertEqual(GT.ticked(GT.read(self.path)["rounds"][0]), 0)

    def test_the_reviewer_signs_first_with_every_sheet_ticked_and_the_owner_last(self):
        GT.request(self.path, self.spec, MAKER)
        refused(self, 409, GT.sign, self.path, self.spec, 1, OWNER)                 # the owner cannot go first
        GT.tick(self.path, self.spec, 1, "turnaround", True, None, REVIEWER)
        self.assertIn("1 of 6", refused(self, 409, GT.sign, self.path, self.spec, 1, REVIEWER).message)
        self.ticks()
        refused(self, 409, GT.sign, self.path, self.spec, 1, OWNER)                 # still the reviewer's turn
        GT.sign(self.path, self.spec, 1, REVIEWER)
        refused(self, 409, GT.sign, self.path, self.spec, 1, REVIEWER)              # once
        refused(self, 409, GT.tick, self.path, self.spec, 1, "joins", False, None, REVIEWER)      # ticks lock at the reviewer's signature
        self.assertFalse(GT.is_signed(self.path, self.spec))
        GT.sign(self.path, self.spec, 1, OWNER)
        self.assertTrue(GT.is_signed(self.path, self.spec))
        self.assertEqual(GT.blockers(self.path, self.spec), [])
        pub = GT.public(GT.read(self.path), GT.file_hash(self.spec))
        self.assertTrue(pub["signed"] and pub["rounds"][0]["reviewer"]["hash"] == pub["rounds"][0]["owner"]["hash"] == pub["hash"])

    def test_the_person_who_asked_never_signs(self):
        GT.request(self.path, self.spec, dict(REVIEWER))                        # a reviewer who asked is the maker of this round
        self.ticks()
        e = refused(self, 403, GT.sign, self.path, self.spec, 1, REVIEWER)
        self.assertIn("maker never signs", e.message)

    def test_a_change_after_signing_voids_both(self):
        GT.request(self.path, self.spec, MAKER)
        self.ticks()
        GT.sign(self.path, self.spec, 1, REVIEWER)
        GT.sign(self.path, self.spec, 1, OWNER)
        changed = copy.deepcopy(self.spec)
        changed["name"] = (changed.get("name") or "x") + " changed"
        self.assertFalse(GT.is_signed(self.path, changed))
        self.assertIn("the file changed after round 1 was signed", GT.blockers(self.path, changed))
        pub = GT.public(GT.read(self.path), GT.file_hash(changed))
        st = pub["rounds"][0]["state"]
        self.assertEqual((st["reviewer_valid"], st["owner_valid"], st["voided"], pub["signed"]), (False, False, True, False))
        refused(self, 409, GT.sign, self.path, changed, 1, OWNER)
        self.assertTrue(GT.note_edit(self.path, GT.file_hash(changed), "someone"))
        self.assertEqual(GT.read(self.path)["rounds"][0]["voided"]["by"], "someone")
        r, new = GT.request(self.path, changed, MAKER)                           # the way on is a new round
        self.assertEqual((r["round"], new), (2, True))
        self.assertFalse(GT.is_signed(self.path, changed))
        self.assertTrue(GT.is_signed(self.path, self.spec) is False)             # the old file's round is no longer the current one

    def test_sent_back_closes_the_round(self):
        GT.request(self.path, self.spec, MAKER)
        GT.back(self.path, self.spec, 1, "the tail is off", REVIEWER)
        self.assertIn("sent back", GT.blockers(self.path, self.spec)[0])
        refused(self, 409, GT.tick, self.path, self.spec, 1, "joins", True, None, REVIEWER)
        r, new = GT.request(self.path, self.spec, MAKER)
        self.assertEqual((r["round"], new), (2, True))

    def test_release_reasons_and_the_one_that_passes_the_gate(self):
        from wb import facade as F
        rows = F.check_rows(self.spec)
        why = EX.release_blockers(self.spec, rows, self.path)
        self.assertEqual(why[-2:], ["no round was asked for", "gate not signed"])
        GT.request(self.path, self.spec, MAKER)
        self.assertIn("round 1: the reviewer has not signed", EX.release_blockers(self.spec, rows, self.path))
        self.ticks()
        GT.sign(self.path, self.spec, 1, REVIEWER)
        self.assertIn("round 1: the owner has not signed", EX.release_blockers(self.spec, rows, self.path))
        GT.sign(self.path, self.spec, 1, OWNER)
        self.assertFalse([w for w in EX.release_blockers(self.spec, rows, self.path) if "gate" in w or "round" in w])
        self.assertTrue(EX.gate_signed(self.spec, self.path))
        self.assertFalse(EX.gate_signed(self.spec, None))


S22 = os.path.join(BODY, "species_v1", "S22.json")


class TestLanguageRows(unittest.TestCase):
    """A language file (mb-species/2) has the language sheet and the eight judgement rows besides the six sheets; a fixture (S20) has the six only. Only a reviewer or the owner ticks any of them."""
    def setUp(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        self.path = os.path.join(SCRATCH, "S22t.json")
        self.spec = S.read_spec(S22)
        S.write_spec(self.path, self.spec)

    def tearDown(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_a_language_file_has_fifteen_rows_and_a_fixture_six(self):
        r, _ = GT.request(self.path, self.spec, MAKER)
        self.assertEqual(list(r["rows"]), GT.SHEET_IDS + ["language"] + GT.JUDGEMENT_IDS)
        self.assertEqual(len(GT.JUDGEMENT_IDS), 8)
        pub = GT.public(GT.read(self.path), GT.file_hash(self.spec))
        rows = pub["rounds"][0]["sheets"]
        self.assertEqual([x["label"] for x in rows][6:], ["Language", "Odd, with a thought behind the eyes", "Nothing acted", "Never a real animal you can name", "Clean silhouette", "Faces read as their own species", "Anatomy makes sense", "Nothing sad, sick or scary", "No seams"])
        self.assertEqual({x["on"] for x in rows if x["id"] in GT.JUDGEMENT_IDS}, {"language"})
        fix = os.path.join(SCRATCH, "S20t.json")
        S.write_spec(fix, S.read_spec(S20))
        self.assertEqual(list(GT.request(fix, S.read_spec(S20), MAKER)[0]["rows"]), GT.SHEET_IDS)

    def test_no_maker_or_agent_ticks_a_judgement_row_and_the_reviewer_signs_only_when_all_fifteen_are_ticked(self):
        GT.request(self.path, self.spec, MAKER)
        for who in (MAKER, AGENT, AGENT_OWNER):
            for row in GT.JUDGEMENT_IDS:
                refused(self, 403, GT.tick, self.path, self.spec, 1, row, True, None, who)
        refused(self, 404, GT.tick, self.path, self.spec, 1, "no-such-row", True, None, REVIEWER)
        for row in GT.SHEET_IDS + ["language"]:
            GT.tick(self.path, self.spec, 1, row, True, None, REVIEWER)
        e = refused(self, 409, GT.sign, self.path, self.spec, 1, REVIEWER)
        self.assertIn("7 of 15 sheets are ticked", str(e))
        for row in GT.JUDGEMENT_IDS:
            GT.tick(self.path, self.spec, 1, row, True, None, REVIEWER)
        self.assertEqual(GT.ticked(GT.read(self.path)["rounds"][0]), 15)
        GT.sign(self.path, self.spec, 1, REVIEWER)
        GT.sign(self.path, self.spec, 1, OWNER)
        self.assertTrue(GT.is_signed(self.path, self.spec))


class TestSheets(unittest.TestCase):
    def test_the_six_templates_name_no_species(self):
        src = open(os.path.join(BODY, "wb", "gatesheets.py")).read() + open(os.path.join(BODY, "wb", "gate.py")).read()
        for word in ("S20", "S22", "Tuliko", "Loika", "tail", "lantern", "biped", "quadruped"):
            self.assertNotIn(word, src.replace("quadruped's", ""), word)
        self.assertEqual([i for i, _ in GT.SHEETS], ["turnaround", "before-after", "joins", "twelve", "motion", "close-up"])


class TestOverHttp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        os.makedirs(os.path.join(SCRATCH, "home"))
        cls.file = os.path.join(cls.sp, "S20.json")
        S.write_spec(cls.file, S.read_spec(S20))
        with open(os.path.join(SCRATCH, "home", "tokens.json"), "w") as fh:
            json.dump({"t-maker": MAKER, "t-agent": AGENT, "t-agent-owner": AGENT_OWNER, "t-reviewer": REVIEWER, "t-owner": OWNER}, fh)
        cls.patch = mock.patch("wb.gatesheets.make", lambda *a, **k: {})
        cls.patch.start()
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=0)
        cls.srv.start()
        cls.url = f"http://127.0.0.1:{cls.srv.port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        cls.patch.stop()
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def call(self, method, path, tok, body=None):
        req = urllib.request.Request(self.url + path, method=method, data=json.dumps(body or {}).encode(), headers={"Authorization": "Bearer " + tok} if tok else {})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.load(r)
        except urllib.error.HTTPError as e:
            return e.code, json.load(e)

    def test_the_whole_way_and_every_refusal(self):
        g = "/api/species/S20/gate"
        self.assertEqual(self.call("GET", "/api/me", "t-agent")[1], dict(name="agent-9", role="maker", agent=True))
        self.assertEqual(self.call("POST", g, None)[0], 401)
        code, st = self.call("POST", g, "t-agent")                                  # an agent may ask
        self.assertEqual((code, st["current"]), (202, 1))
        for tok in ("t-maker", "t-agent", "t-agent-owner"):
            for path in (g + "/1/rows/turnaround", g + "/1/sign", g + "/1/back", g + "/1/note"):
                code, body = self.call("POST", path, tok, dict(tick=True))
                self.assertEqual((code, body["field"]), (403, "role"), (tok, path))
        self.assertIn("an agent token cannot tick", self.call("POST", g + "/1/sign", "t-agent-owner")[1]["error"])
        for sid in GT.SHEET_IDS:
            self.assertEqual(self.call("POST", f"{g}/1/rows/{sid}", "t-reviewer", dict(tick=True))[0], 200)
        self.assertEqual(self.call("POST", g + "/1/sign", "t-owner")[0], 409)            # the owner cannot go first
        code, st = self.call("GET", g, None)
        self.assertFalse(st["signed"])
        self.assertEqual(st["rounds"][0]["owner"], None)
        code, st = self.call("POST", g + "/1/sign", "t-reviewer")
        self.assertEqual(code, 200)
        code, st = self.call("POST", g + "/1/sign", "t-owner")
        self.assertEqual((code, st["signed"]), (200, True))
        # an edit through the API voids both
        code, body = self.call("PATCH", "/api/species/S20", "t-maker", [dict(op="replace", path="/name", value="Tuliko voids")])
        self.assertEqual(code, 200)
        st = self.call("GET", g, None)[1]
        self.assertEqual((st["signed"], st["rounds"][0]["state"]["voided"]), (False, True))
        self.assertEqual(st["rounds"][0]["voided"]["by"], "dev-1")


if __name__ == "__main__":
    unittest.main()
