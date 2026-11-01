"""Round 5: the turnaround sheet (13-turnaround), the legs and mesh-quality sheet (14-legs-quality), loika/round5/report.json, the glb, and loika/index.html and viewer.html for round 5 (rounds 1 to 4 are kept).
python report5.py WORKDIR LOIKA_DIR CODE_COMMIT      (cad venv; WORKDIR from round5.sh)"""
import json, os, sys, hashlib, shutil, re
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "tools"))
from sheetlib import page, shot
from housefield import House
from PIL import Image
W, L, commit = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2]), sys.argv[3]
R5 = os.path.join(L, "round5"); IMG = os.path.join(R5, "img"); os.makedirs(IMG, exist_ok=True)
sha = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
GROUND = (0xD6, 0xCE, 0xBE, 255)
NAMES = [("az000", "front, azimuth 0"), ("az045", "front left, 45"), ("az090", "left side, 90"), ("az135", "back left, 135"), ("az180", "back, 180"), ("az225", "back right, 225"), ("az270", "right side, 270"), ("az315", "front right, 315"), ("top", "straight above"), ("bottom", "straight below")]
def comp(path):
    im = Image.open(path).convert("RGBA"); b = Image.new("RGBA", im.size, GROUND); b.alpha_composite(im); return b.convert("RGB")
ta = json.load(open(os.path.join(W, "ta", "turnaround.json")))
for n, _ in NAMES:
    comp(os.path.join(W, "ta", f"ta-{n}.png")).save(os.path.join(IMG, f"bl-{n}.png"))
    Image.open(os.path.join(W, "ta", f"tjs-{n}.png")).convert("RGB").save(os.path.join(IMG, f"tjs-{n}.png"))
for n in ("wire-left", "wire-right", "wire-front-low", "wire-below"):
    Image.open(os.path.join(W, "ta", f"tjs-{n}.png")).convert("RGB").save(os.path.join(IMG, f"{n}.png"))
OWN = "/home/mb/mb/iwq/results/T-20261101-mesh/loika/owner-angles"
for i, n in ((6, "6-legs-wire-side"), (7, "7-leg-twist-below"), (8, "8-leg-fold-paw")):
    im = Image.open(f"{OWN}/{n}.png").convert("RGB"); im.thumbnail((380, 300)); im.save(os.path.join(IMG, f"owner-{i}.png"))
