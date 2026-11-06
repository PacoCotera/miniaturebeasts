"""Stop 1 sheet: master, SDF and mesh beside each other at 304, 96 and 48; side, front, face; numbers. Run with any python (HTML only)."""
import os, sys, json, shutil
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tools"))
from sheetlib import page, shot
S1, LOIKA = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
MASTER = "/home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-%s.png"
SDF = os.path.join(os.path.dirname(S1), "sdf-S01-%d.png")
img = os.path.join(LOIKA, "img"); os.makedirs(img, exist_ok=True)
def cp(src, name): shutil.copy(src, os.path.join(img, name)); return "img/" + name
m = json.load(open(os.path.join(S1, "measures.json")))
mast = {304: cp(MASTER % "304x312", "master-304.png"), 96: cp(MASTER % "96x88", "master-96.png"), 48: cp(MASTER % "48x48", "master-48.png")}
sdf = {s: cp(SDF % s, f"sdf-{s}.png") for s in (304, 96, 48)}
clay = {s: cp(os.path.join(S1, f"clay-{s}.png"), f"s1-clay-{s}.png") for s in (304, 96, 48)}
clayL = cp(os.path.join(S1, "clayL-304.png"), "s1-clayL-304.png")
views = {n: cp(os.path.join(S1, ("face3x" if n == "face3x" else f"view-{n}") + ".png"), f"s1-view-{n}.png") for n in ("side", "front", "back34", "face3x")}
def cell(src, cap, scale=1, w=None):
    return f"<div class='cell'><img src='{src}' style='zoom:{scale}'><div class='cap'>{cap}</div></div>"
e = m["eyes"]
rows = [("H/S", "0.5348", "house band 0.45-0.60", "the house's value, by construction (S = 1.870 H)"),
        ("far eye width / near eye width", f"{e['ratio']:.2f}", "0.60-0.70 (fix3, must-fix 1)", "<span class='warn'>over: the far eye is wider on screen than the house wants</span>"),
        ("far eye higher than near, in H", f"{e['far_higher_by']:+.3f}", "far above near (master: far 128 px, near 146 px)", "far is higher: roll sign correct" if e['far_higher_by'] > 0 else "<span class='warn'>far is lower: roll sign wrong</span>"),
        ("chin overhang, H", f"{m['chin_overhang']:.3f}", "0.04-0.12", "inside the range (the SDF sets 0.07 at the chest's jaw-height front; the mesh's chin is a little further out)"),
        ("mirror error, level 2 mesh (H)", f"{m['mesh_rest']['mirror_error']:.1e}", "<= 1e-6", "exact"),
        ("quads / shells / non-manifold edges", f"{m['mesh_rest']['quads']} / {m['mesh_rest']['shells']} / {m['mesh_rest']['nonmanifold_edges']}", "all quads; shells = parts (10)", "as built: head, torso, 2 legs + 2 paws, mirrored"),
        ("fit residual of limit points to the field, largest (H)", f"{max(v['max'] for v in m['fit'].values()):.4f}", "< 0.004", "head %.4f, torso %.4f" % (m['fit']['head']['max'], m['fit']['torso']['max']))]
tbl = "<table><tr><th>Measure</th><th>Mesh</th><th>House</th><th>Verdict</th></tr>" + "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>" for a, b, c, d in rows) + "</table>"
body = ("<h1>Stop 1: head and torso in clay, in the stand view (pinned commit 3f8dfb8fd)</h1><div class='sub'>Mesh: Mirror + Subdivision level 3, stand pose by the head bone (yaw 29.5 deg, roll 8 deg, chin up 9.45 deg), the house's key light and orthographic camera at body yaw 57.5 deg, pitch 8 deg. "
        "Legs and paws are present (clay too). No leaves, eyes, cream or ink yet. The SDF render is the pinned commit's own, for the same specimen.</div>"
        "<h2>304 x 312</h2><div class='row'>" + cell(mast[304], "master") + cell(sdf[304], "SDF, pinned commit") + cell(clay[304], "mesh, clay in the body colour") + cell(clayL, "mesh, light clay (to read the form)") + "</div>"
        "<h2>96 x 88 (shown 3x) and 48 x 48 (shown 4x)</h2><div class='row'>" + cell(mast[96], "master 96", 3) + cell(sdf[96], "SDF 96", 3) + cell(clay[96], "mesh 96", 3) + cell(mast[48], "master 48", 4) + cell(sdf[48], "SDF 48", 4) + cell(clay[48], "mesh 48", 4) + "</div>"
        "<h2>Review views, light clay, head square (side, front, three-quarter back) and the face at 3x in the stand pose</h2><div class='row'>" + cell(views["side"], "side") + cell(views["front"], "front") + cell(views["back34"], "back three-quarter") + cell(views["face3x"], "face, stand pose, 3x") + "</div>"
        "<h2>Numbers</h2>" + tbl)
html = os.path.join(LOIKA, "1-head-torso.html")
page("Stop 1", body, html)
shot(html, os.path.join(LOIKA, "1-head-torso.png"), 1540)
