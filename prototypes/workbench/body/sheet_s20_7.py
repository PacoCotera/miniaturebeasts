"""S20 chunk 7 picture: 7-variety. Twelve individuals (the type, then ear families x tip families x palettes with draws in the bands) at 96 and 304 in the stand pose with their genes, the 10-angle of the widest one; creature.json of each beside it.
Run (bpy venv): python sheet_s20_7.py [OUTDIR]"""
import sys, os, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20indiv as IN, s20render as RN, sheetlib as SL

OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build"
PIC = os.path.join(OUT, "c7")
CRE = os.path.join(OUT, "creatures")
os.makedirs(PIC, exist_ok=True); os.makedirs(CRE, exist_ok=True)
t0 = time.time()
rows, cells, widths = [], [], []
items = []
for i in range(1, 13):
    c, b, R = IN.make(i)
    items.append((i, c, b, R))
    open(os.path.join(CRE, f"{i:02d}.json"), "w").write(GN.dumps(c))
    pose = R.stand_pose()
    g = c["coat"]
    for size, (w_, h_, ppH) in ((304, (304, 312, 95.0)), (96, (96, 88, 30.0))):
        P = RN.prepare(b, g, level=4, pose=pose, rig=R)
        p = os.path.join(PIC, f"ind{i:02d}-{size}.png")
        a, cam = RN.render(P, g, p, size, az=32.0, el=10.0, centre=(-0.35, 0, 1.3), samples=40 if size == 304 else 48)
        RN.to_png(a, p)
    V = P["V"]
    widths.append(float(V[:, 1].max() - V[:, 1].min()))
    s, cc = c["shape"], c["coat"]
    rows.append((i, GN.digest(c), f"{s['ear']} x{s['earLen']:.2f} g{s['earGirth']:.2f} splay {s['splay']:+.0f} droop {s['droop']:+.0f}", f"{s['tip']} x{s['tipSize']:.2f}, length x{s['tailLen']:.2f} girth x{s['tailGirth']:.2f} curl {s['curl']:+.2f} lift {s['lift']:+.0f}",
                 f"{cc['palette']} {cc['layout']} v{cc['coat_value']:.2f}", f"rd {cc['rd']}, mark {cc['mark']}{'/' + cc['mark_where'] if cc['mark'] != 'none' else ''}, brow {int(cc['brow'])}, freckles {cc['freckle_density']:.2f}, glow {cc['glow']:.2f}, bleed {cc['bleed']:.2f}",
                 f"body girth x{s['torsoGirth']:.2f} head x{s['headSize']:.2f} legs x{s['legLen']:.2f}", f"eyes x{cc['eye_size']:.2f}, blush {'on' if cc['blush'] else 'off'}"))
    print("individual", i, round(time.time() - t0), "s", flush=True)
cells = []
for (i, c, b, R), r in zip(items, rows):
    cells.append(f"<div class='cell'><div class='cap'><b>{i}</b> {r[1]}</div><img src='c7/ind{i:02d}-304.png' width='304'><br><img src='c7/ind{i:02d}-96.png' width='192' style='image-rendering:pixelated'><div class='cap'>{r[2]}<br>{r[3]}<br>{r[4]}</div></div>")
body = ["<h1>S20 Tuliko, chunk 7: genes and twelve individuals</h1>",
        "<p>Stand pose, house three-quarter view, 304 px and 96 px (shown 2x). No. 1 is the type specimen exactly (every factor 1, every offset 0; prick ears, lantern, dusk, plain). The rest vary the wide anchors (ears, tail, coat) across their bands and the tight ones (body, face) inside narrowed draws; ear families and palettes cycle, "
        "and the tip is the dominant lantern in most of them (9 of 12), with a tuft and a plain tip as rarer finds. The coat genes carry the variety: reaction-diffusion spots, labyrinth or rings, rosettes, bands, a heart or a star mark, a brow stripe, freckle density and glow, the lantern's bleed, a hue shift.</p>",
        "<div class='grid' style='grid-template-columns:repeat(4,320px)'>" + "".join(cells) + "</div>",
        "<h2>The genes of each individual (creature.json is in build/creatures/NN.json)</h2>" + SL.table([r for r in rows], ["#", "digest", "ears", "tail", "coat", "pattern genes", "body", "face"])]
# the widest individual from 10 angles
k = int(np.argmax(widths))
i, c, b, R = items[k]
pose = R.stand_pose()
cells2 = []
for name, az, el in [(f"az{a:03d}", float(a), 10.0) for a in range(0, 360, 45)] + [("top", 0.0, 89.0), ("bottom", 0.0, -89.0)]:
    P = RN.prepare(b, c["coat"], level=4, pose=pose, rig=R)
    p = os.path.join(PIC, f"wide-{name}.png")
    a, _ = RN.render(P, c["coat"], p, 304, az=az, el=el, centre=(-0.3, 0, 1.2), samples=32, wh=(300, 400), ppH=120.0 if el < 80 else 100.0)
    RN.to_png(a, p)
    cells2.append(f"<div class='cell'><img src='c7/wide-{name}.png' width='300'><div class='cap'>{name}</div></div>")
body.append(f"<h2>The widest individual (no. {i}: {rows[k][2]}), 10 angles</h2><div class='grid' style='grid-template-columns:repeat(5,300px)'>" + "".join(cells2) + "</div>")
open(os.path.join(OUT, "7-variety.html"), "w").write(SL.page("S20 chunk 7 variety", "".join(body)))
SL.shoot(os.path.join(OUT, "7-variety.html"), os.path.join(OUT, "7-variety.png"), 1360)
print("ok", round(time.time() - t0), "s")
