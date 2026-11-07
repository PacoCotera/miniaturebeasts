"""Pass 4 final: the torso sheet (front, 3/4 and profile, coat and clay) of the type specimen, the belly, arms, seat and tail root together. Under the bpy venv."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20indiv as IN, s20p2 as P2, s20tex as TX, s20render as RN, s20pipe as PP, s20p3 as P3, sheetlib as SL
from p4step import PASS4
sub = os.path.join(PASS4, "torso"); os.makedirs(sub, exist_ok=True)
c, b, R = IN.make(1)
tex = PP.make_tex(b, c["coat"]); paths = P2.write_tex(tex, os.path.join(sub, "tex"))
M = P2.posed(TX.render_mesh(b), b, R, R.stand_pose())
cells = []
for nm, az, el in (("front", 0, 5), ("three-quarter", 40, 10), ("profile", 90, 5), ("behind", 180, 8)):
    p = os.path.join(sub, f"coat-{nm}.png"); a, cam = RN.render_tex(M, paths, c["coat"], p, 380, 420, 160.0, az=float(az), el=float(el), centre=(-0.2, 0, 0.95), samples=48); RN.to_png(a, p)
    P3.clay_side(b, R, os.path.join(sub, f"clay-{nm}.png"), az=float(az), el=float(el), centre=(-0.2, 0, 0.95), w=380, h=420, pph=160.0, spine=False, samples=24, pose=R.stand_pose())
import shutil; shutil.rmtree(os.path.join(sub, "tex"), ignore_errors=True)
row = lambda kind: "<div class='grid' style='grid-template-columns:repeat(4,390px)'>" + "".join(f"<div class='cell'><img src='torso/{kind}-{nm}.png' width='380'><div class='cap'>{kind}, {nm}</div></div>" for nm in ("front", "three-quarter", "profile", "behind")) + "</div><div style='height:6px'></div>"
body = ("<h1>S20 Tuliko pass 4: the torso, front, 3/4, profile and behind</h1><p>The type specimen (individual 1) at the end of pass 4: mitten arms, the S profile of the seat, the upright egg on the belly, the round head without the ring, the soft tail root. Built " + time.strftime("%a %d %b %H:%M") + ".</p><h2>Coat</h2>" + row("coat") + "<h2>Clay</h2>" + row("clay"))
open(os.path.join(PASS4, "torso.html"), "w").write(SL.page("torso", body)); SL.shoot(os.path.join(PASS4, "torso.html"), os.path.join(PASS4, "torso.png"), 1600)
print("done")
