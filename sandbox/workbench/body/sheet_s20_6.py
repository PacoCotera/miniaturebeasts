"""S20 chunk 6 picture: 6-waddle. Eight frames of the waddle from the front and the side (skinned, level 3), the 10-angle stand pose (clay and wire), the clip table, the rig tests.
Run (bpy venv): python sheet_s20_6.py [OUTDIR]"""
import sys, os, json, time, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, s20render as RN, s20rig, sheetlib as SL, s20views as SV, views, subdiv as SD, mquality as Q

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"
PIC = os.path.join(OUT, "c6")
os.makedirs(PIC, exist_ok=True)
b = s20build.make_s20(upto="base")
R = s20rig.Rig(b.ctx)
G = dict(palette="lagoon", layout="plain")
t0 = time.time()
body = ["<h1>S20 Tuliko, chunk 6: rig and clips</h1>",
        "<p>22 bones: root, body (pivot at the belly), head (pivot at the waist), leg.{upper,lower,foot}.{L,R}, tail.1-6 and tip, ear.{1,2}.{L,R}, arm.{L,R}. Weights from the arc length of each path (hat functions between segment middles on the tail, a smooth step at the ear's bend, the leg column carried by the upper bone and the sole by the level foot bone), the loft by height (body below 1.0 H, head above 1.4 H). "
        "Waddle: 0.9 s, duty 0.55, body roll +-7 deg over the stance foot, yaw 4 deg, a 0.06 H lift, the tail counter-swaying 6 deg. Stand: the tail yawed 38 deg toward the camera's side (the file's 30 deg left the lantern half behind the head), head tilt 3 deg. "
        "Idle: breathe 2 % on the body, ear sway 5 deg lagged, tail idle 8 deg over 2.2 s, arm swing 3 deg; the lantern's glow pulse (0.8-1.0 over 2.4 s) and the blink frames are runtime effects in the viewer.</p>"]
rows = []
for view, az in (("front", 0.0), ("side", 90.0)):
    cells = []
    for i in range(8):
        M, st = R.waddle_pose(i / 8)
        P = RN.prepare(b, G, level=3, pose=M, rig=R)
        p = os.path.join(PIC, f"waddle-{view}-{i}.png")
        a, _ = RN.render(P, G, p, 304, az=az, el=8.0, centre=(-0.3, 0, 1.2), samples=16, wh=(250, 360), ppH=100.0)
        RN.to_png(a, p)
        cells.append(f"<div class='cell'><img src='c6/waddle-{view}-{i}.png' width='250'><div class='cap'>phase {i}/8 {'L' if st['L'] else '-'}{'R' if st['R'] else '-'} stance</div></div>")
    rows.append(f"<h2>Waddle, {view}: 8 frames (L / R: the leg in stance)</h2><div class='grid' style='grid-template-columns:repeat(8,250px)'>" + "".join(cells) + "</div>")
body += rows
# the stand pose, 10 angles, clay and wire
Vf, Ff, attr, fp, cr, mir = b.full()
mesh = views.level_mesh(b, 2)
F0 = np.array(mesh["F0"], int)
cnt = np.zeros((len(mesh["V0"]), len(b.parts) + 1))
for k in range(4):
    np.add.at(cnt, (F0[:, k], fp.astype(int)), 1.0)
part0 = cnt.argmax(1)
F2 = np.array(mesh["F"], int)
cnt2 = np.zeros((len(mesh["V"]), len(b.parts) + 1))
for k in range(4):
    np.add.at(cnt2, (F2[:, k], mesh["fp"].astype(int)), 1.0)
part2 = cnt2.argmax(1)
M = R.stand_pose()
Vs0 = R.skin(mesh["V0"], R.weights(mesh["V0"], attr, part0), M)
Vs2 = R.skin(mesh["V"], R.weights(mesh["V"], mesh["attr"], part2), M)
ms = dict(mesh, V0=Vs0, V=Vs2)
names = SV.turnaround(b, os.path.join(OUT, "c6"), centre=(-0.3, 0, 1.2), width=480, height=520, pph=125.0, mesh=ms, pole_dots=True)
grid = lambda prefix, sub, names, w=480, cols=4: f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
body.append("<h2>The stand pose, clay, 10 views</h2>" + grid("clay", "c6", names) + "<h2>The stand pose, wireframe</h2>" + grid("wire", "c6", names))
# fold numbers
Wt = R.weights(mesh["V"], mesh["attr"], part2)
def folds(V):
    n = np.cross(V[F2[:, 2]] - V[F2[:, 0]], V[F2[:, 3]] - V[F2[:, 1]]); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-300)
    E = Q.edge_faces(F2)
    md, cnt_ = 1.0, 0
    for fs in E.values():
        if len(fs) == 2:
            d = float(n[fs[0]] @ n[fs[1]]); md = min(md, d); cnt_ += d < -0.2
    return md, cnt_
rest = folds(R.skin(mesh["V"], Wt, R.pose()))
rows = [("rest", f"{rest[0]:.2f}", rest[1])]
for ph in s20rig.WALK_KEYS:
    md, c = folds(R.skin(mesh["V"], Wt, R.waddle_pose(ph)[0]))
    rows.append((f"waddle key {ph}", f"{md:.2f}", c))
body.append("<h2>Folds (level 2, adjacent normal dot; limit -0.2)</h2>" + SL.table([(a, b_, c, SL.status(float(b_) > -0.2)) for a, b_, c in rows], ["pose", "min dot", "folded edges", ""]) +
            "<p>The rest mesh already carries the leg's crotch fold from chunk 2 (kept failing); every waddle key makes it worse because the leg column swings about the hip right under it. Everything else (waist under a +-6 deg head nod, the tail root, the ears) stays above -0.2.</p>")
open(os.path.join(OUT, "6-waddle.html"), "w").write(SL.page("S20 chunk 6 rig", "".join(body)))
SL.shoot(os.path.join(OUT, "6-waddle.html"), os.path.join(OUT, "6-waddle.png"), 2060)
print("ok", round(time.time() - t0), "s")
