"""Pass 3 helpers (head attachment, neck, feet, bones): variants of the S20 type specimen built from a modified raw dict, clay views with the spine drawn, plush house views, small sheet pieces. Under the bpy venv."""
import os, sys, json, copy, math, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import s20genes as GN, s20rig, s20indiv as IN, s20tex as TX, s20pipe as PP, s20render as RN, s20p2 as P2, s20sil as SL_, nview, views, bpyio as B, sheetlib as SL, schema as SC, s20build
import headshape as HS

OUT = "/home/mb/mb/iwq/results/T-20261101-mesh/newspecies/build/pass3"
RAW = IN.RAW


def variant(raw=None, head=None, attach=None, mut=None):
    """A raw dict with the head profile numbers (headshape.apply) and the attach block replaced; `mut(raw)` may change anything else."""
    r = copy.deepcopy(raw or RAW)
    t = r["parts"]["torso"]
    if attach:
        t["head_attach"].update(attach)
    if head is not None:
        t["head_profile"] = {**t.get("head_profile", {}), **head}
    r = HS.apply(r)
    if mut:
        mut(r)
    return r


def make(raw, ind=1):
    """(creature, body, rig) of individual `ind` from a raw dict."""
    ind_ = GN.draw(ind)
    c = GN.creature(ind_)
    b = GN.build_individual(raw, c)
    return c, b, s20rig.Rig(b.ctx)


def spine_polyline(b, R):
    """The spine as the owner reads it: seat -> belly -> waist -> the head pivot (its end on the head's underside), in the x-z plane; plus the head pivot and the head centre."""
    G = b.ctx["T"]
    sp = G.sp["body"]
    pts = [(x, z) for x, z in sp[::-1]][:-1]            # seat/back joints from the bottom ... (crown and K are the head's axis, not the spine)
    hp = R.head_pivot
    # the spine's polyline: the tail range (stalk to root) is the path's start; here the trunk part only: the path points from the bend up to the neck, then the pivot
    pa = G.pa
    s = np.linspace(G.s_root, G.L - (2.2 - hp[2]), 40)
    pt = pa.at(s)[0]
    line = [(float(p[0]), float(p[2])) for p in pt]
    line = [q for q in line if q[1] < hp[2] - 0.02] + [(float(hp[0]), float(hp[2]))]
    return line


def clay_side(b, R, path, az=90.0, el=0.0, centre=(-0.1, 0, 1.45), w=330, h=420, pph=165.0, pose=None, spine=True, samples=24):
    """A clay render with the spine polyline, the head pivot (red) and the head centre (blue) drawn on top (az 90 looks at the creature's left side: x runs to the right)."""
    mesh = P2.level_arrays(b, 2)
    V, F, at, fp2 = mesh
    if pose is not None:
        part = IN.part_of(b, F, fp2, len(V))
        W = R.weights(V, at, part)
        V = R.skin(V, W, pose)
    sc = B.reset(); sc.cycles.samples = samples
    B.make_mesh("body", V, F, color=(0.62, 0.60, 0.58))
    B.lights(sc, az)
    cam = B.camera(sc, az, el, w, h, centre, ppH=pph)
    a = B.render_to_array(path)
    img = B.to_srgb8(a)
    if spine:
        line = np.array([[x, 0.0, z] for x, z in spine_polyline(b, R)])
        P2d, _ = B.project(cam, line)
        img2 = B.draw_lines(img, P2d[:-1], P2d[1:], [(210, 30, 30)] * (len(P2d) - 1), alpha=1.0)
        for off in (-1, 0, 1):
            img2 = B.draw_lines(img2, P2d[:-1] + [0, off], P2d[1:] + [0, off], [(210, 30, 30)] * (len(P2d) - 1), alpha=1.0)
        piv = np.array([R.head_pivot]); cen = np.array([[R.head_geom["centre"][0], 0.0, R.head_geom["centre"][1]]])
        img2 = B.draw_dots(img2, B.project(cam, piv)[0], [(255, 40, 40)], r=5)
        img2 = B.draw_dots(img2, B.project(cam, cen)[0], [(30, 80, 255)], r=4)
        img = img2
    B.write_png(path, img)
    return path


def plush_views(b, R, c, sub, tag="", sizes=(304, 96), az=32.0, extra=(), tex=None, samples=48):
    """The house view in the stand pose in the plush render (as pass 2): 304 and 96 (and the extras: (name, az, el, w, h, ppH, centre))."""
    if tex is None:
        tex = PP.make_tex(b, c["coat"])
    paths = P2.write_tex(tex, os.path.join(sub, "tex" + tag))
    M = P2.posed(TX.render_mesh(b), b, R, R.stand_pose())
    out = {}
    for size in sizes:
        w, h, ppH = SL_.SIZES[size]
        p = os.path.join(sub, f"{tag}house-{size}.png")
        a, cam = RN.render_tex(M, paths, c["coat"], p, w, h, ppH, az=az, el=10.0, centre=(-0.35, 0, 1.3 if size != 48 else 1.25), samples=samples)
        RN.to_png(a, p)
        out[size] = p
    for nm, az_, el_, w, h, ppH, cen in extra:
        p = os.path.join(sub, f"{tag}{nm}.png")
        a, cam = RN.render_tex(M, paths, c["coat"], p, w, h, ppH, az=az_, el=el_, centre=cen, samples=samples)
        RN.to_png(a, p)
        out[nm] = p
    return out, tex, paths


def head_numbers(b):
    """Head and neck numbers on the level-2 trunk: head width (max over z > 1.4), head depth, neck min radius over the head's max radius, head / body width."""
    V, F, at, fp2 = P2.level_arrays(b, 2)
    part = np.rint(at[:, 0]).astype(int)
    Vt = V[part == b.parts["torso"]]
    zs = np.arange(0.3, 2.15, 0.02)
    wt = np.array([2 * float(np.abs(Vt[np.abs(Vt[:, 2] - z) < 0.03, 1]).max()) for z in zs])
    dep = np.array([float(np.ptp(Vt[np.abs(Vt[:, 2] - z) < 0.03, 0])) for z in zs])
    head = wt[zs > 1.4].max()
    body = wt[(zs > 0.5) & (zs < 1.1)].max()
    neckm = wt[(zs > 1.05) & (zs < 1.45)]
    zn = zs[(zs > 1.05) & (zs < 1.45)][neckm.argmin()]
    zh = zs[zs > 1.4][wt[zs > 1.4].argmax()]
    return dict(head_w=head, body_w=body, ratio=head / body, neck_w=float(neckm.min()), neck_over_head=float(neckm.min() / head), neck_z=float(zn), head_z=float(zh), head_depth=float(dep[zs > 1.4].max()))
