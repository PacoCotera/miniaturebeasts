"""The coat check of the background tier (spec 9): the cage's UV islands (s20tex.face_uv) lie inside the atlas, do not overlap and keep their padding, the faces of the belly patch and the face are not stretched past the limit, and the shipped mesh carries no vertex colours (the coat is a texture).
The biped (S20) is the only plan with UVs yet; the quadruped's coat comes with the coat plug-ins, so the check does not run on it (checks/__init__.py)."""
import re

import numpy as np

from . import check, row
from . import proof as PR
from .biped import f2

COAT = dict(
    stretch_p95=2.0,       # the belly patch and the face: p95 of sigma_max / sigma_min of the 3D -> UV map (pass 4)
    overlap_texels=6,      # islands may touch by a texel row or two at the 512 raster
    pad_px=10,             # the bake pads each island this many px into the empty atlas (s20tex.pad): two islands must stand twice that apart
    raster=512,
)


def _uv(ctx):
    d = ctx.__dict__.setdefault("_coat", {})
    if "uv" not in d:
        import s20tex as TX
        b = ctx.body
        V, F, at, fp = ctx.level(TX.SHIP_LEVEL)
        F = np.array(F, int)
        uv, isl = TX.face_uv(b, V, F, np.asarray(fp).astype(int), at)
        d["uv"] = (V, F, uv, np.asarray(isl))
    return d["uv"]


def face_stretch(V, F, uv):
    """sigma_max / sigma_min of the 3D -> UV map of every quad (from the corners 0, 1 and 3): the vectorised form of s20tex.stretch."""
    P = V[F]
    e3 = np.stack([P[:, 1] - P[:, 0], P[:, 3] - P[:, 0]], 1)
    eu = np.stack([uv[:, 1] - uv[:, 0], uv[:, 3] - uv[:, 0]], 1)
    det = eu[:, 0, 0] * eu[:, 1, 1] - eu[:, 0, 1] * eu[:, 1, 0]
    ok = np.abs(det) > 1e-12
    inv = np.zeros_like(eu)
    inv[ok, 0, 0], inv[ok, 0, 1] = eu[ok, 1, 1] / det[ok], -eu[ok, 0, 1] / det[ok]
    inv[ok, 1, 0], inv[ok, 1, 1] = -eu[ok, 1, 0] / det[ok], eu[ok, 0, 0] / det[ok]
    J = inv @ e3                                                    # (n, 2, 3): the map from UV to 3D
    G = J @ np.transpose(J, (0, 2, 1))
    tr = G[:, 0, 0] + G[:, 1, 1]
    dt = G[:, 0, 0] * G[:, 1, 1] - G[:, 0, 1] * G[:, 1, 0]
    disc = np.sqrt(np.maximum(tr * tr / 4 - dt, 0.0))
    lmax, lmin = tr / 2 + disc, np.maximum(tr / 2 - disc, 1e-30)
    st = np.sqrt(lmax / lmin)
    st[~ok] = np.nan
    return st, det


def _gaps(uv, isl, size, raster):
    """The islands' coverage masks at the raster, the overlap between each pair (texels) and the smallest gap between two islands in atlas px (None: further apart than the search)."""
    import s20tex as TX
    k = size / raster
    names = sorted(set(isl))
    masks = {}
    for nm in names:
        face, _, _ = TX.rasterize(uv[isl == nm] / k, raster)
        masks[nm] = face >= 0
    overlap, gap = 0, None
    reach = 14
    grown = {nm: [masks[nm]] for nm in names}
    for nm in names:
        for _ in range(reach):
            m = grown[nm][-1]
            o = m.copy()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                o |= np.roll(np.roll(m, dy, 0), dx, 1)
            grown[nm].append(o)
    pair = None
    for a in range(len(names)):
        for c in range(a + 1, len(names)):
            ov = int((masks[names[a]] & masks[names[c]]).sum())
            overlap = max(overlap, ov)
            for n_ in range(reach + 1):
                if (grown[names[a]][n_] & masks[names[c]]).any():
                    g = n_ * k
                    if gap is None or g < gap:
                        gap, pair = g, (names[a], names[c])
                    break
    return masks, overlap, gap, pair


@check(id="coat", name="Coat", fail="Coat stretches on {part}", stage="coat", version=1, part=[], fields=["coat", "parts.torso.coat"],
       rule=dict(date="2026-11-02 23:46", words="The coat goes on a UV texture, not vertex colours; UV islands are padded against seam bleed; the generated cage must unwrap to clean UV islands."),
       limit=dict(text="islands inside the atlas and not overlapping; at least 20 px apart (the bake pads each 10 px); belly patch and face stretched at most 2 at the 95th percentile; no vertex colours", value=COAT["stretch_p95"]), az=32, mode="clay", play=None)
