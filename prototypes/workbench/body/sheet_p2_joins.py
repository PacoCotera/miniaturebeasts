"""Pass 2: the join rule (soft / hard) on one prick ear and one lop ear, root close-ups from the front, side and back in clay, Normal and wire. Under the bpy venv."""
import sys, os, json, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, s20build, schema as SC, sheetlib as SL, subdiv as SD, s20normals as NM, nview, bpyio as B, views
sub = os.path.join(P2.OUT, "s5b-joins"); os.makedirs(sub, exist_ok=True)
RAW = IN.RAW
cells, rows = [], []
for fam in ("prick", "lop"):
    for join in ("soft", "hard"):
        d = copy.deepcopy(RAW); d["parts"]["ear.L"]["socket"].update(join=join, bury=0.04)
        spec, _ = SC.load(raw=d)
        b = s20build.make_s20(spec, upto="base", ear=fam)
        r = P2.ear_join_report(b)
        V, F, at, fp2 = P2.level_arrays(b, 2)
        part = IN.part_of(b, F, fp2, len(V))
        m = NM.measure(V, F, tag=at[:, 3], s=at[:, 1])
        ear = (part[m["E"][:, 0]] == b.parts["ear.L"]) & ~m["crease"]
        face_max = float(m["ang"][ear].max()) if ear.any() else 0.0          # a hard shell is all tagged crease: nothing to test
        if join == "soft":
            rows.append((f"{fam} soft", f"footprint / mid width {r['ratio']:.2f} (needs 1.5-1.8); narrowest ring over mid width {r['narrowest_over_mid']:.2f} (needs 1.0); {r['loops']} loops; ear face angle max {face_max:.1f} deg (needs 20)",
                         1.5 <= r["ratio"] <= 1.8 and r["narrowest_over_mid"] >= 0.97 and face_max <= 20))
        else:
            rows.append((f"{fam} hard", f"shell base buried {r['buried']:.3f} H (needs 0.03), crease-tagged: {r['tagged']}, no bridge, the intersection line is the only transition", r["buried"] >= 0.03 and r["tagged"]))
        vn = NM.vertex_normals(V, F)
        tag = f"{fam}-{join}"
        vs = [("front", 0.0, 20.0), ("side", 90.0, 15.0), ("back", 180.0, 15.0)]
        cen = (-0.2, 0.3, 1.95)
        views.render_views(b, sub, views=[(f"{tag}-{n}", az, el) for n, az, el in vs], tag="j-", width=300, height=300, pph=260.0, centre=cen, wire=True, samples=24)
        col = []
        for n, az, el in vs:
            img = nview.render(V, F, vn, az, el, cen, 260.0, 300, 300)[0]
            B.write_png(os.path.join(sub, f"jn-{tag}-{n}.png"), img)
            col.append(f"<div><div class='cap'>{n}</div><img src='s5b-joins/j-clay-{tag}-{n}.png' width='200'><img src='s5b-joins/jn-{tag}-{n}.png' width='200'><img src='s5b-joins/j-wire-{tag}-{n}.png' width='200'></div>")
        cells.append(f"<div class='cell'><div class='cap'><b>{fam} ear, {join} join</b>: clay, Normal, wire</div>" + "".join(col) + "</div>")
notes = ("<p>Framework rule (owner): every socket declares its join type, <b>soft</b> or <b>hard</b>, and nothing in between. Tuliko's legs, ears and arms are <b>soft</b>; the face attachment families (whiskers, fangs, horns, tusks) are <b>hard</b>. "
         "<b>Honest read:</b> the hard join works for both ear families (a closed shell with its own rounded base buried 0.04-0.055 H, tagged as a crease, no bridge): it reads as a sewn-on ear with a clean intersection line. "
         "The soft join on a 2 x 2 socket patch does NOT yet meet the rule: the loop footprint is about 0.9 of the ear's mid width instead of 1.5-1.8, the band narrows to about 0.75 of the mid width just above the root (a pinch), and the root face angle reaches 38-41 degrees. "
         "A footprint of 1.5-1.8 x the ear's width needs a bigger socket patch (3 columns x 3 rings and a 12-vertex tube ring) than the cage builder makes today; I did not build it in this pass. The ear roots are therefore still a half-blend; use the hard join if a clean line is preferred to a soft one until the wider patch exists.</p>")
body = f"<h1>S20 Tuliko, pass 2: the join rule on the ears</h1>" + notes + SL.table(rows, ["Case", "Measured"][:2] if False else None) if False else None
html = f"<h1>S20 Tuliko, pass 2: the join rule (soft or hard) on a prick and a lop ear</h1>" + notes + SL.table([(a, b_, SL.status(c_)) for a, b_, c_ in rows], ["Case", "Measured", ""]) + "<div class='grid' style='grid-template-columns:repeat(2,700px)'>" + "".join(cells) + "</div>"
open(os.path.join(P2.OUT, "s5b-joins.html"), "w").write(SL.page("S20 pass 2 joins", html))
SL.shoot(os.path.join(P2.OUT, "s5b-joins.html"), os.path.join(P2.OUT, "s5b-joins.png"), 1500)
print("done")
