"""Chunk 6 picture: 6-skin.png. The stand pose in skin at 304 / 96 / 48 beside the master, the face at 3x, the blink frames, the front view, the measures, the outline diff at the blink, the UV stretch. Run (bpy venv): python sheet_c6.py OUTDIR"""
import sys, os, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, rig, render_skin as RS, gates, measure_skin as MS, skin as SK, views, subdiv as SD, uvstretch, sheetlib as SL

OUT = os.path.abspath(sys.argv[1]); D = os.path.join(OUT, "c6"); os.makedirs(D, exist_ok=True)
b = build.make_body(upto="base"); R = rig.Rig(b.ctx); Mp = R.stand_pose()
res = {}
imgs = {}
cent = {}
for size in (304, 96, 48):
    cent[size] = RS.aligned_centre(b, R, Mp, size)
    a, cam = RS.render_skin(b, R, Mp, os.path.join(D, f"skin-{size}.png"), size, centre=cent[size], samples=64 if size == 304 else 96)
    imgs[size] = a
mas = {s: gates.load_rgba(gates.MASTER % n) for s, n in ((304, "304x312"), (96, "96x88"), (48, "48x48"))}
m_me, m_ms = MS.measure(imgs[304]), MS.measure(mas[304])
# face at 3x and the blink frames (both eyes in the same frame)
head_c = np.array([0.15, 0.25, 1.55])
for fr in ("open", "half", "closed"):
    RS.render_skin(b, R, Mp, os.path.join(D, f"face-{fr}.png"), 304, centre=head_c, eye_frames=(fr, fr), samples=48, level=3) if False else None
# the face crops use a larger ppH: temporarily a 3x size entry
gates.SIZES["face"] = (330, 300, 95.0 * 3)
RS.SIZES = gates.SIZES
for fr in ("open", "half", "closed"):
    a, _ = RS.render_skin(b, R, Mp, os.path.join(D, f"face-{fr}.png"), "face", centre=np.array([0.2, 0.3, 1.5]), eye_frames=(fr, fr), samples=48)
# outline diff, rest vs blink peak (closed), 304 and 96
diffs = {}
for size in (304, 96):
    ac, _ = RS.render_skin(b, R, Mp, os.path.join(D, f"blink-{size}.png"), size, centre=cent[size], eye_frames=("closed", "closed"), samples=16 if size == 96 else 32)
    ao, _ = RS.render_skin(b, R, Mp, os.path.join(D, f"open-{size}.png"), size, centre=cent[size], samples=16 if size == 96 else 32)
    diffs[size] = int(((ao[..., 3] > 0.5) != (ac[..., 3] > 0.5)).sum())
# the front view (lobe on the midline, both rings whole)
Mrest = {n: np.eye(4) for n in R.bones}
a, _ = RS.render_skin(b, R, Mrest, os.path.join(D, "front.png"), 304, az=0.0, el=6.0, centre=np.array([-0.1, 0, 1.2]), samples=48)
# UV stretch on the level-2 mesh
M2 = views.level_mesh(b, 2)
us = uvstretch.island_stretch(M2["V"], M2["F"], M2["attr"], b.parts)
ih = MS.iris_height(imgs[304]); ihm = MS.iris_height(mas[304])
rows = [("cream mean RGB (AD 223/196/157 +-4)", f"{m_me.get('cream_rgb')}", all(abs(x - y) <= 4 for x, y in zip(m_me.get('cream_rgb', [0, 0, 0]), (223, 196, 157)))),
        ("cream R - B (AD 62-70)", f"{m_me.get('cream_R_minus_B')}", 62 <= m_me.get("cream_R_minus_B", 0) <= 70),
        ("same cream measured on the master by this code", f"{m_ms.get('cream_rgb')}  R-B {m_ms.get('cream_R_minus_B')}", None),
        ("body L* p10/p50/p90 (this code; master by this code: " + str(m_ms.get('body_L_p10_50_90')) + ")", f"{m_me.get('body_L_p10_50_90')}", None),
        ("orange iris pixels: build / master (this code)", f"{m_me['orange_px']} / {m_ms['orange_px']}", None),
        ("orange extent, rows x cols (the iris height at 304; AD: orange over >= 85 % of the iris height)", f"{ih} / master {ihm}", None),
        ("partial-alpha pixels (shadow), AD <= 1500", f"{m_me['partial_alpha_px']}", m_me["partial_alpha_px"] <= 1500),
        ("outline diff, rest vs blink peak at 304 (px)", f"{diffs[304]}", diffs[304] == 0),
        ("outline diff, rest vs blink peak at 96 (px)", f"{diffs[96]}", diffs[96] == 0)]
for k, v in us.items():
    rows.append((f"UV island stretch {k} (median / p95 / max; spec <= 1.3)", f"{v['median']:.2f} / {v['p95']:.2f} / {v['max']:.1f}", v["p95"] <= 1.3))
tbl = SL.table([(r[0], r[1], "" if r[2] is None else SL.status(r[2])) for r in rows], ["Test", "Measured", ""])
def px(f, w, cap, bg="#999"):
    return f"<div class='cell'><div class='cap'>{cap}</div><img src='{f}' width='{w}' style='image-rendering:pixelated;background:{bg}'></div>"
M = "file:///home/mb/mb/mp/art/station-masters/pods/adult/mibi-adult-S01-%s.png"
cmp_ = ("<div class='row'>" + px(M % "304x312", 304, "master 304") + px("c6/skin-304.png", 304, "this build 304") + px(M % "96x88", 384, "master 96 (4x)") + px("c6/skin-96.png", 384, "this build 96 (4x)") + px(M % "48x48", 288, "master 48 (6x)") + px("c6/skin-48.png", 288, "this build 48 (6x)") + "</div>")
face = "<div class='row'>" + "".join(px(f"c6/face-{f}.png", 330, f"eyes {f} (3x)") for f in ("open", "half", "closed")) + px("c6/front.png", 304, "front view, rest") + "</div>"
body = ("<h1>Chunk 6: skin and face</h1><p>Zones are soft masks from (part, s, around), the head frame and the bead tag (bib on the belly side of the torso and under the mouth line, cream beads, olive crown, dark lobe and nose). Velvet: roughness 0.66, rim sheen 0.30, a noise grain bump. "
        "Pigment gains were tuned so the lit cream reads near the AD's numbers (three iterations). The eyes and the smile are thin decal meshes laid on the fitted surface by ray casting (open / half / closed, `content` mouth); a blink swaps decal frames and moves no body vertex. "
        "The decal meshes are a deviation from the spec's UV islands and atlas: no atlas texture is baked; UVs are analytic and measured below, not used by the renders. The key light is the house's from the upper left and front. Stand pose: head yaw 29.5, far fore leg capped at 0.36 H.</p>"
        "<h2>3/4 stand pose beside the master at 304 / 96 / 48</h2>" + cmp_ + "<h2>Face at 3x, blink frames, front view</h2>" + face + "<h2>Measures</h2>" + tbl)
p = os.path.join(OUT, "6-skin.html"); open(p, "w").write(SL.page("chunk 6", body)); SL.shoot(p, os.path.join(OUT, "6-skin.png"), 1980)
json.dump(dict(me=m_me, master=m_ms, diffs=diffs, uv=us), open(os.path.join(OUT, "6-measures.json"), "w"), indent=1)
print("ok", diffs)
