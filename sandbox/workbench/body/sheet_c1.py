"""Chunk 1 picture: 1-torso.png. 10-angle clay and wire, the section plots at the hip and shoulder stations, the quality table. Run (bpy venv): python sheet_c1.py OUTDIR"""
import sys, os, math, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views, mquality as Q, sheetlib as SL, subdiv as SD


def svg_section(ctx, b, x, label, size=340):
    T, H = ctx["T"], ctx["H"]
    s = float(T.s_of_x(x))
    pt, Tg, Nn, _ = T.path.at([s]); pt, Tg, Nn = pt[0], Tg[0], Nn[0]
    lat = np.cross(Nn, Tg)
    a = np.linspace(0, 1, 121)
    P = T.point(np.full_like(a, s), a)
    P0 = T.point(np.full_like(a, s), a, masses=False)
    sc = 150.0
    ox, oy = size / 2, size * 0.62
    X = lambda p: (ox + p[1] * sc, oy - (p[2] - 0.95) * sc)
    def poly(P, col, w=2, dash=""):
        pts = list(P) + [P[i] * np.array([1, -1, 1]) for i in range(len(P) - 1, -1, -1)]
        return f"<polyline fill='none' stroke='{col}' stroke-width='{w}' stroke-dasharray='{dash}' points='" + " ".join("%.1f,%.1f" % X(p) for p in pts) + "'/>"
    out = [f"<svg width='{size}' height='{size}' style='background:#fff;border:1px solid #bbb'>"]
    out.append(f"<line x1='0' y1='{oy + 0.95 * sc:.1f}' x2='{size}' y2='{oy + 0.95 * sc:.1f}' stroke='#999'/>")
    out.append(poly(P0, "#8a8a8a", 2, "5,4"))
    out.append(poly(P, "#1a56c4", 3))
    # the house's torso (the old loaf): chest + pelvis ellipsoid sections at x
    for nm, el, col in (("chest", H.chest, "#c47a1a"), ("pelvis", H.pelvis, "#8a1ac4")):
        c, r = el["c"], el["r"]
        u = (x - c[0]) / r[0]
        if abs(u) < 1:
            k = math.sqrt(1 - u * u)
            th = np.linspace(0, math.pi, 61)
            E = [np.array([x, r[1] * k * math.sin(t), c[2] + r[2] * k * math.cos(t)]) for t in th]
            out.append(poly(E, col, 1.5, "2,3"))
    # the cage ring (limit-fixed) of the nearest station
    V = b.cage.arr()
    rings = ctx["info"]["torso"]["rings"]
    xs = ctx["spec"]["parts"]["torso"]["rings_x"]
    i = int(np.argmin([abs(x - q) for q in xs]))
    R = V[[ctx["remap"][v] for v in rings[i]]]
    out.append(poly(R, "#d02020", 1.5))
    for p in R:
        cx, cy = X(p); out.append(f"<circle cx='{cx:.1f}' cy='{cy:.1f}' r='3.5' fill='#d02020'/>")
    for m in T.masses:
        q = T.point(s, m["a"])[0]; cx, cy = X(q)
        out.append(f"<circle cx='{cx:.1f}' cy='{cy:.1f}' r='5' fill='none' stroke='#0a0' stroke-width='2'/>")
    out.append(f"<text x='8' y='20' font-size='15' font-family='DejaVu Sans'>{label}: x = {x:+.2f}</text>")
    out.append("</svg>")
    return "".join(out)


