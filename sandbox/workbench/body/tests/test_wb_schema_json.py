"""R3: the species schema as JSON Schema for the page, the round-trip fixtures, and the copywriter's studio words (wb/studio-words.json) in every place the studio says them.
The server runs with no workers, so nothing here needs Blender."""
import json, os, shutil, sys, unittest, urllib.request
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import checks as CH
import species_v1 as V
from wb import gate as G, roundtrip as RT, schema_json as SJ, server as SV, store as S, words as WD
from checks import roster as RO

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = os.path.join(BODY, "wb", "web", "src", "generated")
SCRATCH = os.path.join(BODY, "scratch", "t_schema_json")


def committed(name):
    with open(os.path.join(GEN, name), encoding="utf-8") as fh:
        return json.load(fh)


class TestSchemaJson(unittest.TestCase):
    def test_the_committed_json_schemas_are_what_the_server_makes(self):
        for slug in SJ.IDS:
            self.assertEqual(committed(f"{slug}.schema.json"), SJ.json_schema(slug), f"{slug}: run `python3 wb/schema_json.py wb/web/src/generated` and `npm run gen`")

    def test_the_round_trip_fixtures_are_what_the_server_says(self):
        self.assertEqual(committed("roundtrip.json"), json.loads(json.dumps(RT.build())), "run `python3 wb/roundtrip.py wb/web/src/generated/roundtrip.json`")

    def test_every_broken_fixture_is_refused_by_the_server_and_every_good_one_accepted(self):
        for sid in RT.build()["good"]:
            self.assertEqual(V.validate(RT.load(sid)), [], sid)
        for b in RT.build()["broken"]:
            self.assertTrue(b["server"], b["name"])

    def test_every_field_carries_its_words_stage_and_unit(self):
        s = SJ.json_schema("mb-species-2")
        for p, f in V.walk(V.SCHEMA):
            self.assertTrue(f["label"] and f["help"], p)
        tail = s["properties"]["spine"]["properties"]["tail"]["properties"]["length"]
        self.assertEqual((tail["title"], tail["x-unit"], tail["x-stage"], tail["x-range"]), ("Tail length", "H", "shape", "tail_length"))
        self.assertEqual(s["x-plans"]["quadruped"]["tail_length"], [0.6, 2.4])
        self.assertIn("rig", s["x-required"]["mesh"] + list(s["properties"]))
        self.assertEqual(s["properties"]["land"]["anyOf"][1], {"type": "null"})

    def test_the_schema_is_served_tagged(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S22.json"), RT.load("S22"))
        srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        srv.start()
        try:
            url = f"http://127.0.0.1:{srv.port}/api/schema/mb-species-2"
            r = urllib.request.urlopen(url)
            self.assertEqual(json.load(r), SJ.json_schema("mb-species-2"))
            tag = r.headers["ETag"]
            req = urllib.request.Request(url, headers={"If-None-Match": tag})
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(req)
            self.assertEqual(cm.exception.code, 304)
            with self.assertRaises(urllib.error.HTTPError) as cm:
                urllib.request.urlopen(f"http://127.0.0.1:{srv.port}/api/schema/mb-species-3")
            self.assertEqual(cm.exception.code, 404)
        finally:
            srv.stop()
            shutil.rmtree(SCRATCH, ignore_errors=True)


class TestWords(unittest.TestCase):
    def test_the_list_is_the_copywriters_104_and_has_no_placeholder(self):
        w = WD.all_words()
        self.assertEqual(len(w), 104)
        self.assertFalse([k for k, v in w.items() if "OWED" in v], "a placeholder is never a word")

    def test_every_species_label_and_help_is_on_its_field_of_the_schema(self):
        for k, v in WD.all_words().items():
            if k.startswith("species.field."):
                path, _, what = k[len("species.field."):].rpartition(".")
                node, fields = None, V.SCHEMA
                for tok in path.split("."):
                    node = fields[tok]
                    fields = node.get("fields", {})
                self.assertEqual(node[what], v, k)
        self.assertEqual(V.SCHEMA["family"]["label"], "Body")
        self.assertEqual(V.SCHEMA["signature"]["fields"]["socket"]["label"], "Where it sits")
        self.assertEqual(V.SCHEMA["coat"]["fields"]["material"]["fields"]["family"]["label"], "Material")
        self.assertEqual(V.SCHEMA["face"]["help"], "Two eyes and one small mouth. No cheeks, no other eyes.")

    def test_every_check_has_its_name_and_fail_line_from_the_list(self):
        from checks import biped, body, face, mesh  # noqa: F401
        metas = {m["id"]: m for m in CH.metas()}
        listed = [k[len("check."):-len(".name")] for k in WD.all_words() if k.startswith("check.") and k.endswith(".name") and not k.startswith("check.roster.")]
        self.assertEqual(len(listed), 24)
        for i in listed:
            self.assertEqual((metas[i]["name"], metas[i]["fail"]), (WD.get(f"check.{i}.name"), WD.get(f"check.{i}.fail")), i)
        self.assertEqual(metas["face.lid"]["name"], "Calm lids")

    def test_the_roster_rows_carry_name_and_fail_line(self):
        rows = RO.rows()
        self.assertEqual(len(rows), 9)
        for r in rows:
            self.assertEqual((r["name"], r["fail"]), (WD.get(f"check.{r['id']}.name"), WD.get(f"check.{r['id']}.fail")))
        self.assertEqual(rows[-1]["name"], "Apart at 48 px")

    def test_the_gate_language_sheet_and_rows(self):
        self.assertEqual(G.LANGUAGE, ("language", "Language"))
        self.assertEqual([l for _, l in G.JUDGEMENTS][:3], ["Odd, with a thought behind the eyes", "Nothing acted", "No real animal you could name"])

    def test_the_language_messages_say_the_list_words(self):
        d = RT.load("S22")
        d["id"], d["family"], d["land"] = "S15", "hopper", "marsh"
        d["signature"] = [{}, {}]
        by = dict(V.language_errors(d))
        self.assertEqual(by["signature"], "A species has one signature; this file has 2")
        self.assertEqual(by["family"], "S15 is a shell-carrier body in the roster; this file says hopper")
        self.assertEqual(by["land"], "S15 lives in the Hills in the roster; this file says Marsh")
        self.assertEqual(by["face.eyes.count"], "S15 has 3 eyes in the roster; this file says 2")
        self.assertEqual(by["coat.material.family"], "S15 wears skin in the roster; this file says fur")


if __name__ == "__main__":
    unittest.main()