cell = lambda s, cap: f"<div class='cell'><img src='img/{s}' style='image-rendering:auto'><div class='cap'>{cap}</div></div>"
VERDICT = {
 "az000": ("good", "Round head, eyes, cream bib and the two fore legs read cleanly; the cream lip under the nose is still a pale shelf and the nose is a dark mass."),
 "az045": ("good", "The best view: the far fore paw steps forward as a clean tube, the bib and chest are smooth, no seam where the legs meet the body."),
 "az090": ("good", "A clean silhouette: the head a round dome, the legs closed columns resting on the flank, the cream bib to the belly."),
 "az135": ("not good", "The head's back is a flat-backed dome with a ledge where it meets the shoulders (the house's skull is flat at the rear, the mesh follows it within 0.07 H), the centre leaf is a spike edge-on."),
 "az180": ("not good", "The head hangs over the body like a cap with a hard lip under it; the cream wraps up under the rump as a band (the house's cream field, baked as it is)."),
 "az225": ("not good", "The head's ledge at the nape shows again, a step down onto the shoulder."),
 "az270": ("good", "Right side: the far fore leg forward and the hind leg as a round mass; no ribbons, no cracks."),
 "az315": ("good", "Clean; the near-side bib edge and the leaf fan read well."),
 "top": ("fair", "The body is a smooth loaf with four paws; the head's top is a flat oval and the crown fan lies across the head as it should (the centre leaf leans back)."),
 "bottom": ("fair", "The cream belly is clean and the four paws touch it; the legs are four separate balls at the corners of the belly, no gaps to the belly now, but each leg is a ball resting on the body, not a continuation of it."),
}
rows = lambda pre: "<div class='row'>" + "".join(cell(f"{pre}-{n}.png", f"{lb}") for n, lb in NAMES[:5]) + "</div><div class='row' style='margin-top:10px'>" + "".join(cell(f"{pre}-{n}.png", f"{lb}") for n, lb in NAMES[5:]) + "</div>"
vt = "<table><tr><th>View</th><th>Read</th><th>Why</th></tr>" + "".join(f"<tr><td>{lb}</td><td class='{'ok' if v[0]=='good' else 'warn'}'>{v[0]}</td><td>{v[1]}</td></tr>" for (n, lb), v in ((nl, VERDICT[nl[0]]) for nl in NAMES)) + "</table>"
body = f"""<h1>Loika round 5: the turnaround (the creature at rest from every side)</h1>
<div class='sub'>8 azimuths 45 degrees apart at the sprite's elevation (8 degrees), straight above and straight below, at the 304 sprite's scale ({ta['s304']:.1f} px per H), the stand pose. Azimuth 0 is the front, 90 the left side. Every later round makes this sheet.</div>
<h2>Blender (Cycles, the house's light)</h2>{rows('bl')}
<h2>The glb in three.js (the viewer's light, perspective 28 degrees; above and below have the head toward the left)</h2>{rows('tjs')}
<h2>Read view by view</h2>{vt}
<div class='sub' style='margin-top:8px'>Three.js shows the same shapes. Its cream edges are ragged at the muzzle and the bib (vertex paint at level 3), and the viewer's flat light hides the form a little more than Blender's key.</div>"""
page("Loika round 5, the turnaround", body, os.path.join(R5, "13-turnaround.html")); shot(os.path.join(R5, "13-turnaround.html"), os.path.join(R5, "13-turnaround.png"), 2200)
# ---- legs and mesh quality
H = House("S01"); S = 230.0; X0, Z0 = -1.75, 1.45
def ell(c, rx, rz, col, dash=""):
    return f"<ellipse cx='{(c[0]-X0)*S:.1f}' cy='{(Z0-c[2])*S:.1f}' rx='{rx*S:.1f}' ry='{rz*S:.1f}' fill='none' stroke='{col}' stroke-width='1.5' {dash}/>"
svg = f"<svg width='{int(2.7*S)}' height='{int(1.5*S)}' style='background:#fff;border:1px solid #ccc' font-family='DejaVu Sans' font-size='14'><line x1='0' x2='{int(2.7*S)}' y1='{Z0*S:.0f}' y2='{Z0*S:.0f}' stroke='#888'/>"
for lg, col in [(l, c) for l, c in zip([q for q in H.legs if q['name'] in ('fore.L', 'hind.L', 'fore.R')], ('#2060c0', '#a04020', '#208040'))]:
    t, e, a, m, er = lg["top"], lg["el_c"], lg["ank"], lg["mass"], lg["el_r"]
    svg += ell(lg["mass_c"], m[0], m[2], col, "stroke-dasharray='4 3'") + ell(e, er[0], er[2], col, "stroke-dasharray='2 3'") + ell(lg["paw_c"], H.pawR[0], H.pawR[2], col)
    svg += f"<polyline points='{(t[0]-X0)*S:.1f},{(Z0-t[2])*S:.1f} {(e[0]-X0)*S:.1f},{(Z0-e[2])*S:.1f} {(a[0]-X0)*S:.1f},{(Z0-a[2])*S:.1f}' fill='none' stroke='{col}' stroke-width='3'/>"
    for p, lab in ((t, "top"), (e, "elbow"), (a, "ankle")):
        svg += f"<circle cx='{(p[0]-X0)*S:.1f}' cy='{(Z0-p[2])*S:.1f}' r='5' fill='{col}'/><text x='{(p[0]-X0)*S+7:.0f}' y='{(Z0-p[2])*S-6:.0f}' fill='{col}'>{lg['name']} {lab}</text>"
