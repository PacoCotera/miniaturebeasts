"""W9: the game frame written from the species file, the genome string of a mibi through the one codec (genome-stamp, through node), the `string:` and `code:` selectors, `wb string`, `wb freq`."""
import contextlib
import copy
import io
import json
import os
import shutil
import sys
import unittest

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BODY)

import expressions_demo as D
import genomeapply as GA
import s20genes as GN
from wb import cli, facade as F, frame_writer as FW, server as SV, store as S

DOC = json.load(open(os.path.join(BODY, "species_v1", "S20.json")))
SCRATCH = os.path.join(BODY, "scratch", "t_strings")
TYPE_STRING = "G1-S20v1-"


def codec(op, **kw):
    return FW.node(dict(op=op, **kw), os.path.join(SCRATCH, "species-S20.json"))


class TestFrame(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        cls.frame, cls.path = FW.write(DOC, os.path.join(SCRATCH, "species-S20.json"), samples=0)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_the_frame_is_schema_3_on_the_body_engine_in_ring_order(self):
        f = self.frame
        self.assertEqual((f["schema"], f["engine"], f["frameVersion"], f["species"]["order"]), ("mb-species-frame/3", "body", 1, 20))
        self.assertEqual([c["id"] for c in f["chapters"]], ["coat", "face", "shape", "legs-tail", "movement"])
        ids = [l for c in f["chapters"] for t in c["traits"] for l in t["loci"]]
        self.assertEqual(ids, [e["locus"] for e in DOC["genome"]["loci"]])                      # the file's ring order
        self.assertEqual(len(f["loci"]), 54)
        by = {l["id"]: l for l in f["loci"]}
        self.assertIn("band", by["form.tail-length"])
        self.assertIn("absolute", by["movement.cycle-rate"])
        self.assertEqual(by["appearance.body-hue"]["band"]["lo"], 180.0)
        self.assertEqual(by["appearance.emission-hue"]["band"]["hi"], 100.0)
        self.assertEqual(f["catalogue"]["digest"], GA.pin()["digest"])
        self.assertEqual(f["glyph"], [r[::-1] for r in f["glyph"]])                                # mirrored left to right
        self.assertIn("placeholder", f["glyphNote"])
        self.assertEqual(set(f["pod"]), {"sizeClass", "proportion", "shellPattern", "colourPair"})
        self.assertNotIn("draft", f)

    def test_the_frame_lays_the_loci_in_the_proposals_ring_order_and_bit_widths(self):
        import subprocess
        js = ("import {codecFrame} from '%s/wb/stringio.mjs'; import {tulikoFrame} from '%s/../genome-stamp/tests/tuliko-frame.mjs'; import {readFileSync} from 'node:fs';"
              "const a = codecFrame(JSON.parse(readFileSync(process.argv[1], 'utf8'))), b = tulikoFrame();"
              "console.log(JSON.stringify({same: JSON.stringify(a.heritable.map(l => [l.id, l.alleles, l.values ?? null, l.bits])) === JSON.stringify(b.heritable.map(l => [l.id, l.alleles, l.values ?? null, l.bits])), n: a.heritable.length, bits: a.payloadBits, bits2: b.payloadBits, chapters: a.chapters.map(c => c.name)}))") % (BODY, os.path.dirname(BODY))
        out = subprocess.run(["node", "--input-type=module", "-e", js, self.path], capture_output=True, text=True, cwd=BODY)
        self.assertEqual(out.returncode, 0, out.stderr[-400:])
        r = json.loads(out.stdout)
        self.assertTrue(r["same"], r)
        self.assertEqual((r["n"], r["bits"], r["bits2"]), (54, r["bits2"], r["bits2"]))
        self.assertEqual(r["chapters"], ["Coat", "Face", "Shape", "Legs & tail", "Movement"])

    def test_a_sleeping_record_rides_in_its_switch_trait(self):
        face = next(c for c in self.frame["chapters"] if c["id"] == "face")
        whiskers = next(t for t in face["traits"] if "anatomy.whisker-presence" in t["loci"])
        self.assertEqual(whiskers["loci"][0], "anatomy.whisker-presence")
        self.assertIn("form.whisker-length", whiskers["loci"])

    def test_a_rule_the_game_cannot_read_refuses_a_release_frame_and_a_draft_names_it(self):
        demo = D.demo()
        with self.assertRaises(FW.Refused) as r:
            FW.build_frame(demo)
        self.assertIn("Horn waits for an age", str(r.exception))
        self.assertIn("Sparkle spots needs other looks", str(r.exception))
        f = FW.build_frame(demo, draft=True)
        self.assertTrue(f["draft"])
        self.assertEqual(len(f["draftReasons"]), 2)
        self.assertEqual([x["id"] for x in f["expressions"]], ["lantern-tail", "horn", "sparkle-spots"])
        self.assertIn("is a modifier gene", " ".join(FW.uses_new_rules(D.demo(with_modifier=True))))

    def test_the_type_is_in_the_frame_with_its_string(self):
        c = self.frame["counts"]
        self.assertTrue(c["typeString"].startswith(TYPE_STRING))
        self.assertEqual(len(c["typeString"]), c["stringLength"])
        self.assertTrue(c["typeStampCode"].startswith("S20v1-"))


class TestStrings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        os.makedirs(SCRATCH)
        cls.frame, _ = FW.write(DOC, os.path.join(SCRATCH, "species-S20.json"), samples=0)
        cls.spec = F.internal(DOC)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def copies(self, sel):
        return F.genome_copies(F.resolve_genome(sel, self.spec), DOC)

    def test_the_twelve_round_trip_through_the_codec(self):
        seen = set()
        for i in range(1, 13):
            c = self.copies(f"seed:{i}")
            r = codec("encode", copies=c)
            self.assertTrue(r["ok"], f"individual {i}: {r}")
            d = codec("decode", text=r["string"])
            self.assertTrue(d["ok"], d)
            self.assertEqual(d["copies"], json.loads(json.dumps(c)), f"individual {i}")
            seen.add(r["string"])
        self.assertEqual(len(seen), 12)
        self.assertEqual(codec("encode", copies=self.copies("type"))["string"], self.frame["counts"]["typeString"])

    def test_the_stamp_code_of_the_type_reads_back_and_a_code_with_unread_chapters_starts_at_the_type(self):
        r = codec("encode", copies=self.copies("seed:2"))
        d = codec("decode", text=r["code"])
        self.assertTrue(d["ok"] and d["complete"], d)
        self.assertEqual(d["copies"], json.loads(json.dumps(self.copies("seed:2"))))

    def test_every_refusal_names_its_stage(self):
        s = codec("encode", copies=self.copies("seed:4"))["string"]
        bad = s[:20] + ("1" if s[20] != "1" else "2") + s[21:]
        self.assertEqual(codec("decode", text=bad)["stage"], "check")
        self.assertEqual(codec("decode", text="hello")["stage"], "string")
        self.assertEqual(codec("decode", text="ABCDEFGHJ")["stage"], "name")
        self.assertEqual(codec("decode", text=s.replace("S20v1", "S20v2"))["stage"], "header")
        loika = codec("decode", text="G1-S1v4-200G201KGG010049B")
        self.assertTrue(loika["ok"] and loika["name"] == "Loika")                         # the registry's frames still decode
        off = json.loads(json.dumps(self.copies("seed:4")))
        off["form.tail-length"] = [0.301, 0.301]
        self.assertIn("not on the blend step", codec("encode", copies=off)["detail"])         # never rounded

    def test_the_selectors_give_the_same_mibi(self):
        for i in (1, 2, 5, 12):
            s = codec("encode", copies=self.copies(f"seed:{i}"))["string"]
            self.assertEqual(self.copies(f"string:{s}"), self.copies(f"seed:{i}"), f"individual {i}")
            self.assertEqual(F.build(DOC, f"string:{s}").cage_hash, F.build(DOC, f"seed:{i}").cage_hash, f"individual {i}")
        c = codec("encode", copies=self.copies("seed:3"))["code"]
        self.assertEqual(self.copies(f"code:{c}"), self.copies("seed:3"))

    def test_a_string_of_another_species_or_a_bad_one_is_a_build_error_with_the_field(self):
        with self.assertRaises(F.BuildError) as r:
            F.resolve_genome("string:G1-S1v4-200G201KGG010049B", self.spec)
        self.assertIn("Loika", r.exception.message)
        self.assertEqual(r.exception.field, "genome")
        with self.assertRaises(F.BuildError) as r:
            F.resolve_genome("string:G1-S20v1-0000", self.spec)
        self.assertIn("genome", r.exception.field)


class TestCli(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        sp = os.path.join(SCRATCH, "species")
        os.makedirs(sp)
        S.write_spec(os.path.join(sp, "S20.json"), DOC)
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [sp], proxy_workers=0)
        cls.srv.start()
        os.environ["WB_URL"] = f"http://127.0.0.1:{cls.srv.port}"
        FW.write(DOC, os.path.join(BODY, "scratch", "t_strings", "species-S20.json"), samples=0)

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        os.environ.pop("WB_URL", None)
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def run_cli(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cli.main(list(argv))
        return code, out.getvalue(), err.getvalue()

    def test_wb_string_prints_one_line_and_reads_it_back(self):
        os.environ["WB_FRAME_FILE"] = os.path.join(SCRATCH, "species-S20.json")
        try:
            code, out, err = self.run_cli("string", "seed:3")
            self.assertEqual(code, 0, err)
            s = out.strip()
            self.assertTrue(s.startswith("G1-S20v1-") and "\n" not in s)
            code, out2, _ = self.run_cli("string", f"string:{s}")
            self.assertEqual((code, out2.strip()), (0, s))
            code, out3, _ = self.run_cli("string", "type", "--json", "--code")
            j = json.loads(out3)
            self.assertTrue(j["ok"] and j["code"].startswith("S20v1-") and j["length"] == len(j["string"]))
            code, _, err = self.run_cli("string", "string:G1-S20v1-0000")
            self.assertEqual(code, 2)
            self.assertIn("[genome]", err)
        finally:
            os.environ.pop("WB_FRAME_FILE", None)

    def test_wb_freq_prints_the_counts_for_the_three_groups(self):
        code, out, err = self.run_cli("freq", "S20", "--locus", "anatomy.tail-tip-form")
        self.assertEqual(code, 0, err)
        self.assertIn("Lantern tail", out)
        self.assertIn("wild 1000 · sheet 12 · cross 4", out)
        self.assertIn("lantern", out)
        code, out, _ = self.run_cli("freq", "S20", "--json")
        j = json.loads(out)
        self.assertEqual(j["n"]["wild"], 1000)
        self.assertIn("lantern-tail", j["expressions"])
        code, out, _ = self.run_cli("freq", "--file", os.path.join(BODY, "species_v1", "S20.json"), "-n", "100", "--json")
        self.assertEqual(json.loads(out)["n"]["wild"], 100)


if __name__ == "__main__":
    unittest.main()
