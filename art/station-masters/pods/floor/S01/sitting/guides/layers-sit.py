"""Sitting S01 keys: the 0 MXN layers after K2-K4 (studio brief 2026-10-23 22:00, "The 0 MXN work after"), per take on the v4 canvas.
  crest overlay  floor/S01/guides/overlays.py's rule (the crested key's own crest pixels plus a 4 px root band), written for the new takes only
  fur mask       results/T-20261016-200/cut-layers.py's fur_mask() on the bare key (coat without belly, eyes, rings, crest, toes and droplets)
  zone mask      cut-layers.py's zone_mask() (the v4 keys' rule: the top 48 % of each coat column is the back)
  patches        cut-patches-r2.py's mark layer (cut-layers.py mark_layer()) on the K3 sheet put back on the canvas through the inverse compose
                 transform, then heads-off.py's rule with a HEADS ellipse drawn for each take (below)
  stripes        the same from the K4 sheet, cut-layers.py's stripes path (no heads-off)
The work-queue code is read with git show from /home/user/wq at f1285a67 and run unchanged.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/layers-sit.py <stage> <overlays|patches|stripes> [raw sheet]"""
import json, os, subprocess, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
WQ = lambda p: subprocess.run(['git', '-C', '/home/user/wq', 'show', f'f1285a67:{p}'], check=True, capture_output=True, text=True).stdout
_cl = WQ('results/T-20261016-200/cut-layers.py'); _cl = _cl[_cl.index('def largest_components'):_cl.index('def ramp_from')]
exec(_cl)
_cs = open('floor/S01/sitting/guides/cut-sit.py').read(); exec(_cs[_cs.index('KW, KH, CW, CH'):_cs.index('def drops_on_fur')]); exec(_cs[_cs.index('def to_canvas'):_cs.index('def quant')])
TAKES = {2: 'shake-t1', 3: 'calm-t1', 5: 'shake-t2', 6: 'calm-t2'}
HEADS = {  # (cx, cy, rx, ry) on the 304x312 canvas, drawn by hand per take from the bare keys (as heads-off.py's HEADS); marks inside are removed
 'adult-shake-t1': (80, 160, 72, 68), 'adult-shake-t2': (95, 140, 75, 72), 'adult-calm-t1': (88, 150, 80, 70), 'adult-anchor': (105, 115, 82, 75)}
L = 'floor/S01/layers'; G = 'floor/S01/sitting/guides'
def rgba(p): return Image.open(p).convert('RGBA')
def takes(stage): return [t for t in TAKES.values() if os.path.exists(f'floor/S01/keys/mibi-{stage}-S01-base-{t}-304x312.png')]
def overlays(stage):
    out = {}
    for k in takes(stage):
        ac = np.asarray(rgba(f'floor/S01/crested/mibi-{stage}-S01-{k}-304x312.png')); ab = np.asarray(rgba(f'floor/S01/keys/mibi-{stage}-S01-base-{k}-304x312.png'))
        bc, bb = ac[..., 3] >= 200, ab[..., 3] >= 200; a = ac.astype(int)
        only = nd.binary_opening(bc & ~bb, iterations=1); lab, n = nd.label(only); sz = nd.sum(only, lab, range(1, n + 1))
        leaves = np.isin(lab, 1 + np.where(sz > 80)[0])
        g = (a[..., 1] > a[..., 0] + 4) & (a[..., 1] > a[..., 2] + 4) & (ac[..., 3] > 0) & nd.binary_dilation(leaves, iterations=6)
        crest = nd.binary_closing(leaves | g, iterations=2) & (ac[..., 3] > 0)
        crest |= nd.binary_dilation(crest, iterations=1) & (ac[..., 3] > 0) & ~bb
        band = nd.binary_dilation(crest, iterations=4) & bb & ~crest; mask = crest | band
        ov = np.zeros_like(ac); ov[mask] = ac[mask]; Image.fromarray(ov).save(f'floor/S01/overlays/mibi-{stage}-S01-{k}-crest-304x312.png')
        comp = Image.fromarray(ab); comp.alpha_composite(Image.fromarray(ov)); cp = np.asarray(comp)
        out[k] = {'crest_px': int(crest.sum()), 'band_px': int(band.sum()), 'diff_outside_mask': int((cp != ab).any(-1)[~mask].sum())}
        m = fur_mask(Image.fromarray(ab)); os.makedirs(L, exist_ok=True)
        dro = (ab[..., 3] > 128) & ~nd.binary_dilation(largest_components(ab[..., 3] > 128, keep=0.5), iterations=2)
        Image.fromarray((m * 255).astype('uint8')).save(f'{L}/mibi-{stage}-S01-{k}-fur-mask-304x312.png'); Image.fromarray(zone_mask(m)).save(f'{L}/mibi-{stage}-S01-{k}-zone-mask-304x312.png')
        out[k].update({'fur_px': int(m.sum()), 'droplet_px_in_fur_mask': int((m & dro).sum())})
    return out
