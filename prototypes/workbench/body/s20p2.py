"""Pass 2 measurements and the sheet builder for the S20 pass-2 steps. Under the bpy venv.
Every step's sheet shows the 10-angle turnaround of the type specimen (or the widest individual) in clay, wire and the Normal view, the joint close-ups in the Normal view (leg, arm, ear, tail root, nose, lantern), the house view at 304 / 96 / 48, and the step's own numbers.
Pictures go to OUT/<step>/ beside OUT/<step>.html and .png (HTML with real text; labels >= 14 px)."""
import os, sys, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import subdiv as SD, s20normals as NM, s20tex as TX, nview, views, bpyio as B, sheetlib as SL, s20sil as SL_, s20indiv as IN, s20balance as BAL

OUT = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build/pass2"
VIEWS10 = views.VIEWS


def level_arrays(b, level=2):
    Vf, Ff, attr, fp, cr, mir = b.full()
    V, F, _, at, fp2 = SD.subdivide(Vf, Ff, cr, attr, fp, levels=level)
    F = np.array(F, int)
    return V, F, at, fp2


def counts(b):
    Vf, Ff, attr, fp, cr, mir = b.full()
    out = dict(cage_half=len(b.cage.V), cage_full=len(Vf))
    for L in (1, 2, 3):
        V, F, _, _, _ = SD.subdivide(Vf, Ff, cr, attr, fp, levels=L)
        out[f"L{L}"] = len(V)
    return out


def normal_report(b, top=6):
    V, F, at, fp2 = level_arrays(b, 2)
    names = {v: k for k, v in b.parts.items()}
    part = IN.part_of(b, F, fp2, len(V))
    Z = NM.junction_zone(b, V)
    rep, m = NM.report(V, F, tag=at[:, 3], part=part, part_names=names, top=top, s=at[:, 1], s_trunk=None, zone=Z)
    # edges the gradient test reads, with the micro-edges (< 0.01 H) left out: their vertex normals are noise-limited
    gk = (~m["crease"]) & m["along"] & Z[m["E"][:, 0]] & Z[m["E"][:, 1]] & (m["len"] >= 0.01)
    rep["grad_max_ge_0p01"] = float(m["grad"][gk].max()) if gk.any() else 0.0
    rep["grad_bad_ge_0p01"] = int((m["grad"][gk] > NM.GRAD_MAX).sum())
    rep["grad_edges_ge_0p01"] = int(gk.sum())
    return rep


def turnaround_images(b, sub, mesh=None, level=2, width=380, height=520, pph=150.0, centre=(-0.2, 0.0, 1.15), normal=True, clay=True):
    """clay + wire (Blender) and the Normal view (numpy) for the 10 views; returns the view names."""
    os.makedirs(sub, exist_ok=True)
    if clay:
        views.render_views(b, sub, width=width, height=height, pph=pph, centre=centre, level=level, mesh=mesh, samples=24)
    if normal:
        V, F, at, fp2 = level_arrays(b, level)
        vn = NM.vertex_normals(V, F)
        for name, az, el in VIEWS10:
            img, zb, px, dep = nview.render(V, F, vn, az, el, centre, pph, width, height)
            B.write_png(os.path.join(sub, f"normal-{name}.png"), img)
    return [v[0] for v in VIEWS10]


JOINTS = [("leg (side)", 90, 0, (0.0, 0.4, 0.45), 230), ("leg (front 3/4)", 25, 8, (0.1, 0.3, 0.5), 230), ("arm (front)", 0, 5, (0.2, 0.5, 0.95), 230), ("arm (side)", 90, 5, (0.2, 0.5, 0.95), 230),
          ("ear root (3/4)", 40, 15, (-0.2, 0.3, 1.95), 230), ("ear root (back)", 180, 12, (-0.2, 0.3, 1.95), 230), ("tail root (side)", 90, 8, (-0.75, 0, 0.8), 230), ("tail root (back)", 180, 10, (-0.75, 0, 0.8), 230),
          ("seat from below", 150, -35, (-0.6, 0, 0.45), 230), ("nose (front)", 0, 5, (0.5, 0, 1.52), 330), ("nose (side)", 90, 5, (0.5, 0, 1.52), 330), ("lantern (side)", 90, 5, None, 260)]


