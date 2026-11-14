"""Studio R6, the parity gate: the studio draws genes in the page (web/src/engine, the game's catalogue and the Python sampler ported with its own random streams) and the server draws them in Python.
For S01, S20 and S22 the two must agree on 1,000 draws each: the same genomes, the same looks and the same look counts, wild pods and `seed:N` draws, and on the file's freq and Variety numbers. A mismatch fails with the first differing
draw and locus. Needs node (22.15 or newer) beside the python that has numpy; the numbers are read from the files in species_v1."""
import json
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
BODY = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, BODY)

import parity_dump as PD

ENGINE = os.path.join(BODY, "wb", "web", "src", "engine")
KINDS = ("S01", "S20", "S22")
DRAWS = 1000


def js_dump(sid, n=DRAWS):
    path = os.path.join(BODY, "species_v1", f"{sid}.json")
    r = subprocess.run(["node", "--import", os.path.join(ENGINE, "node-framework.mjs"), os.path.join(ENGINE, "parity-dump.mjs"), path, str(n)], capture_output=True, text=True, timeout=300)
    if r.returncode:
        raise RuntimeError(r.stderr[-2000:])
    return json.loads(r.stdout)


def py_dump(sid, n=DRAWS):
    return json.loads(json.dumps(PD.dump(json.load(open(os.path.join(BODY, "species_v1", f"{sid}.json"))), n)))


def first_diff(a, b, path="$"):
    """The first place two JSON values differ, as (path, a, b), or None."""
    if type(a) is not type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool)):
        return path, a, b
    if isinstance(a, dict):
        for k in a:
            if k not in b:
                return f"{path}.{k}", a[k], "(missing)"
        for k in b:
            if k not in a:
                return f"{path}.{k}", "(missing)", b[k]
        for k in a:
            d = first_diff(a[k], b[k], f"{path}.{k}")
            if d:
                return d
        return None
    if isinstance(a, list):
        if len(a) != len(b):
            return f"{path}.length", len(a), len(b)
        for i, (x, y) in enumerate(zip(a, b)):
            d = first_diff(x, y, f"{path}[{i}]")
            if d:
                return d
        return None
    return None if a == b else (path, a, b)


def compare(sid, py, js):
    """Per section: (draws, genome matches, look matches, count match) and the first difference of each part, as the table of the notes shows."""
    rows = {}
    for sec in ("wild", "draws"):
        p, j = py[sec], js[sec]
        if p is None or j is None:
            rows[sec] = dict(draws=0 if p is None and j is None else -1, genomes=None, looks=None, counts=None, diff=None if p is None and j is None else ("presence", p is None, j is None))
            continue
        gm = sum(1 for x, y in zip(p["genomes"], j["genomes"]) if first_diff(x, y) is None)
        lm = sum(1 for x, y in zip(p["looks"], j["looks"]) if first_diff(x, y) is None)
        diff = None
        for part in ("genomes", "looks", "values"):
            for n, (x, y) in enumerate(zip(p.get(part, []), j.get(part, []))):
                d = first_diff(x, y)
                if d:
                    diff = (f"{sec}.{part}: draw {n + 1}, locus {d[0]}", d[1], d[2])
                    break
            if diff:
                break
        cm = first_diff(p["counts"], j["counts"]) is None
        if diff is None and not cm:
            diff = (f"{sec}.counts {first_diff(p['counts'], j['counts'])[0]}",) + first_diff(p["counts"], j["counts"])[1:]
        rows[sec] = dict(draws=len(p["genomes"]), genomes=gm, looks=lm, counts=cm, diff=diff)
    rows["freq"] = first_diff(py["freq"], js["freq"])
    rows["sheet"] = first_diff(py["sheet"], js["sheet"])
    return rows


class TestParity(unittest.TestCase):
    def check(self, sid):
        py, js = py_dump(sid), js_dump(sid)
        rows = compare(sid, py, js)
        for sec in ("wild", "draws"):
            self.assertIsNone(rows[sec]["diff"], f"{sid} {sec}: first difference {rows[sec]['diff']}")
        self.assertIsNone(rows["freq"], f"{sid} freq differs at {rows['freq']}")
        self.assertIsNone(rows["sheet"], f"{sid} variety sheet differs at {rows['sheet']}")

    def test_s01_loika(self):
        self.check("S01")

    def test_s20_tuliko(self):
        self.check("S20")

    def test_s22(self):
        self.check("S22")

    def test_the_pages_fixture_is_what_python_makes_today(self):
        with open(PD.FIXTURE) as fh:
            have = json.load(fh)
        d = first_diff(PD.fixture(), have)
        self.assertIsNone(d, f"web/src/engine/parity.fixture.json is stale at {d}: run python tests/parity_dump.py fixture")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "table":
        print(f"{'kind':5} {'part':6} {'draws':>6} {'genomes':>8} {'looks':>6} {'counts':>7}  first difference")
        for sid in KINDS:
            r = compare(sid, py_dump(sid), js_dump(sid))
            for sec in ("wild", "draws"):
                x = r[sec]
                print(f"{sid:5} {sec:6} {x['draws']:>6} {str(x['genomes']):>8} {str(x['looks']):>6} {str(x['counts']):>7}  {x['diff']}")
            print(f"{sid:5} freq   {r['freq']}")
            print(f"{sid:5} sheet  {r['sheet']}")
    else:
        unittest.main()
