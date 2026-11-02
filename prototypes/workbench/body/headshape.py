"""The head, neck and shoulder profile of the S20 loft, as a function of a few numbers (pass 3, owner rules of 2 Nov: the head sits on the top of the spine, a round ball with an under-curve at the jaw and cheeks, a short concave neck band at about 0.62-0.70 of the head's
maximum radius, then the shoulders and chest swell out again).

The loft's section table is [z, [back, side, front]] (radii about the vertical axis). This module rewrites the rows between `z_keep` (the chest, kept as it is) and the head's equator `zc` from the parameters, leaves the upper half of the head (zc and above) as the base table has it,
and shifts the head forward of the spine by `d` of its depth (the skull dome is not shifted: the shift fades out over the top, so the crown cap stays on the axis).
    r_c(z)  chest-to-neck curve: a cubic from the chest's radius and slope at z_keep to the neck radius at z_neck (zero slope), then the neck radius (inside the head ball)
    r_h(z)  the head ball's lower half: a superellipse about zc with half-height b_dn and exponent p, radius R (= the base table's side radius at zc)
    side(z) the p-norm union of the two (exponent n): a fillet, so the neck band is concave and the jaw is an under-curve, never a cone
"""
import numpy as np

DEFAULTS = dict(R_scale=1.0, chest_gain=0.0, chest_window=(0.5, 0.85, 1.02, 1.2), z_keep=1.0, zc=1.68, z_neck=1.2, neck_ratio=0.66, b_dn=0.46, p=2.4, n=4.0, back_ratio=0.895, front_ratio=0.905, d=0.0, shift_lo=(1.28, 1.55), shift_lo_front=(1.5, 1.78), back_share=0.25, shift_hi=(1.78, 2.12), shift_hi_front=(1.78, 2.12), brow=0.0, depth=1.143)


def sstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def stations(base, **kw):
    """base: the pass-2 table [[z, [back, side, front]], ...] (as in species/S20.json section.stations_base). Returns the new table."""
    P = {**DEFAULTS, **kw}
    z = np.array([r[0] for r in base], float)
    ax = np.array([r[1] for r in base], float)
    side0 = ax[:, 1].copy()
    out = ax.copy()
    w0, w1, w2, w3 = P["chest_window"]
    g = 1.0 + P["chest_gain"] * sstep(w0, w1, z) * (1 - sstep(w2, w3, z))         # the shoulders and the upper chest swell out a little (the head is 1.28 H and the trunk's mesh is narrower than its design)
    out = out * np.where(z < P["z_keep"] + 1e-9, g, 1.0)[:, None]
    side0 = out[:, 1].copy()
    zc = P["zc"]
    R = float(np.interp(zc, z, side0)) * P["R_scale"]
    # the chest's radius and slope where the new curve takes over
    zk = P["z_keep"]
    rk = float(np.interp(zk, z, side0))
    h = 0.01
    mk = float(np.interp(zk + h, z, side0) - np.interp(zk - h, z, side0)) / (2 * h)
    rn = P["neck_ratio"] * R
    zn = P["z_neck"]
    def r_c(q):
        q = np.asarray(q, float)
        t = np.clip((q - zk) / (zn - zk), 0, 1)
        L = zn - zk
        h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
        return h00 * rk + h10 * L * mk + h01 * rn + h11 * L * 0.0
    def r_h(q):
        t = np.clip(np.abs((np.asarray(q, float) - zc) / P["b_dn"]), 0, 1)
        return R * (1 - t ** P["p"]) ** (1.0 / P["p"])
    n = P["n"]
    for i, zz in enumerate(z):
        if zk < zz <= zc + 1e-9:
            s = float((r_c(zz) ** n + r_h(zz) ** n) ** (1.0 / n))
            out[i] = [s * P["back_ratio"], s, s * P["front_ratio"]]
    # the forward shift of the head (a fraction of its depth), fading in over the neck and out over the dome
    hi = 1 - sstep(*P["shift_hi"], z)
    dzb = P["back_share"] * P["d"] * P["depth"] * sstep(*P["shift_lo"], z) * hi
    hif = 1 - sstep(*P["shift_hi_front"], z)
    dzf = P["d"] * P["depth"] * sstep(*P["shift_lo_front"], z) * hif          # the face's own window opens higher: the underside of the face stays round (no chin pushed forward, no muzzle)
    out[:, 0] = out[:, 0] - dzb
    out[:, 2] = out[:, 2] + dzf
    return [[float(zz), [round(float(v), 4) for v in row]] for zz, row in zip(z, out)]


def apply(raw, **kw):
    """A copy of the raw species dict with the section table rebuilt (the base table is section.stations_base, written once from the pass-2 table)."""
    import copy
    r = copy.deepcopy(raw)
    sec = r["parts"]["torso"]["section"]
    base = sec.get("stations_base") or sec["stations"]
    pr = {**r["parts"]["torso"].get("head_profile", {}), **kw}
    sec["stations"] = stations(base, **pr)
    return r


PLANS = {"biped": "underside", "quadruped": "back", "serpentine": "back"}


def head_geometry(spec):
    """Where the head sits on the spine, from the section table and the body plan's head_attach block. Returns dict(centre (x, z), depth, pivot (x, 0, z), a, d, kind, back_x, front_x).
    biped: the spine ends on the head's underside, a of the head's depth in from the back (the pivot a nod turns about); the head's centre lies d of its depth forward of the spine axis (x = 0).
    quadruped / serpentine: the spine enters the back of the head on its own axis (pivot at the back of the head at the equator's height, a = 0)."""
    t = spec["parts"]["torso"]
    ha = t["head_attach"]
    st = t["section"]["stations"]
    z = np.array([r[0] for r in st]); ax = np.array([r[1] for r in st])
    zc = float(t.get("head_profile", {}).get("zc", DEFAULTS["zc"]))
    rb, rf = float(np.interp(zc, z, ax[:, 0])), float(np.interp(zc, z, ax[:, 2]))
    D = rb + rf
    c = 0.5 * (rf - rb)
    kind = ha["attach"]
    if kind == "underside":
        x_e = -rb + float(ha["a"]) * D
        piv = (x_e, 0.0, float(ha["z_under"]))
    else:
        piv = (-rb, 0.0, zc)
    return dict(centre=(c, zc), depth=D, pivot=piv, a=(piv[0] + rb) / D, d=c / D, kind=kind, back_x=-rb, front_x=rf)