svg += "</svg>"
q = ta["quality"]
qt = "<table><tr><th>Part</th><th>Visible vertices</th><th>Valence 3 / 5 / over 5</th><th>Longest / shortest edge</th><th>Edge 95th / 5th percentile</th><th>Flipped faces</th><th>Folded edges</th></tr>" + "".join(
    f"<tr><td>{k}</td><td>{v['verts']}</td><td>{v['valence'].get('3', 0)} / {v['valence'].get('5', 0)} / {sum(c for kk, c in v['valence'].items() if int(kk) > 5)}</td><td>{v['edge_ratio']:.1f}</td><td class='{'ok' if v['edge_p95_p5'] < 3 else 'warn'}'>{v['edge_p95_p5']:.2f}</td><td>{v['flipped_faces']}</td><td>{v['folded_edges']}</td></tr>" for k, v in q.items() if k != "_all") + "</table>"
body = f"""<h1>Loika round 5: the legs and the mesh quality</h1>
<div class='sub'>The owner's wireframe screenshots of round 4 (left) show the legs folded into flat ribbons: join B bridged an oval torso port to a round leg ring through three straight-line loops. Round 5 drops the bridge: each leg is one closed shape, its own rings cut across its own axis, resting in the torso (the chick and axolotl references). The far fore leg is shifted forward as a whole, so nothing is stretched.</div>
<h2>Round 4 (the owner's wireframe views) and round 5 (parts in colours with the wireframe over them)</h2>
<div class='row'>{cell('owner-6.png', 'Round 4: the leg is a sheet behind a fold')}{cell('owner-7.png', 'Round 4: the leg twists like a ribbon')}{cell('owner-8.png', 'Round 4: the leg collapses into a fold at the paw')}</div>
<div class='row' style='margin-top:10px'>{cell('wire-left.png', 'Round 5, left side: near legs')}{cell('wire-right.png', 'Round 5, right side: the far fore leg forward')}</div>
<div class='row' style='margin-top:10px'>{cell('wire-front-low.png', 'Round 5, front low')}{cell('wire-below.png', 'Round 5, from below (head toward the right)')}</div>
<h2>The leg paths, joints and radii (side view, left legs and the far fore leg; solid: paw, dashed: shoulder or thigh mass and elbow)</h2>{svg}
<div class='sub'>The numbers are the house's, by name, from house-1.json: <code>top</code> (the attachment inside the body), <code>elbow</code> (centre and radii), <code>ankle</code>, <code>r</code> (the cone's radii top and ankle), <code>mass</code> (the shoulder or thigh ellipsoid), the paw's radii. The mesh's rings follow the leg's axis from top to ankle at equal heights; its bones sit on top, elbow and ankle. The house gives a straight tapered cone with two blobs rather than a bent path, so there is no bend at the elbow in the field; the elbow is the blob behind the axis. No anatomy-lessons.md was available.</div>
<h2>Mesh quality (baked level 3, visible surface only, by cage part)</h2>{qt}
<div class='sub'>Poles are the cage's own corner vertices (valence 3 and 5); no vertex has more than 5 edges. Targets met: limbs' edge 95th to 5th percentile under 3, no flips or folds outside the eye sockets. Not met: the strict longest to shortest edge (the target 3) is {min(q[k]['edge_ratio'] for k in q if k.startswith('leg.')):.1f} to {max(q[k]['edge_ratio'] for k in q if k.startswith('leg.')):.1f} on the legs, {min(q[k]['edge_ratio'] for k in q if k.startswith('paw.')):.1f} to {max(q[k]['edge_ratio'] for k in q if k.startswith('paw.')):.1f} on the paws, {q['torso']['edge_ratio']:.1f} on the torso and {q['head']['edge_ratio']:.0f} on the head (the eye sockets' tiny cut edges); the torso's end caps and the head's muzzle are looser (95th to 5th: {q['torso']['edge_p95_p5']:.1f} and {q['head']['edge_p95_p5']:.1f}). Numbers here are at level 4, the sprites' level; the test runs level 3.</div>"""
page("Loika round 5, the legs and mesh quality", body, os.path.join(R5, "14-legs-quality.html")); shot(os.path.join(R5, "14-legs-quality.html"), os.path.join(R5, "14-legs-quality.png"), 1500)
# ---- glb, viewer, report, index
if not os.path.exists(os.path.join(L, "index-round4.html")):
    t = open(os.path.join(L, "index.html")).read().replace("href='viewer.html'", "href='viewer-round4.html'")
    open(os.path.join(L, "index-round4.html"), "w").write(t); shutil.move(os.path.join(L, "viewer.html"), os.path.join(L, "viewer-round4.html"))