def joint_images(b, sub, level=2, size=400):
    os.makedirs(sub, exist_ok=True)
    V, F, at, fp2 = level_arrays(b, level)
    vn = NM.vertex_normals(V, F)
    G = b.ctx["T"]
    lan = G.path.at([min(0.12, G.L)])[0][0]
    names = []
    for i, (nm, az, el, cen, pp) in enumerate(JOINTS):
        cen = lan if cen is None else cen
        img = nview.render(V, F, vn, az, el, cen, pp, size, size)[0]
        p = os.path.join(sub, f"joint-{i}.png")
        B.write_png(p, img)
        names.append((nm, f"joint-{i}.png"))
    return names


def posed(M, b, R, pose):
    """The shipped mesh in a pose (linear blend skinning of the welded vertices, normals recomputed on the welded surface)."""
    import gltf_out
    W = R.weights(M["Vw"], M["attr"], M["part"])
    Vp = R.skin(M["Vw"], W, pose)
    Nw = gltf_out.vertex_normals(Vp, M["Fw"])
    return dict(M, V=Vp[M["vid"]], N=Nw[M["vid"]])


def house_images(b, tex, sub, genome, paths, R=None):
    import s20render as RN
    M = TX.render_mesh(b)
    if R is not None:
        M = posed(M, b, R, R.stand_pose())                              # the stand pose: the tail yawed toward the camera, as the house view shows it
    out = {}
    for size, (w, h, ppH) in SL_.SIZES.items():
        a, cam = RN.render_tex(M, paths, genome, os.path.join(sub, f"house-{size}.png"), w, h, ppH, az=32.0, el=10.0, centre=(-0.35, 0, 1.3 if size != 48 else 1.25), samples=48)
        RN.to_png(a, os.path.join(sub, f"house-{size}.png"))
        out[size] = f"house-{size}.png"
    for az in (0, 90, 135, 180):
        a, cam = RN.render_tex(M, paths, genome, os.path.join(sub, f"coat-az{az:03d}.png"), 380, 440, 130.0, az=float(az), el=8.0, centre=(-0.3, 0, 1.15), samples=32)
        RN.to_png(a, os.path.join(sub, f"coat-az{az:03d}.png"))
    return M