if __name__ == "__main__":
    OUT = os.path.abspath(sys.argv[1])
    os.makedirs(OUT, exist_ok=True)
    b = build.make_body(upto="torso")
    ctx = b.ctx
    res = views.render_views(b, os.path.join(OUT, "c1"), tag="", pole_dots=True)
    V, F, attr, fp = Q.full_topology(b)
    spec = ctx["spec"]
    th = spec["mesh_quality"]
    ti = ctx["info"]["torso"]
    rings = [ti["endrings"]["rump"]] + ti["rings"] + [ti["endrings"]["brisket"]]
    Vh = b.cage.arr()
    val = Q.valence(F, len(V))
    import collections
    cv = collections.Counter(val.tolist())
    V2, F2, _, _, _ = SD.subdivide(*b.full()[:2], b.full()[4], b.full()[2], b.full()[3], levels=2)
    fl = Q.flips(V2, F2)
    man = Q.manifold(V, F)
    rows = [
        ("valence: only the 8 cap corners are not 4", f"valence-3: {cv[3]}, other non-4: {sum(v for k, v in cv.items() if k not in (3, 4))}", cv[3] == 8 and set(cv) <= {3, 4}),
        ("manifold, closed, consistently wound", json.dumps(man), man == dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0)),
        ("mirror plane |y| of centre-line verts", f"{Q.mirror_plane(V)['max_abs_y_on_plane']:.1e}, off-plane near: {Q.mirror_plane(V)['near_but_off']}", Q.mirror_plane(V)['near_but_off'] == 0),
        ("adjacent ring ratio (half-width, height) <= 1.5", f"{Q.ring_ratio(Vh, [[ctx['remap'][v] for v in r] for r in rings]):.2f}", Q.ring_ratio(Vh, [[ctx['remap'][v] for v in r] for r in rings]) <= 1.5),
        ("limit error <= 0.004 H (8 steps)", f"{ctx['log']['limit']['max_err']:.4f} in {ctx['log']['limit']['steps']} steps", ctx['log']['limit']['max_err'] <= 0.004),
        ("edge-length ratio per part <= 2.0 (2.5 at the face and paws)", f"{Q.edge_ratio(V, F, fp, 0):.2f}", Q.edge_ratio(V, F, fp, 0) <= 2.0),
        ("neighbour face area ratio <= 2.5", f"{Q.area_ratio(V, F):.2f}", Q.area_ratio(V, F) <= 2.5),
        ("quad non-planarity <= 0.1 of the mean edge", f"{Q.nonplanarity(V, F):.2f}", Q.nonplanarity(V, F) <= 0.1),
        ("level-2 surface: no folds (adjacent normals' dot > -0.2), volume > 0", f"min dot {fl['min_adjacent_normal_dot']:.2f}, vol {fl['volume']:.2f}", fl["min_adjacent_normal_dot"] > -0.2 and fl["volume"] > 0),
    ]
    tbl = SL.table([(r[0], r[1], SL.status(r[2])) for r in rows], ["Test (anatomy-lessons s3.4)", "Measured", ""])
    names = [v[0] for v in views.VIEWS]
    def row(prefix, scale):
        return "<div class='grid' style='grid-template-columns:repeat(5,%dpx)'>" % (380 * scale) + "".join(
            f"<div class='cell'><img src='c1/{prefix}-{n}.png' width='{380 * scale}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
    secs = "<div class='row'>" + svg_section(ctx, b, spec["parts"]["torso"]["rings_x"][1], "hip station") + svg_section(ctx, b, spec["parts"]["torso"]["rings_x"][7], "shoulder station") + "<div style='max-width:560px'><p>Sections at the hip and shoulder stations. Blue: the analytic section with the masses. Grey dashed: the egg alone. Red: the limit-fixed cage ring (dots = its vertices). Orange and purple dashed: the house SDF's chest and pelvis ellipsoids at the same x (the old loaf). Green circles: the mass targets.</p></div></div>"
    body = f"<h1>Chunk 1: the torso loft (one cage root, no limbs or head yet)</h1><p>Clay: level-2 Catmull-Clark of the mirrored cage, Cycles, the house frame, ortho at the 304 scale (95 px per H), elevation 15 degrees. Wire: the level-0 cage over it (front faces only), valence-5 dots red, valence-3 green. The torso sections come from the spec's egg stations; masses are widened (rho 0.66-0.68, da 0.40) so the 9-column cage can carry them.</p><h2>Clay, 10 views</h2>{row('clay', 1)}<h2>Wireframe, 10 views</h2>{row('wire', 1) if False else ''}"
    wire = "<div class='grid' style='grid-template-columns:repeat(5,380px)'>" + "".join(f"<div class='cell'><img src='c1/wire-{n}.png' width='380'><div class='cap'>{n}</div></div>" for n in names) + "</div>"
    html = SL.page("chunk 1", body + wire + "<h2>Sections</h2>" + secs + "<h2>Mesh quality</h2>" + tbl)
    p = os.path.join(OUT, "1-torso.html")
    open(p, "w").write(html)
    SL.shoot(p, os.path.join(OUT, "1-torso.png"), 1960)
    print("ok")