def c_coat(ctx):
    import s20tex as TX
    V, F, uv, isl = _uv(ctx)
    size = float(TX.SIZE)
    inside = float(uv.min()) >= 0.0 and float(uv.max()) <= size
    masks, overlap, gap, pair = _gaps(uv, isl, size, COAT["raster"])
    st, det = face_stretch(V, F, uv)
    cen = V[F].mean(1)
    tor = (isl == "torso") & (cen[:, 1] > 0)
    belly = tor & (cen[:, 0] > 0.15) & (np.abs(cen[:, 1]) < 0.26) & (cen[:, 2] > 0.30) & (cen[:, 2] < 0.9)
    face = tor & (cen[:, 0] > 0.25) & (cen[:, 2] > 1.35) & (cen[:, 2] < 2.0)
    p95 = {}
    for nm, m in (("belly", belly), ("face", face)):
        v = st[m & np.isfinite(st)]
        p95[nm] = float(np.percentile(v, 95)) if len(v) else 0.0
    front = tor & (cen[:, 0] > 0.0)
    flipped = int((np.sign(det[front]) != np.sign(np.median(det[front]))).sum())
    src = open(__import__("s20glb").__file__).read()
    attrs = sorted(set(re.findall(r"\b(POSITION|NORMAL|TEXCOORD_0|COLOR_0|JOINTS_0|WEIGHTS_0|_PART|_EMIT)\b", src.split("prim = dict(attributes=dict(")[1].split("indices")[0]))) if "prim = dict(attributes=dict(" in src else []
    vcol = "COLOR_0" in attrs
    worst_part = max(p95, key=p95.get)
    probs = []
    if p95[worst_part] > COAT["stretch_p95"]:
        probs.append(("stretch", worst_part))
    if not inside:
        probs.append(("atlas", None))
    if overlap > COAT["overlap_texels"]:
        probs.append(("overlap", None))
    if gap is not None and gap < 2 * COAT["pad_px"]:
        probs.append(("padding", pair))
    if flipped:
        probs.append(("flipped", None))
    if vcol:
        probs.append(("colour", None))
    gap_txt = f"{gap:.0f} px" if gap is not None else "over 56 px"
    if probs:
        k, w = probs[0]
        if k == "stretch":
            fail, meas = f"Coat stretches on {w}", f"{w} stretched {p95[w]:.2f} at the 95th percentile, limit {COAT['stretch_p95']:.1f}"
        elif k == "atlas":
            fail, meas = "Coat islands leave the atlas", "an island lies outside the atlas"
        elif k == "overlap":
            fail, meas = "Coat islands overlap", f"islands overlap by {overlap} texels, limit {COAT['overlap_texels']}"
        elif k == "padding":
            fail, meas = "Coat islands too close to pad", f"{w[0]} and {w[1]} stand {gap:.0f} px apart, the bake pads {COAT['pad_px']} px each, needs {2 * COAT['pad_px']}"
        elif k == "flipped":
            fail, meas = "Coat folds over on the belly or face", f"{flipped} faces fold over"
        else:
            fail, meas = "The mesh carries vertex colours", "the glb has a COLOR_0 attribute"
    else:
        fail = None
        meas = f"Belly {p95['belly']:.2f}, face {p95['face']:.2f} at the 95th percentile (limit {COAT['stretch_p95']:.1f}); {len(masks)} islands inside the atlas, at least {gap_txt} apart (needs {2 * COAT['pad_px']}); no vertex colours"
    # the proof: the UV layout as the bake sees it, each quad coloured by its stretch (blue 1, red 2 and over), the closest pair ringed
    S = 560.0 / size
    ox, oy = 24.0, 24.0
    out = [f'<rect x="0" y="0" width="{PR.W}" height="{PR.H}" fill="#f7f6f3"/>', f'<rect x="{ox}" y="{oy}" width="{size * S:.1f}" height="{size * S:.1f}" fill="#ffffff" stroke="#8a8798" stroke-width="2"/>']
    left = (V[F][:, :, 1].mean(1) >= 0) | np.isin(isl, ("torso", "crown", "tip", "tail"))
    sv = np.nan_to_num(st, nan=1.0)
    for i in np.where(left)[0]:
        t = float(np.clip((sv[i] - 1.0) / (COAT["stretch_p95"] - 1.0), 0, 1))
        col = "#%02x%02x%02x" % (int(44 + 190 * t), int(95 + 60 * (1 - abs(2 * t - 1))), int(168 - 130 * t))
        pts = " ".join(f"{ox + x * S:.1f},{oy + y * S:.1f}" for x, y in uv[i])
        out.append(f'<polygon points="{pts}" fill="{col}" stroke="#ffffff" stroke-width="0.4"/>')
    for nm in sorted(set(isl)):
        q = uv[isl == nm]
        out.append(PR.label(ox + float(q[:, :, 0].mean()) * S, oy + float(q[:, :, 1].mean()) * S, nm, PR.INK, "middle", 15))
    out += [PR.panel(24, 640, 560, 128), PR.label(36, 664, "UV layout (blue: no stretch, red: 2 or more)", PR.INK, "start", 16, bg=False),
            PR.label(36, 692, f"belly patch {p95['belly']:.2f}, face {p95['face']:.2f} (limit {COAT['stretch_p95']:.1f}, 95th percentile)", PR.RED if probs and probs[0][0] == "stretch" else PR.INK, "start", 15, bg=False),
            PR.label(36, 716, f"closest islands {gap_txt} apart (needs {2 * COAT['pad_px']}) · overlap {overlap} texels", PR.RED if probs and probs[0][0] in ("padding", "overlap") else PR.INK, "start", 15, bg=False),
            PR.label(36, 740, f"{len(masks)} islands · " + ("a COLOR_0 attribute is in the glb" if vcol else "no vertex colours in the glb"), PR.RED if vcol else PR.INK, "start", 15, bg=False)]
    return row("fail" if probs else "pass", f2(p95[worst_part]), COAT["stretch_p95"], meas, dict(mode="clay", az=32, svg="".join(out)),
               dict(fail=fail, parts=[probs[0][1]] if probs and probs[0][1] in ("belly", "face") else [], stretch=dict((k, round(v, 3)) for k, v in p95.items()), gap_px=gap, shown=dict(value=f"{p95[worst_part]:.2f}", limit=f"{COAT['stretch_p95']:.1f}")))
