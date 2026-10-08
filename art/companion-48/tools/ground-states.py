"""Write the ground's two light states into the ground atlas (sheets/ground.json): ONE tile set (lime), two states through tables. "states": {"rain": {...}, "clear": {...}}, each a
palette-index table of 48 entries (index in -> index out) applied to every ground frame (and the shore and water frames) when the page draws them; the tables are P.rain and P.clear
(pal.py). `ground.rain` = the forest-green ground under the storm cast; `ground.clear` = the lime ground warmed one step. `grassBody`: the palette index of the tile body in each state.
usage: python3 -I ground-states.py ATLAS.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import quant
P = quant.P; path = sys.argv[1]; d = json.load(open(path))
def state(tab, note): return {"note": note, "table": [int(v) for v in tab], "tuftIndex": int(tab[P.index["leaf"]]), "grassBody": int(tab[P.index["grass"]])}
d["states"] = {"rain": state(P.rain, "ground.rain: the G ramp one step deeper (forest-green ground), every other colour through the storm cast (30 % toward river; sand, clay, paper, bone, white kept)"),
               "clear": state(P.clear, "ground.clear: the G ramp warmed one step (the lime ground lighter and yellower), every other colour unchanged")}
d["note"] += " states: ground.rain and ground.clear are palette tables (48 entries each) over the one tile set."
json.dump(d, open(path, "w"), indent=1); print("states written:", ", ".join(d["states"]))
