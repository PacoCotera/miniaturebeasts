"""ops/ledger/ledger.py against a fake ledger directory: python3 -m unittest discover -s ops/ledger/tests"""
import json, os, stat, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import ledger  # noqa: E402

PRICES = {"google": {"m-tokens": {"inputPerM": 2.0, "outputPerM": 120.0, "perImage": None, "asOf": "2026-10-08", "source": "test"}},
          "rd": {"m-image": {"inputPerM": None, "outputPerM": None, "perImage": 0.18, "asOf": "2026-10-08", "source": "test"}}}


class LedgerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name
        json.dump(PRICES, open(os.path.join(self.dir, "prices.json"), "w"))
        self.old = os.environ.get("MB_LEDGER")
        os.environ["MB_LEDGER"] = self.dir

    def tearDown(self):
        if self.old is None:
            os.environ.pop("MB_LEDGER", None)
        else:
            os.environ["MB_LEDGER"] = self.old
        self.tmp.cleanup()

    def lines(self):
        calls = os.path.join(self.dir, "calls")
        out = []
        for f in sorted(os.listdir(calls)):
            out += [json.loads(l) for l in open(os.path.join(calls, f)) if l.strip()]
        return out

    def test_refuses_unset(self):
        os.environ.pop("MB_LEDGER")
        with self.assertRaises(SystemExit):
            ledger.require_ledger()
        with self.assertRaises(SystemExit):
            ledger.record("t", "f.json", "r1", "google", "m-tokens", usage={"in": 1, "out": 1})

    def test_refuses_missing_and_read_only(self):
        os.environ["MB_LEDGER"] = os.path.join(self.dir, "missing")
        with self.assertRaises(SystemExit):
            ledger.require_ledger()
        if os.geteuid() != 0:  # root writes anywhere
            ro = os.path.join(self.dir, "ro"); os.mkdir(ro); os.chmod(ro, stat.S_IRUSR | stat.S_IXUSR)
            os.environ["MB_LEDGER"] = ro
            with self.assertRaises(SystemExit):
                ledger.require_ledger()

    def test_price_and_list_cost(self):
        self.assertEqual(ledger.price("google", "m-tokens")["outputPerM"], 120.0)
        self.assertEqual(ledger.list_cost("google", "m-tokens", {"promptTokenCount": 1000, "candidatesTokenCount": 1000}), 0.122)
        self.assertEqual(ledger.list_cost("rd", "m-image", images=2), 0.36)
        with self.assertRaises(SystemExit):
            ledger.price("google", "nope")

    def test_record_list_and_vendor(self):
        a = ledger.record("grow/service.py paint", "prototypes/workbench/grow/prompts.json", "c1", "google", "m-tokens",
                          usage={"promptTokenCount": 1000, "candidatesTokenCount": 1000})
        b = ledger.record("rd.py", "art/x/records.json", "task-1", "rd", "m-image", cost_usd=0.18, credit_cost=1, balance_after=7.0)
        self.assertEqual((a["costUSD"], a["basis"], a["usage"]), (0.122, "list", {"in": 1000, "out": 1000}))
        self.assertEqual((b["costUSD"], b["basis"], b["balanceAfterUSD"], b["creditCost"]), (0.18, "vendor", 7.0, 1))
        got = self.lines()
        self.assertEqual([l["public"] for l in got], [{"file": "prototypes/workbench/grow/prompts.json", "record": "c1"}, {"file": "art/x/records.json", "record": "task-1"}])
        self.assertTrue(all(l["schema"] == "mb-ledger/1" for l in got))
        t = ledger.total()
        self.assertEqual((t["calls"], t["costUSD"]), (2, 0.302))
        self.assertEqual(ledger.total(tool="rd.py")["calls"], 1)
        self.assertEqual(ledger.total(since="2999-01-01")["calls"], 0)

    def test_strip(self):
        src = {"model": "m", "usage": {"in": 1}, "costUSD": 1, "result": {"status": "ok", "balance_cost": 0.18, "remaining_balance": 7,
               "credit_cost": 1, "items": [{"usdPerIndividual": 2, "seed": 3}]}, "pricing": "x"}
        out = ledger.strip(src)
        self.assertEqual(out, {"model": "m", "usage": {"in": 1}, "result": {"status": "ok", "items": [{"seed": 3}]}})
        self.assertIn("costUSD", src)  # a copy, the input untouched

    def test_cli_sum(self):
        ledger.record("t", "f.json", "r", "rd", "m-image", cost_usd=0.5)
        out = subprocess.run([sys.executable, "-I", os.path.join(os.path.dirname(HERE), "ledger.py"), "sum", "--since", "2026-01-01"],
                             capture_output=True, text=True, env={**os.environ, "MB_LEDGER": self.dir}, check=True).stdout
        self.assertEqual(json.loads(out)["costUSD"], 0.5)


if __name__ == "__main__":
    unittest.main()
