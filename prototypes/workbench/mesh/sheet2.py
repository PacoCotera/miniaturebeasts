import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from sheetgen import *
S2, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); cp = make_cp(LOIKA)
mast, sdf = refs(cp, os.path.dirname(S2))
m = json.load(open(os.path.join(S2, "measures.json")))
c = {s: cp(os.path.join(S2, f"clay-{s}.png"), f"s2-clay-{s}.png") for s in (304, 96, 48)}
L = cp(os.path.join(S2, "clayL-304.png"), "s2-clayL-304.png"); paw = cp(os.path.join(S2, "paw4x.png"), "s2-paw4x.png"); sh = cp(os.path.join(S2, "shoulder4x.png"), "s2-shoulder4x.png")
verdict = open(os.path.join(S2, "verdict.txt")).read() if os.path.exists(os.path.join(S2, "verdict.txt")) else ""
body = ("<h1>Stop 2: legs and paws in clay, join A (shells)</h1><div class='sub'>Pinned commit 3f8dfb8fd. Paws: a dome of 16-point rings on a flat sole, three beans extruded from the front band, grooves between. Legs: 8-point rings, shoulder mass, elbow, taper. Each part is its own closed shell.</div>"
        "<h2>Whole, 304 x 312</h2><div class='row'>" + cell(mast[304], "master") + cell(sdf[304], "SDF, pinned commit") + cell(c[304], "mesh, clay in the body colour") + cell(L, "mesh, light clay") + "</div>"
        "<h2>96 x 88 (3x) and 48 x 48 (4x)</h2><div class='row'>" + cell(mast[96], "master 96", 3) + cell(sdf[96], "SDF 96", 3) + cell(c[96], "mesh 96", 3) + "</div><div class='row' style='margin-top:10px'>" + cell(mast[48], "master 48", 4) + cell(sdf[48], "SDF 48", 4) + cell(c[48], "mesh 48", 4) + "</div>"
        "<h2>4x, light clay, stand view</h2><div class='row'>" + cell(paw, "near fore paw: dome, three beans, grooves") + cell(sh, "near fore shoulder: the mass the leg comes out of (join A: the seam is the intersection)") + "</div>"
        f"<h2>Facts</h2><table><tr><th>Item</th><th>Value</th></tr><tr><td>quads / shells / non-manifold edges (level 2, rest)</td><td>{m['mesh']['quads']} / {m['mesh']['shells']} / {m['mesh']['nonmanifold_edges']}</td></tr>"
        f"<tr><td>bean height (the house's toe-radii[2] x 2 x S), H</td><td>{m['beans']['paw.fore.L']['bean_height']:.3f} (the AD gate wants at least 0.1)</td></tr></table><p>{verdict}</p>")
html = os.path.join(LOIKA, "2-whole-clay-A.html"); page("Stop 2", body, html); shot(html, os.path.join(LOIKA, "2-whole-clay-A.png"), 1540)
