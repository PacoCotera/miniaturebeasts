import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from sheetgen import *
S4, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]); cp = make_cp(LOIKA)
mast, sdf = refs(cp, os.path.dirname(S4))
m = json.load(open(os.path.join(S4, "measures.json")))
im = lambda n: cp(os.path.join(S4, n + ".png"), "s4-" + n + ".png")
body = ("<h1>Stop 4: join A (shells) and join B (one cage) on the near fore shoulder, for the AD to choose</h1><div class='sub'>Light clay, the stand view, pinned commit 3f8dfb8fd. "
        "A: the leg is its own closed tube, its upper rings are the shoulder mass; the seam is the intersection. B: the torso's fore port (2 x 2 faces on the flank) is deleted, its 8-vertex ring is the leg's first ring, two level bridge loops (weighted half chest, half upper leg) run to the leg's mass ring, and the whole is fitted to uRound(torso, leg, union-body). "
        "<b>The jaw's option B is not built</b>: the house puts the head's collar ring (z = 0.99) inside the chest, whose top there is at 1.2-1.35; a bridge from that ring to a neck port on the chest's top would run through the body. The jaw is shown in A only.</div>"
        "<h2>Whole at 304 and 96 (96 shown 3x)</h2><div class='row'>" + cell(mast[304], "master") + cell(im("A-clay-304"), "A: shells") + cell(im("B-clay-304"), "B: one cage on the shoulder") + cell(im("A-clay-96"), "A at 96", 3) + cell(im("B-clay-96"), "B at 96", 3) + "</div>"
        "<h2>Near fore shoulder at 4x, stand view</h2><div class='row'>" + cell(im("A-shoulder4x"), "A: the shells' intersection is the outline of the shoulder") + cell(im("B-shoulder4x"), "B: the flank rolls into the leg; one small sliver of crack at the port's front edge (a defect to fix if B is chosen)") + "</div>"
        "<h2>Shoulder from the side, head square, 3x</h2><div class='row'>" + cell(im("A-shoulder-side"), "A") + cell(im("B-shoulder-side"), "B") + "</div>"
        "<h2>The leg swung 20 degrees forward and 20 back (4x): does the join hold its mass?</h2><div class='row'>" + cell(im("A-shoulder4x-fwd"), "A, forward") + cell(im("B-shoulder4x-fwd"), "B, forward") + cell(im("A-shoulder4x-back"), "A, back") + cell(im("B-shoulder4x-back"), "B, back") + "</div>"
        "<h2>Jaw and throat in A, 3.5x: front and three-quarter</h2><div class='row'>" + cell(im("A-jaw-front"), "front") + cell(im("A-jaw-34"), "three-quarter") + "</div>"
        f"<h2>Facts</h2><table><tr><th></th><th>A</th><th>B</th></tr><tr><td>quads / shells / non-manifold edges</td><td>{m['A']['mesh']['quads']} / {m['A']['mesh']['shells']} / {m['A']['mesh']['nonmanifold_edges']}</td><td>{m['B']['mesh']['quads']} / {m['B']['mesh']['shells']} / {m['B']['mesh']['nonmanifold_edges']}</td></tr>"
        f"<tr><td>fit residual of the torso (+ fore leg in B), largest, H</td><td>{m['A']['fit']['torso']['max']:.4f}</td><td>{m['B']['fit']['torso+fore.L (B)']['max']:.4f}</td></tr></table>"
        "<p><b>Criteria (fix2 ruling 1c, fix3 must-fix 2):</b> a round shoulder mass the leg comes out of: A shows it with a seam, B without; no lip, no ring: B has none, A has a crease where the shell enters. The builder does not choose.</p>")
html = os.path.join(LOIKA, "4-joins-AB.html"); page("Stop 4", body, html); shot(html, os.path.join(LOIKA, "4-joins-AB.png"), 1560)
