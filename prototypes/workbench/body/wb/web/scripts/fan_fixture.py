"""The fan placements of Loika's crest (P0001-p2's layout) as meshbody.fan_placements gives them, for src/viewport/fan.test.ts (the TS port must agree).
Usage: python fan_fixture.py > ../src/viewport/fan.fixture.json"""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, BODY)
import meshbody as MB

sc = json.load(open(os.path.join(BODY, "species_v1/parts/P0001/P0001-p2.json")))
lay = sc["layouts"]["fan"]
H = 2.22291
out = dict(layout=lay, H=H, size=lay["size_of_body"], cases={})
for n in range(1, 6):
    out["cases"][str(n)] = [dict(R=R.tolist(), off=off.tolist(), L=float(L)) for R, off, L in MB.fan_placements(n, lay["size_of_body"], H, lay)]
print(json.dumps(out, indent=1))
