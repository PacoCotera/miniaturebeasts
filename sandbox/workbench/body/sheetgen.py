"""Shared sheet pieces: the 10-angle turnaround (clay + wire), the quality table, pole listing. Run under the bpy venv."""
import os, sys, json, collections
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import views, mquality as Q, sheetlib as SL, subdiv as SD


def quality_rows(b, extra=()):
    V, F, attr, fp = Q.full_topology(b)
    ctx, spec = b.ctx, b.ctx["spec"]
    th = spec["mesh_quality"]
    pn = {v: k for k, v in b.parts.items()}
    cv = collections.Counter(Q.valence(F, len(V)).tolist())
    V2, F2, _, _, _ = SD.subdivide(*b.full()[:2], b.full()[4], b.full()[2], b.full()[3], levels=2)
    fl = Q.flips(V2, F2)
    man = Q.manifold(V, F)
    mp = Q.mirror_plane(V)
    rows = [("valence census (full mesh)", json.dumps(dict(sorted(cv.items()))), None),
            ("manifold, closed, consistently wound", json.dumps(man), man == dict(non_manifold_edges=0, loose_verts=0, inconsistent_winding=0)),
            ("mirror plane: |y| of centre-line verts, off-plane near verts", f"{mp['max_abs_y_on_plane']:.1e}, {mp['near_but_off']}", mp['near_but_off'] == 0),
            ("limit error <= 0.004 H", f"{ctx['log']['limit']['max_err']:.4f} in {ctx['log']['limit']['steps']} steps", ctx['log']['limit']['max_err'] <= 0.004)]
    for part, nm in sorted(pn.items()):
        er = Q.edge_ratio(V, F, fp, part)
        lim = th["edge_ratio_max"] if nm in ("torso",) else th["edge_ratio_face_max"]
        rows.append((f"edge-length ratio, {nm} (<= {lim})", f"{er:.2f}", er <= lim))
    ar, npl = Q.area_ratio(V, F), Q.nonplanarity(V, F)
    rows += [(f"neighbour face area ratio (<= {th['area_ratio_max']})", f"{ar:.2f}", ar <= th["area_ratio_max"]),
             (f"quad non-planarity (<= {th['nonplanar_max']})", f"{npl:.2f}", npl <= th["nonplanar_max"]),
             ("level-2 surface: adjacent-normal dot > -0.2, volume > 0", f"min dot {fl['min_adjacent_normal_dot']:.2f}, vol {fl['volume']:.2f}", fl['min_adjacent_normal_dot'] > -0.2 and fl['volume'] > 0)]
    rows += list(extra)
    return rows


def rows_html(rows):
    return SL.table([(r[0], r[1], "" if r[2] is None else SL.status(r[2])) for r in rows], ["Test", "Measured", ""])


def grid(prefix, subdir, names, w=380, cols=5):
    return f"<div class='grid' style='grid-template-columns:repeat({cols},{w}px)'>" + "".join(
        f"<div class='cell'><img src='{subdir}/{prefix}-{n}.png' width='{w}'><div class='cap'>{n}</div></div>" for n in names) + "</div>"


def turnaround(b, OUT, sub, **kw):
    res = views.render_views(b, os.path.join(OUT, sub), **kw)
    return [v[0] for v in views.VIEWS]
