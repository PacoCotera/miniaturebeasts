"""Sitting S01 habit keys: the K1 cut (studio brief 2026-10-23 22:00; art director's ruling 22:31). 0 MXN.
Key-out: concepts/mibi-motion-proof/guides/cut-motion.py's cut() (border magenta with a 1 px choke, magenta cast off the 2 px edge, enclosed pockets as
ground, the cell-border rule only in the 12 px edge band, painted shadows to a discard layer), with one change: small islands are kept as droplet
candidates; at 304x312 a droplet is kept if it is >= 9 px at alpha >= 200 and inside the body's box widened by 16 px.
Register: the inverse of the compose placement (guides/compose-sit.json, the stage's canvas transform) with the cell offset; every take gets the same
transform. Then whole-pixel moves: the lowest solid row (alpha > 128) onto row 303, the body's centre (droplets excluded) onto the anchor's.
Mirror (ruling 22:31, the standing rule): a take named in MIRROR is flipped left to right in its cell before the key-out.
Magenta spill: in the 3 px edge band, min(R,B) - G above 15 is taken off R and B; on a droplet's rim such pixels are choked (alpha 0); strongly
magenta pixels deeper in the body (min(R,B) - G > 40, the pockets at the crest's roots) are repainted from their neighbours.
Droplets on the fur (ruling 22:31): droplet pixels whose 2 px ring is > 50 % body are painted out from the fur around them, before the cut.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/cut-sit.py k1 <stage> <raw sheet> <mirror cells, e.g. 2,3,5,6 or ->"""
import json, os, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
_src = open('concepts/mibi-motion-proof/guides/cut-motion.py').read()
_cut = _src[_src.index('def cut(a):'):_src.index('st = np.asarray')]
_cut = _cut.replace("body = np.isin(lab, 1 + np.where(sz > 1500)[0])", "body = np.isin(lab, 1 + np.where(sz > 1500)[0]); small = (lab > 0) & ~body")
_cut = _cut.replace("return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'), ground, (xs.min() + xs.max()) / 2, xs.max() - xs.min() + 1",
                    "rgb = np.where(small[..., None], a, rgb).astype(np.uint8); alpha = np.where(small, 255, alpha).astype(np.uint8); alpha_sh = np.where(sha & ~body, 110, 0).astype(np.uint8); alpha = np.where(sha & ~body & ~small, 0, alpha).astype(np.uint8)\n    return Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'), ground, (xs.min() + xs.max()) / 2, xs.max() - xs.min() + 1, Image.fromarray(alpha_sh, 'L')")
exec(_cut)
KW, KH, CW, CH, I, FEETROW = 304, 312, 421, 424, 6, 303
CELLS = {2: ('shake', 't1'), 3: ('calm', 't1'), 5: ('shake', 't2'), 6: ('calm', 't2')}
J = json.load(open('floor/S01/sitting/guides/compose-sit.json'))
def drops_on_fur(q):
    """The ruling's droplet test (dropclear.py): pale blue-white islands; one whose 2 px ring is > 50 % body lies on the fur. Returns (on-fur mask, n on fur, n clear)."""
    R, G, B = q[..., 0], q[..., 1], q[..., 2]
    mag = (np.abs(R - B) < 45) & (G < 80) & (R > 80); drop = (G > 150) & (B > 180) & (B >= R - 10)
    body = ~mag & ~drop; lab, n = nd.label(body); body = lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
    dl, dn = nd.label(nd.binary_dilation(drop, iterations=2)); on = np.zeros(drop.shape, bool); non = ncl = 0
    for i in range(1, dn + 1):
        r = dl == i
        ring = nd.binary_dilation(r, iterations=2) & ~r; frac = (ring & body).sum() / ring.sum()
        if (r & drop).sum() < 30:
            if frac > 0.5: on |= nd.binary_dilation(r, iterations=1)        # a glint-sized droplet speck on the fur goes too (not counted)
            continue
        if frac > 0.5: on |= nd.binary_dilation(r, iterations=1); non += 1
        elif frac <= 0.05: ncl += 1
    return on, non, ncl
def inpaint(q, hole):
    """Fill hole from the pixels around it: repeated 3x3 averaging of known neighbours, outside-in."""
    q = q.copy(); known = ~hole; k = np.ones((3, 3))
    while not known.all():
        s = np.stack([nd.convolve(q[..., c] * known, k, mode='nearest') for c in range(3)], -1); w = nd.convolve(known.astype(float), k, mode='nearest')
        grow = ~known & (w > 0); q[grow] = s[grow] / w[grow][:, None]; known = known | grow
    return q