def grid(prefix, sub, names, w=380, cols=5):
    return f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(f"<div class='cell'><img src='{sub}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"


def write_tex(tex, d):
    os.makedirs(d, exist_ok=True)
    paths = {}
    for k in ("col", "emit", "rough"):
        p = os.path.abspath(os.path.join(d, k + ".png"))
        TX.write_png(p, tex[k] * 255.0 if k == "rough" else tex[k])
        paths[k] = p
    return paths


def build_sheet(step, title, notes, rows, ind=1, extra_html="", wire=True, levels=2, joints=True, house=True, tex_dir=None, b=None, c=None, R=None, tex=None):
    t0 = time.time()
    import s20pipe as PP
    if b is None:
        c, b, R = IN.make(ind)
    sub = os.path.join(OUT, step)
    os.makedirs(sub, exist_ok=True)
    if tex is None:
        tex = PP.make_tex(b, c["coat"])
    paths = write_tex(tex, os.path.join(sub, "tex"))
    names = turnaround_images(b, sub, level=levels)
    ji = joint_images(b, sub) if joints else []
    house_html = ""
    if house:
        house_images(b, tex, sub, c["coat"], paths, R)
        house_html = ("<h2>The coat on its texture in the stand pose: the house view at 304 / 96 / 48 and four angles (the shipped level-2 mesh)</h2><div class='row'>"
                      + f"<div class='cell'><div class='cap'>304</div><img src='{step}/house-304.png' width='304'></div>"
                      + f"<div class='cell'><div class='cap'>96 (4x)</div><img src='{step}/house-96.png' width='384' style='image-rendering:pixelated'></div>"
                      + f"<div class='cell'><div class='cap'>48 (6x)</div><img src='{step}/house-48.png' width='288' style='image-rendering:pixelated'></div>"
                      + "".join(f"<div class='cell'><div class='cap'>az {az}</div><img src='{step}/coat-az{az:03d}.png' width='300'></div>" for az in (0, 90, 135, 180)) + "</div>")
    joint_html = ("<h2>The joints in the Normal view (view-space normal as colour, as the viewer's Normal mode): a hard band would show as a sharp colour edge</h2><div class='row' style='flex-wrap:wrap'>"
                  + "".join(f"<div class='cell'><div class='cap'>{n}</div><img src='{step}/{f}' width='300'></div>" for n, f in ji) + "</div>") if joints else ""
    body = (f"<h1>S20 Tuliko, pass 2, {title}</h1>" + notes + SL.table([(a, b_, "" if c_ is None else SL.status(c_)) for a, b_, c_ in rows], ["Measure", "Value", ""]) + extra_html + house_html + joint_html
            + "<h2>Normal view, 10 angles</h2>" + grid("normal", step, names)
            + "<h2>Clay, 10 angles</h2>" + grid("clay", step, names)
            + ("<h2>Wireframe (the cage), 10 angles</h2>" + grid("wire", step, names) if wire else ""))
    p = os.path.join(OUT, f"{step}.html")
    open(p, "w").write(SL.page(f"S20 pass 2 {title}", body))
    SL.shoot(p, os.path.join(OUT, f"{step}.png"), 1960)
    return dict(seconds=time.time() - t0, html=p)


def variety_block(step, srcdir, n=12, grey=False):
    """The twelve individuals (renders made by run_s20_ind.py) as an HTML block: 304 stand view, 96 view (2x, pixel-exact), the back view, and a line of their genes; copies the pictures beside the sheet."""
    import shutil
    d = os.path.join(OUT, step, "ind")
    os.makedirs(d, exist_ok=True)
    cells = []
    for i in range(1, n + 1):
        sd = os.path.join(srcdir, f"ind{i:02d}")
        for nm in ("a304", "a96", "back", "front"):
            shutil.copy(os.path.join(sd, nm + ".png"), os.path.join(d, f"{i:02d}-{nm}.png"))
        c = json.load(open(os.path.join(sd, "creature.json")))["creature"]
        s, k = c["shape"], c["coat"]
        h = (k["hue"] + 360.0 * k["hue_shift"]) % 360.0
        txt = f"hue {h:.0f}, {s['ear']} ear, {s['tip']} tip, curl {s['curl']:+.2f}, tail x{s['tailLen']:.2f}, {k['layout']}"
        style = "filter:grayscale(1)" if grey else ""
        cells.append(f"<div class='cell'><div class='cap'><b>{i}</b> {txt}</div><img src='{step}/ind/{i:02d}-a304.png' width='304'><br>"
                     f"<img src='{step}/ind/{i:02d}-a96.png' width='192' style='image-rendering:pixelated;{style}'> <img src='{step}/ind/{i:02d}-back.png' width='190'></div>")
    return "<h2>The twelve in the stand pose (304 px; the 96 px render at 2x; the back view az 160)</h2><div class='grid' style='grid-template-columns:repeat(4,320px)'>" + "".join(cells) + "</div>"


def stand_back_views(b, R, sub, azs=(135, 180, 225), centre=(-0.4, 0.0, 1.1), width=380, height=460, pph=140.0):
    """The stand pose (the tail yawed toward the camera's side, as the house view shows it) in clay and in the Normal view from behind: the rest pose is symmetric, so a tail from behind reads as a stub there; the stand pose shows its curve."""
    import gltf_out
    os.makedirs(sub, exist_ok=True)
    V, F, at, fp2 = level_arrays(b, 2)
    part = IN.part_of(b, F, fp2, len(V))
    W = R.weights(V, at, part)
    Vp = R.skin(V, W, R.stand_pose())
    vn = NM.vertex_normals(Vp, F)
    vs = [(f"az{a:03d}", float(a), 12.0) for a in azs]
    mesh = dict(V=Vp, F=[tuple(f) for f in F], V0=Vp, F0=[tuple(f) for f in F])
    views.render_views(b, sub, views=vs, tag="stand-", width=width, height=height, pph=pph, centre=centre, wire=False, mesh=mesh, samples=24)
    for name, az, el in vs:
        img = nview.render(Vp, F, vn, az, el, centre, pph, width, height)[0]
        B.write_png(os.path.join(sub, f"stand-normal-{name}.png"), img)
    return [v[0] for v in vs]


def ear_join_report(b, name="ear.L"):
    """The join rule's numbers for a tube socket: for a SOFT join the footprint (the socket loop's width across the ear) over the ear's mid width (needs 1.5-1.8), the narrowest ring between the loop and the middle of the ear over the mid width (never pinches below it), and the normal test inside the root zone;
    for a HARD join the depth the shell's base is buried inside the parent (needs 0.03 H) and that every vertex is a tagged crease."""
    ctx = b.ctx
    rec = ctx["info"]["tubes"][name]
    Vc = b.cage.arr(); m = ctx["remap"]
    G = ctx["T"]
    out = dict(join=rec.get("join", "soft"))
    mid = rec["rings"][len(rec["rings"]) // 2]
    _, _, vt = np.linalg.svd(Vc[mid] - Vc[mid].mean(0))
    wax = vt[0]                                                           # the ear's width axis: the major axis of its middle ring
    mid_w = float(np.ptp((Vc[mid] - Vc[mid].mean(0)) @ wax))
    if out["join"] == "soft":
        loop = [m[v] for v in rec["loop"] if v in m]
        N0 = wax
        foot = float(np.ptp((Vc[loop] - Vc[loop].mean(0)) @ N0))
        bands = [[m[v] for v in tr if v in m] for tr in (rec["transition"] if rec["transition"] and isinstance(rec["transition"][0], (list, tuple)) else [rec["transition"]])]
        chain = [loop] + bands + [list(rec["rings"][k]) for k in range(len(rec["rings"]) // 2 + 1)]
        ws = [float(np.ptp((Vc[ids] - Vc[ids].mean(0)) @ N0)) for ids in chain if len(ids)]
        out.update(footprint=foot, mid_width=mid_w, ratio=foot / mid_w, narrowest_over_mid=min(ws) / mid_w, loops=len(bands))
    else:
        base = rec["rings"][0]
        # buried depth: the true distance of the shell's base ring below the parent's skin (the nearest point of the level-2 trunk surface, every quad sampled 4 x 4)
        Vt, Ft, att, fpt = level_arrays(b, 2)
        part = IN.part_of(b, Ft, fpt, len(Vt))
        ftor = np.array([f for f in Ft if (part[f] == b.parts["torso"]).all()])
        q = Vt[ftor]                                                          # (nf, 4, 3)
        uu = np.linspace(0, 1, 5)
        S = np.concatenate([((1 - u) * ((1 - v) * q[:, 0] + v * q[:, 3]) + u * ((1 - v) * q[:, 1] + v * q[:, 2])) for u in uu for v in uu])
        pts = Vt[[m[v] for v in base if v in m]]                            # the base ring's own vertices on the level-2 surface (the subdivision keeps the cage's vertex numbers)
        dist = np.sqrt(((pts[:, None, :] - S[None]) ** 2).sum(2).min(1))
        out["sink"] = float(rec.get("sink", 0.0))
        out.update(buried=float(dist.min()), tagged=bool(all(b.tag.get(m[v], 0) >= 1.0 for r in rec["rings"] for v in r if v in m)))
    return out