shutil.copy(os.path.join(W, "s6", "viewer.html"), os.path.join(L, "viewer.html")); shutil.copy(os.path.join(W, "s6", "loika.glb"), os.path.join(R5, "loika.glb"))
s5 = json.load(open(os.path.join(W, "s5", "measures.json"))); s6 = json.load(open(os.path.join(W, "s6", "rig-report.json")))
tm = lambda f: float(re.search(r"([\d.]+) s", open(os.path.join(W, f)).read()).group(1))
rep = dict(mesh_code_commit=commit, blender="5.2.3 LTS (bpy module)", light_measures=s5["light"], rig=s6, quality=q, turnaround={k: v for k, v in ta.items() if k not in ("quality",)},
           hashes=dict(sprites={k: v["sha"] for k, v in s5["sprites"].items()}, glb=sha(os.path.join(R5, "loika.glb"))),
           timings_s=dict(whole_build_3_sprites_3_crops=tm("t-stop5.txt"), rig_clips_glb_level3=tm("t-stop6.txt"), blink=tm("t-blink.txt"), turnaround_10_views_and_quality=tm("t-turn.txt")))
json.dump(rep, open(os.path.join(R5, "report.json"), "w"), indent=1, default=float)
rws = [("13-turnaround", "Round 5, the turnaround", "8 azimuths, above and below, in Blender and in three.js, read view by view"), ("14-legs-quality", "Round 5, the legs and the mesh quality", "the owner's round 4 wireframes beside round 5's, the leg paths with joints and radii, the quality table")]
li = "".join(f"<tr><td>{s}</td><td><a href='round5/{n}.html'>{n}</a> (<a href='round5/{n}.png'>image</a>)</td><td>{d}</td></tr>" for n, s, d in rws)
html = f"""<!doctype html><html><head><meta charset='utf-8'><title>Loika, the mesh, round 5</title><style>body{{font-family:'DejaVu Sans',sans-serif;font-size:16px;margin:24px;background:#f4f3f0;color:#222}}td,th{{border:1px solid #ccc;padding:5px 10px;text-align:left}}table{{border-collapse:collapse;background:#fff}}a{{color:#1c5fb8}}h1{{font-size:24px}}</style></head><body>
<h1>Loika whole, in the Blender pipeline: round 5</h1><p>Round 5 follows the owner's turn of the glb: the right paws' toes were bound to the wrong bones (fixed), the legs are clean closed shapes (no bridge ribbons), the build has a parts view, a turnaround and mesh-quality numbers. Code on build/mesh-creature in <code>prototypes/workbench/mesh/</code> ({commit}).</p>
<p><a href='viewer.html'><b>viewer.html</b></a>: the round 5 glb in three.js (orbit; breathe, blink, walk; <b>normal / parts in colours / wireframe over parts</b>). <a href='round5/loika.glb'>round5/loika.glb</a> ({os.path.getsize(os.path.join(R5, 'loika.glb')) // 1024} KB; the body carries <code>_PART</code>, names in <code>asset.extras.parts</code>). <a href='round5/report.json'>round5/report.json</a>.</p>
<table><tr><th>Sheet</th><th>Page</th><th>What it shows</th></tr>{li}</table>
<p><b>Rounds 1 to 4 are kept:</b> round 4: <a href='index-round4.html'>index-round4.html</a>, <a href='viewer-round4.html'>viewer-round4.html</a>, <a href='round4/loika.glb'>round4/loika.glb</a>. Round 3: <a href='index-round3.html'>index-round3.html</a>, <a href='viewer-round3.html'>viewer-round3.html</a>, <a href='round3/loika.glb'>round3/loika.glb</a>. Round 2: <a href='index-round2.html'>index-round2.html</a>, <a href='viewer-round2.html'>viewer-round2.html</a>, <a href='round2/loika.glb'>round2/loika.glb</a>. Round 1: <a href='index-round1.html'>index-round1.html</a>, <a href='viewer-round1.html'>viewer-round1.html</a>, <a href='loika.glb'>loika.glb</a>.</p></body></html>"""
open(os.path.join(L, "index.html"), "w").write(html); print("ok")