def to_canvas(cellim, M, mode):
    """Inverse of compose-sit.to_cell: a (421-2I)x(424-2I) cut cell (RGBA or L) -> 304x312 on the v4 canvas, LANCZOS."""
    (bx0, by0, _, _), (ox, oy), (kx, ky) = M['box'], M['at_in_cell'], M['k']; P = 200
    big = Image.new(mode, (cellim.width + 2 * P, cellim.height + 2 * P), 0); big.paste(cellim, (P, P))
    X = lambda u: P + ox - I + (u - bx0) * kx; Y = lambda v: P + oy - I + (v - by0) * ky
    return big.resize((KW, KH), Image.LANCZOS, box=(X(0), Y(0), X(KW), Y(KH)))
def quant(a): return np.where(a >= 200, 255, np.where(a >= 60, np.minimum(a, 110), 0)).astype(np.uint8)
def k1(stage, sheet, mirror):
    M = J['maps'][stage]; A = np.asarray(Image.open(sheet).convert('RGB')).astype(float); rep = {'sheet': sheet, 'mirrored_cells': sorted(mirror), 'takes': {}}
    anc = np.asarray(Image.open(f'floor/S01/crested/mibi-{stage}-S01-anchor-304x312.png').convert('RGBA'))
    asol = anc[..., 3] > 128; axs = np.where(asol.any(0))[0]; acx = (axs.min() + axs.max()) / 2
    for c in [1] + list(CELLS):
        x0, y0 = ((c - 1) % 3) * CW, ((c - 1) // 3) * CH; q = A[y0:y0 + CH, x0:x0 + CW].copy()
        if c in mirror: q = q[:, ::-1].copy()
        r = {}
        if c != 1 and CELLS[c][0] == 'shake':
            on, non, ncl = drops_on_fur(q); q = inpaint(q, on); r['droplets_on_fur_painted_out'] = non; r['droplets_clear_of_coat_on_sheet'] = ncl
        im, ground, cx, w, shad = cut(q[I:CH - I, I:CW - I])
        can = np.asarray(to_canvas(im, M, 'RGBA')).copy(); can[..., 3] = quant(can[..., 3]); sh = np.asarray(to_canvas(shad, M, 'L'))
        sol = can[..., 3] > 128; lab, n = nd.label(sol); sz = nd.sum(sol, lab, range(1, n + 1)); main = lab == (1 + int(np.argmax(sz)))
        ys, xs = np.where(main); bx = (xs.min() - 16, xs.max() + 16, ys.min() - 16, ys.max() + 16)
        keep = main.copy(); nd_ = 0
        for i in range(1, n + 1):
            if i == 1 + int(np.argmax(sz)): continue
            isl = lab == i; iy, ix = np.where(isl)
            if isl.sum() >= 9 and (can[..., 3][isl] >= 200).sum() >= 9 and ix.min() >= bx[0] and ix.max() <= bx[1] and iy.min() >= bx[2] and iy.max() <= bx[3]:
                keep |= nd.binary_dilation(isl, iterations=1) & (can[..., 3] > 0); nd_ += 1
        near = nd.binary_dilation(main, iterations=2) & (can[..., 3] > 0)        # the faint edge of the body
        can[..., 3] = np.where(keep | near, can[..., 3], 0); can[can[..., 3] == 0] = 0
        spill_zone = (can[..., 3] > 0) & ~nd.binary_erosion(main, iterations=3) | (keep & ~main)       # the edge band and the droplets
        f = can[..., :3].astype(float); sp = np.clip(np.minimum(f[..., 0], f[..., 2]) - f[..., 1], 0, None); hit = spill_zone & (sp > 15)
        dro = keep & ~nd.binary_dilation(main, iterations=2)
        f[..., 0] -= np.where(hit & ~dro, sp, 0); f[..., 2] -= np.where(hit & ~dro, sp, 0); can[..., 3] = np.where(hit & dro, 0, can[..., 3])   # a droplet's pink rim is choked, not darkened
        inner = (can[..., 3] > 0) & nd.binary_erosion(main, iterations=3) & (np.minimum(f[..., 0], f[..., 2]) - f[..., 1] > 40)            # inner cast: repainted from neighbours
        if inner.any(): f = inpaint(f, nd.binary_dilation(inner, iterations=1) & main)
        can[..., :3] = np.clip(np.rint(f), 0, 255).astype(np.uint8); r['despilled_px'] = int(hit.sum()); r['inner_cast_repainted_px'] = int(inner.sum())
        foot = np.where(main.any(1))[0].max(); mx = np.where(main.any(0))[0]; bcx = (mx.min() + mx.max()) / 2
        dy = FEETROW - int(foot); dx = int(round(acx - bcx)) if c != 1 else 0
        if c == 1: dy = 0
        out = np.zeros_like(can); ys0, ys1 = max(0, dy), min(KH, KH + dy); xs0, xs1 = max(0, dx), min(KW, KW + dx)
        out[ys0:ys1, xs0:xs1] = can[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
        al = out[..., 3] > 0; ay, ax = np.where(al)
        r.update({'cell': c, 'mirrored': c in mirror, 'feet_row_before': int(foot), 'move_px': [dx, dy], 'droplets_kept': nd_, 'box': [int(ax.min()), int(ay.min()), int(ax.max()), int(ay.max())], 'clear_1px': bool(ax.min() >= 1 and ay.min() >= 1 and ax.max() <= KW - 2 and ay.max() <= KH - 2)})
        if c == 1:
            r['against_anchor'] = check5(out, anc)
            Ci = np.asarray(Image.open(f'floor/S01/sitting/guides/compose-sit-{stage}-crested.png').convert('RGB')).astype(float)
            ci = np.asarray(to_canvas(cut(Ci[I:CH - I, I:CW - I])[0], M, 'RGBA')).copy(); ci[..., 3] = quant(ci[..., 3])
            r['against_input_cut_the_same_way'] = check5(can, ci)          # check 5: the sheet's cell 1 against its input, both through this key-out
            r['input_roundtrip_against_anchor'] = check5(ci, anc)        # what the key-out alone costs
            r['centroid_shift_px_xy'] = [round(float(v), 2) for v in (np.array(np.where(can[..., 3] > 128)).mean(1) - np.array(np.where(ci[..., 3] > 128)).mean(1))[::-1]]
            rep['cell1'] = r
        else:
            pose, t = CELLS[c]; p = f'floor/S01/crested/mibi-{stage}-S01-{pose}-{t}-304x312.png'; Image.fromarray(out).save(p)
            Image.fromarray(np.where(sh > 0, sh, 0).astype(np.uint8)).save(f'floor/S01/sitting/guides/discard-shadow-{stage}-{pose}-{t}.png'); rep['takes'][f'{pose}-{t}'] = r
    return rep
def outline_p95(a, b, far):
    ea, eb = a & ~nd.binary_erosion(a), b & ~nd.binary_erosion(b); da, db = nd.distance_transform_edt(~ea), nd.distance_transform_edt(~eb)
    v = np.concatenate([da[eb & far], db[ea & far]]); return float(np.percentile(v, 95)), float(v.max())
def green(a):
    r, g, b = [a[..., i].astype(float) for i in range(3)]; return (a[..., 3] > 128) & (g > r + 8) & (g > b + 8)
def check5(out, anc):
    a, b = out[..., 3] > 128, anc[..., 3] > 128; far = ~nd.binary_dilation(green(anc) | green(out), iterations=10)
    p95, mx = outline_p95(a, b, far); inside = a & b & ~nd.binary_dilation((a & ~nd.binary_erosion(a)) | (b & ~nd.binary_erosion(b)), iterations=2)
    return {'check5_outline_p95_px': round(p95, 2), 'check5_outline_max_px': round(mx, 2), 'check5_mean_rgb_diff_inside': round(float(np.abs(out[..., :3].astype(float) - anc[..., :3].astype(float))[inside].mean()), 2)}
if __name__ == '__main__':
    mode, stage, sheet, mir = sys.argv[1:5]
    rep = k1(stage, sheet, set() if mir == '-' else {int(x) for x in mir.split(',')})
    rp = 'floor/S01/sitting/guides/register.json'; R = json.load(open(rp)) if os.path.exists(rp) else {}
    R[f'{stage}-{mode}'] = rep; json.dump(R, open(rp, 'w'), indent=1); print(json.dumps(rep, indent=1))