def painted(stage, sheet, c):
    """The sheet's painting of a cell, back on the canvas (RGB, magenta outside), through the inverse compose transform."""
    M = J['maps'][stage]; A = Image.open(sheet).convert('RGB'); x0, y0 = ((c - 1) % 3) * CW, ((c - 1) // 3) * CH
    cell = A.crop((x0 + I, y0 + I, x0 + CW - I, y0 + CH - I)); return np.asarray(to_canvas(cell, M, 'RGB'), dtype=float)
def heads_off(lay, key):
    cx, cy, rx, ry = HEADS[key]; m = Image.new('L', (304, 312), 255); ImageDraw.Draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=0); m = m.filter(ImageFilter.GaussianBlur(2))
    a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3].astype(float) * np.asarray(m) / 255).astype(np.uint8); return Image.fromarray(a, 'RGBA')
def marks(stage, look, sheet):
    out = {}; cells = {1: 'anchor', **{c: t for c, t in TAKES.items() if t in takes(stage)}}
    for c, k in cells.items():
        b = rgba(f'floor/S01/keys/mibi-{stage}-S01-base-{k}-304x312.png'); ab = np.asarray(b)
        m = fur_mask(b) if k == 'anchor' else np.asarray(Image.open(f'{L}/mibi-{stage}-S01-{k}-fur-mask-304x312.png')) > 127
        P = painted(stage, sheet, c); lay = mark_layer(P, b, m)
        if look == 'patches': lay = heads_off(lay, f'{stage}-{k}')
        al = np.asarray(lay)[..., 3]; fig = ab[..., 3] > 128
        outside = fig & ~nd.binary_dilation(m, iterations=3) & ~nd.binary_dilation(ab[..., 3] <= 128, iterations=3)   # the figure's inside, off the coat, off the 3 px edge
        rep = (np.abs(P - ab[..., :3].astype(float)).sum(-1) > 60) & outside
        sol = al > 128; lab, n = nd.label(sol); sz = sorted([int(s) for s in nd.sum(sol, lab, range(1, n + 1))], reverse=True)
        r = {'mark_px': int(sol.sum()), 'masses_over_150px': sum(1 for s in sz if s >= 150), 'mass_sizes': sz[:6], 'alpha_outside_fur_px': int(((al > 0) & ~m).sum()),
             'repainted_outside_coat_px': int(rep.sum()), 'repainted_fraction_of_figure': round(float(rep.sum() / fig.sum()), 4)}
        if k != 'anchor': lay.save(f'{L}/mibi-{stage}-S01-{k}-{look}-304x312.png')
        else: r['anchor_layer_vs_signed_px_alpha>128_iou'] = None
        out[k] = r
    q = np.asarray(Image.open(sheet).convert('RGB')).astype(float)
    out['empty_cells'] = {str(c): int((np.abs(q[((c - 1) // 3) * CH + I:((c - 1) // 3 + 1) * CH - I, ((c - 1) % 3) * CW + I:((c - 1) % 3 + 1) * CW - I] - [255, 0, 255]).sum(-1) > 90).sum())
                          for c in [4] + [c for c, t in TAKES.items() if t not in takes(stage)]}
    return out
if __name__ == '__main__':
    stage, what = sys.argv[1:3]
    rep = overlays(stage) if what == 'overlays' else marks(stage, what, sys.argv[3])
    jp = f'{G}/layers.json'; Jl = json.load(open(jp)) if os.path.exists(jp) else {}; Jl[f'{stage}-{what}'] = rep; json.dump(Jl, open(jp, 'w'), indent=1); print(json.dumps(rep, indent=1))
