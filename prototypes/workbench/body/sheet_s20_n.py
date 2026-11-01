"""S20 chunk sheets 2-4: the 10-angle turnaround (clay and wire), optional close wire views, the mesh-quality rows and the chunk's own rows.
Run (bpy venv): python sheet_s20_n.py STAGE OUTDIR   (STAGE: legs | tubes | base)"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20build, sheetgen as SG, sheetlib as SL, s20sheet as SS, s20views as SV, mquality as Q, subdiv as SD, s20measure as M, views
import test_helpers_s20 as TH

STAGE = sys.argv[1]
OUT = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else SS.BUILD
os.makedirs(OUT, exist_ok=True)
NUM = {"legs": 2, "tubes": 3, "base": 4}[STAGE]
TITLE = {"legs": "chunk 2: the legs", "tubes": "chunk 3: the tail and the ears (the tube kind)", "base": "chunk 4: the bare base (AD gate)"}[STAGE]
TAG = f"c{NUM}"
b = s20build.make_s20(upto=STAGE)
spec = b.ctx["spec"]
mesh = views.level_mesh(b, 2)
names = SV.turnaround(b, os.path.join(OUT, TAG), centre=(-0.1 if STAGE != "legs" else 0.0, 0, 1.1), width=480, height=520, pph=125.0, mesh=mesh, pole_dots=True)
SL_grid = lambda prefix, sub, names, w=480, cols=4: f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
V2 = mesh["V"]
extra, close_html = [], ""
if STAGE == "legs":
    cl = views.render_views(b, os.path.join(OUT, TAG), views=[("owner-side", 90.0, 0.0), ("owner-below", 0.0, -89.0), ("owner-foot", 35.0, 8.0)], tag="own-", width=620, height=420, pph=330.0, centre=(0.0, 0, 0.35), mesh=mesh, pole_dots=True)
    close_html = ("<h2>The owner's three wire views: side, from below, a foot (close)</h2><div class='row'>" +
                  "".join(f"<div class='cell'><div class='cap'>{k}</div><img src='{TAG}/own-wire-{k}.png' width='620'></div>" for k in ("owner-side", "owner-below", "owner-foot")) + "</div>")
    low = V2[:, 2] < 0.04
    gap = 2 * float(np.abs(V2[low, 1]).min())
    extra.append(("inner foot gap at the floor >= 0.10 H (no crotch fold)", f"{gap:.3f} H", gap >= 0.10))
    extra.append(("sole on the floor: lowest level-2 point", f"{V2[:, 2].min():.3f} H", V2[:, 2].min() > -0.03))
if STAGE == "tubes":
    import json as _j, s20genes
    import schema as SC
    raw0 = _j.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "species", "S20.json")))
    def variant(g, **kw):
        spec_v, _ = SC.load(raw=s20genes.apply_shape(raw0, g))
        return s20build.make_s20(spec_v, upto="tubes", **kw), spec_v
    strip_ears = [("prick", dict(ear="prick")), ("lop", dict(ear="lop")), ("lop x1.2, droop 15", dict(ear="lop", earLen=1.2, droop=15)), ("nub", dict(ear="nub")), ("prick x1.45, splay 16", dict(ear="prick", earLen=1.45, splay=16))]
    strip_tails = [("curl -0.15", dict(curl=-0.15)), ("type (curl 0)", dict()), ("curl +0.3", dict(curl=0.3)), ("curl +0.45 (clipped to the room)", dict(curl=0.45)), ("x1.35 long, curl +0.25", dict(tailLen=1.35, curl=0.25)), ("x0.72 short, girth 1.28", dict(tailLen=0.72, tailGirth=1.28))]
    cells = []
    for kind, lst in (("ears", strip_ears), ("tail", strip_tails)):
        for label, g in lst:
            vb, vs = variant(g)
            mm = views.level_mesh(vb, 2)
            for az in (0.0, 45.0, 90.0):
                path = os.path.join(OUT, TAG, f"strip-{kind}-{label.split()[0]}-{int(az)}.png".replace("+", "p").replace("-", "m", 0))
                views.render_views(vb, os.path.join(OUT, TAG), views=[(f"strip-{kind}-{lst.index((label, g))}-{int(az)}", az, 12.0)], tag="s-", width=260, height=380, pph=100.0, centre=(-0.35, 0, 1.2), mesh=mm, wire=False)
            clip = vs["parts"]["tail"]["clip"]
            note = f" (applied {clip['applied']:.2f})" if kind == "tail" and clip["factor"] < 1 else ""
            cells.append((kind, lst.index((label, g)), label + note))
    rows_html = ""
    for kind in ("ears", "tail"):
        rows_html += f"<h2>{'The ear families (frond is cut with the rest of the frond family; see the notes)' if kind == 'ears' else 'Tail curls'}: each at azimuth 0, 45, 90</h2><div class='row'>"
        for k, i, label in [c for c in cells if c[0] == kind]:
            rows_html += "<div class='cell'><div class='cap'>" + label + "</div>" + "".join(f"<img src='{TAG}/s-clay-strip-{kind}-{i}-{az}.png' width='200'>" for az in (0, 45, 90)) + "</div>"
        rows_html += "</div>"
    close_html += rows_html
chibi_html = ""
if STAGE == "base":
    import gates
    torso = np.rint(mesh["attr"][:, 0]).astype(int) == b.parts["torso"]
    Vt = mesh["V"][torso]
    zt = np.arange(0.3, 2.1, 0.02)
    wt = np.array([2 * float(np.abs(Vt[np.abs(Vt[:, 2] - z) < 0.03, 1]).max()) for z in zt])
    head_w, body_w = wt[zt > 1.17].max(), wt[zt < 1.17].max()
    waist_w = wt[(zt > 0.9) & (zt < 1.45)].min()
    z_waist = float(zt[(zt > 0.9) & (zt < 1.45)][wt[(zt > 0.9) & (zt < 1.45)].argmin()])
    z_top, z_bot = float(Vt[:, 2].max()), float(Vt[:, 2].min())
    legp = np.rint(mesh["attr"][:, 0]).astype(int) == b.parts["leg.L"]
    VL = mesh["V"][legp]
    under = float(Vt[(np.abs(Vt[:, 1] - 0.33) < 0.06)][:, 2].min())
    foot_len = float(VL[VL[:, 2] < 0.1][:, 0].max() - VL[VL[:, 2] < 0.1][:, 0].min())
    col_w = float(2 * (VL[(VL[:, 2] > 0.14) & (VL[:, 2] < 0.2) & (VL[:, 1] > 0)][:, 1].max() - 0.33))
    armp = np.rint(mesh["attr"][:, 0]).astype(int) == b.parts["arm.L"]
    VA = mesh["V"][armp & (mesh["V"][:, 1] > 0)]; arm_len = float(np.linalg.norm(VA.max(0) - VA.min(0)))
    fl = Q.flips(mesh["V"], mesh["F"])
    cen = np.array([-0.35, 0.0, 1.3])
    sizes = {304: (304, 312, 95.0), 96: (96, 88, 30.0), 48: (48, 48, 15.0)}
    al = {}
    for sz, (w_, h_, ppH) in sizes.items():
        a_, cam_ = gates.render_rgba(mesh, os.path.join(OUT, TAG, f"stand-{sz}.png"), 57.5, 10.0, w_, h_, cen if sz != 48 else np.array([-0.35, 0, 1.25]), ppH, samples=32)
        al[sz] = a_[..., 3]
    a48 = al[48] > 0.5
    rows = [gates.runs(a48[y]) for y in range(48)]
    ys = [y for y in range(48) if rows[y]]
    top = ys[0]
    ear_rows = [rows[y] for y in range(top, top + 4)]
    ear_w = [max((r[1] - r[0] + 1) for r in rr) for rr in ear_rows[-1:]] if ear_rows else [0]
    n_ear_runs = max(len(rr) for rr in ear_rows)
    widths48 = [(y, sum(r[1] - r[0] + 1 for r in rows[y]), len(rows[y])) for y in ys]
    head_px = max(wd for y, wd, n in widths48 if y > top + 6 and y < top + 20)
    waist_px = min(wd for y, wd, n in widths48 if top + 14 < y < top + 28)
    xr = max(r[1] for y in ys for r in rows[y])
    hook = max((r[1] - r[0] + 1) for y in ys for r in rows[y] if r[1] >= xr - 1)
    rows_c = [
        ("Big round head about the body's size", f"head {head_w:.3f} H wide, {z_top - z_waist:.3f} tall; body {body_w:.3f} wide, {z_waist - z_bot:.3f} tall; head / body width {head_w / body_w:.3f}", head_w / body_w > 1.04),
        ("Short thick limbs", f"legs 0.46 H hip to sole; column above the foot {under - 0.12:.3f} H, {col_w:.3f} H across; foot {foot_len:.3f} H long; arm nubs {arm_len:.2f} H", abs(under - 0.12) < 0.2),
        ("Round masses, no hard edges", f"level-2 min adjacent normal dot {fl['min_adjacent_normal_dot']:.2f} (the crotch fold at each leg; everywhere else the loft is smooth: see the clay)", fl["min_adjacent_normal_dot"] > -0.2),
        ("Face readable at 96", f"no face in the bare base (decals arrive in chunk 5); the file: eyes 0.30 H = {0.30 * 30:.0f} px at 96, 0.61 H apart", None),
        ("Clean silhouette at 48", f"head {head_px} px wide, waist {waist_px} px, {n_ear_runs} ear runs at the top rows (each {ear_w[0]} px at 4 rows down), tail hook {hook} px", head_px >= 5 and waist_px >= 5 and n_ear_runs >= 2),
    ]
    chibi_html = ("<h2>Chibi checklist (measured on this build)</h2>" + SL.table([(a, b_, "" if c is None else SL.status(c)) for a, b_, c in rows_c], ["Check", "Measured", ""]) +
                  "<h2>The house three-quarter view at 304 / 96 / 48 (clay, bare base, rest pose; 96 shown at 4x and 48 at 6x)</h2><div class='row'>" +
                  f"<div class='cell'><div class='cap'>304</div><img src='{TAG}/stand-304.png' width='304'></div>" +
                  f"<div class='cell'><div class='cap'>96 (4x)</div><img src='{TAG}/stand-96.png' width='384' style='image-rendering:pixelated'></div>" +
                  f"<div class='cell'><div class='cap'>48 (6x)</div><img src='{TAG}/stand-48.png' width='288' style='image-rendering:pixelated'></div></div>")
    json.dump(dict(head_w=head_w, body_w=body_w, waist_w=waist_w, under=under, foot_len=foot_len, col_w=col_w, arm_len=arm_len, head_px=head_px, waist_px=waist_px, ear_runs=n_ear_runs, ear_w=ear_w, hook=hook, min_dot=fl["min_adjacent_normal_dot"]), open(os.path.join(OUT, "4-base.json"), "w"))
rr = TH.ring_ratio(b)
extra.append(("loft ring ratio (adjacent half-widths and depths) <= 1.5", f"{rr:.3f}", rr <= 1.5))
rows = SG.quality_rows(b, extra)
notes = {"legs": "Leg socket: station 0.42, column 5 (the file's column key), one transition ring, loop-to-ring pairing by least distance (the loop sits on a near-vertical wall, so Loika's pairing by angle crossed). Toe beads and flat soles as Loika's.",
         "tubes": "Tail: a centre tube (half 5-ring from the 1 x 2 patch on the mirror at station 0.63, one transition ring, tip closed by 2 half quads). Ears: lateral tubes (8-ring from the 2 x 2 patch at station 1.93, column 3, one transition ring, 4 tip quads). Rings are evenly spaced (0.11 H); transition vertices are lifted out of the loft along its normal so the bridge does not cut through it. The frond family is not built (cut order 2).", "base": "The bare base, the type specimen: gourd loft, two legs with toe beads, a tail, prick ears, two arm nubs, a nose button and the lantern. Form only: clay, rest pose, no face, colour or glow yet (chunk 5). The AD gates this sheet; chunks 5 to 7 continue meanwhile."}[STAGE]
body = (f"<h1>S20 Tuliko, {TITLE}</h1><p>{notes}</p>" + chibi_html + close_html +
        "<h2>Clay, 10 views</h2>" + SL_grid("clay", TAG, names) +
        "<h2>Wireframe (valence 5 red, 6 orange, 3 green)</h2>" + SL_grid("wire", TAG, names) +
        "<h2>Mesh quality (the file's thresholds; failing rows stay failing)</h2>" + SG.rows_html(rows))
p = os.path.join(OUT, f"{NUM}-{STAGE}.html")
open(p, "w").write(SL.page(f"S20 {TITLE}", body))
SL.shoot(p, os.path.join(OUT, f"{NUM}-{STAGE}.png"), 1960)
print("ok")
