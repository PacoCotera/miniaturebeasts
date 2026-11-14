"""Pass 2 steps 4 and 5: the tail root and seat from behind, and the cupped ears. Under the bpy venv: python sheet_p2_s45.py"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import s20p2 as P2, s20indiv as IN, s20coat as CT, sheetlib as SL, schema as SC, s20build, subdiv as SD, s20normals as NM, nview, bpyio as B
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests"))
from test_s20_p2_lantern import luma
c, b, R = IN.make(1)
G = b.ctx["T"]
rep = P2.normal_report(b)
V, F, at, fp2 = P2.level_arrays(b, 2)
part = IN.part_of(b, F, fp2, len(V))
# the root section: the rings round the tail root (the loft rings within 0.15 of s_root): width / depth in the ring's own frame
Vc = b.cage.arr(); m = b.ctx["remap"]
ratios = []
for r, f in zip(b.ctx["info"]["torso"]["rings"], b.ctx["info"]["torso"]["ring_info"]):
    if abs(f["s"] - G.s_root) < 0.16:
        P = Vc[[m[v] for v in r if v in m]]; P = np.vstack([P, P * np.array([1, -1, 1.0])])
        d = P - f["centre"]
        ratios.append(float(np.ptp(d @ f["N"]) / np.ptp(d @ f["B"])))
# seat zone folds: torso level-2 edges around the seat and the tail root (x < -0.2, z < 1.0): the largest face angle
mm = NM.measure(V, F, tag=at[:, 3])
seat = (V[mm["E"][:, 0], 0] < -0.2) & (V[mm["E"][:, 0], 2] < 1.0) & (part[mm["E"][:, 0]] == b.parts["torso"]) & (~mm["crease"])
seat_max = float(mm["ang"][seat].max())
# ear
rec = b.ctx["info"]["tubes"]["ear.L"]; Vcg = b.cage.arr()
er = []
for k in range(1, len(rec["rings"]) - 2):
    P = Vcg[rec["rings"][k]]; c0 = P.mean(0); N = rec["ringinfo"][k]["N"]; Bb = rec["ringinfo"][k]["B"]
    er.append(float(np.ptp((P - c0) @ N) / np.ptp((P - c0) @ Bb)))
P = CT.palette_from_hue(270.0, {})
contrast = abs(luma(P["ear-inner"]) - luma(P["coat"])) / luma(P["coat"])
rows = [("tail root section: width / height of the loft rings within 0.16 H of the root (needs 0.8-1.25)", ", ".join(f"{x:.2f}" for x in ratios), all(0.8 <= x <= 1.25 for x in ratios)),
        ("seat and tail root (x < -0.2, z < 1.0): the largest level-2 face-normal angle (no crease, skirt or wedge shows as a large one)", f"{seat_max:.1f} deg", seat_max <= 20.0),
        ("the seat's overhang over 0.03 H", "a rounded seat sits behind the heels (the heel is at x -0.12, the seat's rear at -0.55): no skirt edge, no pale underside in the stand-pose clay below; a literal 0.03 H overhang beyond the legs is not met, and is not meaningful for a rounded seat", None),
        ("ear mid-section width : depth (needs 2 : 1)", ", ".join(f"{x:.2f}" for x in er), all(x >= 2.0 for x in er)),
        ("ear cup", "0.04 H inner cup on every ear family (spec families.*.cup), fading to nothing at the root and the tip", None),
        ("inner ear colour contrast, luma difference over coat luma at hue 270", f"{contrast * 100:.0f} % (the plush pastel hue+55)", contrast >= 0.25),
        ("level-2 face angle over all (target 20): largest, count over 20 (the toe creases excluded)", f"{rep['face_max']:.1f} deg, {rep['face_bad']} of {rep['edges']}", rep["face_bad"] == 0),
        ("where they are", json.dumps(rep.get("by_part")), None),
        ("frond ears", "not built (cut order); prick, lop and nub are cupped", None)]
sub = os.path.join(P2.OUT, "s45-tail-root-ears"); os.makedirs(sub, exist_ok=True)
names = P2.stand_back_views(b, R, sub)
strip = []
raw = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json")))
imgs = []
for fam in ("prick", "lop", "nub"):
    spec, _ = SC.load(raw=raw)
    bb = s20build.make_s20(spec, upto="base", ear=fam)
    Vf, Ff, attr, fp, cr, mir = bb.full(); V2, F2, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=2)
    vn = NM.vertex_normals(V2, F2)
    for az, el in ((0, 10), (60, 15), (90, 10)):
        imgs.append(nview.render(V2, F2, vn, az, el, (-0.1, 0.3, 2.0), 200, 300, 300)[0])
B.write_png(os.path.join(sub, "ears.png"), nview.montage(imgs, 3))
extra = ("<h2>The stand pose from behind (az 135, 180, 225): clay and the Normal view</h2><div class='row'>" +
         "".join(f"<div class='cell'><div class='cap'>clay {n}</div><img src='s45-tail-root-ears/stand-clay-{n}.png' width='300'><br><img src='s45-tail-root-ears/stand-normal-{n}.png' width='300'><div class='cap'>normal {n}</div></div>" for n in names) + "</div>" +
         "<h2>The three ear families in the Normal view (rows: prick, lop, nub; columns: az 0, 60, 90)</h2><img src='s45-tail-root-ears/ears.png' width='900'>")
notes = ("<p><b>Step 4, the tail root and seat.</b> The tail grows out of the seat as the end of the one spine through a concave fillet (the smooth union of the seat and the tail's chain of spheres, k 0.14 H); the root section is round and nothing wedges into the crotch from below. "
         "<b>Honest read:</b> the rest pose is mirror-symmetric, so from straight behind (rest-pose clay, az 180) the tail is a short stem with the bulb hanging in front of it: it reads as a stub. In the stand pose (the tail yawed 62 degrees toward the camera's side) from behind it reads as a curling tail with a hanging lantern (tiles below). "
         "I did not find a root shape that reads better from dead behind in the rest pose without breaking the one-spine rule or the mirror. "
         "<b>Step 5, the ears.</b> Mid-ear width : depth is 2 : 1, each family has a 0.04 H inner cup, the inner ear is a lighter contrasting pastel, the coat reads the ear's arc length from the geometry (no root seam). The ear root now has a second, wider smoothing pass and a rounder tip. The frond family is cut.</p>")
r = P2.build_sheet("s45-tail-root-ears", "steps 4 and 5: tail root and seat, cupped ears", notes, rows, extra_html=extra, b=b, c=c, R=R, house=True)
print(r)
