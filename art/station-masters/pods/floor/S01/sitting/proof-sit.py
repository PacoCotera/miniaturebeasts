"""Sitting S01 keys: the 1x proofs the art director signs from (studio brief, "The 1x proofs I sign from", keys 1-7), 0 MXN.
All from the 304x312 files, LANCZOS once where a size changes (P0 not merged: the station's fitDown and inkBox are not used).
  takes-1x.png         anchor, curl, then the takes, crested, over #D6CEBE and over vivarium-near-day (crop x 120-424, y 96-408)
  reads-apart-48-1x.png  the same as black silhouettes fitted into 48 (the brief's one method), with the IoU table
  layers-1x.png        per take: crested | bare | bare + crest | + patches | + stripes | + stripes and patches, over #D6CEBE
  cards-1x.png, cards-x3.png  card 96 on plate-well-120x120 at (12, 12) and thumb 48 on plate-well-152x48 at (96, 0), on the well ground #1d232b,
                       in Dot's look (charcoal and ash, stripes and patches, leaf crest), the worst coat (charcoal, bare, no marks), russet + patches,
                       ash + stripes; anchor and curl first
  looks-1x.png         the 24 looks x crest / bare per take at the walk size (adult 144x152, juvenile 104x112), fitted, over vivarium-near-day's ground
  window-1x.png        two rows per key, Dot's look and the worst coat (charcoal, bare, no marks), each at the Habitat factor (the adult anchor's figure is 136x149 there; juvenile by the same scale), last solid row on y 380,
                       axis x 272 (juvenile: the adult factor x 0.733 / 0.601), over vivarium-near-day and the five near backdrops in sitting-backdrops-near/slices (ungraded)
  edge-1x.png          each take, bare + crest, over black, #1d232b and vivarium-near-night (crop as takes)
Files land in floor/S01/sitting/proof/<stage>/.
Anchor and curl layers: work-queue f1285a67 results/T-20261016-200/layers (patches from round 2), unpacked to WQL.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/proof-sit.py <stage> <WQL dir> [window factor]"""
import json, os, sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
stage, WQL = sys.argv[1:3]; RAMPS = json.load(open(f'{WQL}/ramps.json'))['ramps']
exec(open('floor/S01/sitting/proof-looks.py').read())
F = 'floor/S01'; LAY = f'{F}/layers'; OUT = f'{F}/sitting/proof/{stage}'; os.makedirs(OUT, exist_ok=True)
TAKES = [t for t in ('shake', 'calm', 'shake-t1', 'shake-t2', 'calm-t1', 'calm-t2') if os.path.exists(f'{F}/keys/mibi-{stage}-S01-base-{t}-304x312.png')]   # final ids once signed and renamed
ALL = ['anchor', 'curl'] + TAKES
def rgba(p): return Image.open(p).convert('RGBA')
def ldir(k): return WQL if k in ('anchor', 'curl') else LAY
def parts(k):
    d = ldir(k)
    return {'base': rgba(f'{F}/keys/mibi-{stage}-S01-base-{k}-304x312.png'), 'crested': rgba(f'{F}/crested/mibi-{stage}-S01-{k}-304x312.png'),
            'crest': rgba(f'{F}/overlays/mibi-{stage}-S01-{k}-crest-304x312.png'), 'patches': rgba(f'{d}/mibi-{stage}-S01-{k}-patches-304x312.png'),
            'stripes': rgba(f'{d}/mibi-{stage}-S01-{k}-stripes-304x312.png')}
P = {k: parts(k) for k in ALL}
near = Image.open('slices/vivarium-near-day-544x408.png').convert('RGBA'); night = Image.open('slices/vivarium-near-night-544x408.png').convert('RGBA')
crop = lambda im: im.crop((120, 96, 424, 408))
def solid_box(im, thr=128):
    a = np.asarray(im)[..., 3] > thr; ys, xs = np.where(a); return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
def fit(im, w, h):
    """Whole art (alpha > 0 box) fitted into w x h, bottom-centred, LANCZOS once from 304x312."""
    x0, y0, x1, y1 = np.asarray(im.getchannel('A').getbbox()); s = min(w / (x1 - x0), h / (y1 - y0))
    f = im.crop((x0, y0, x1, y1)).resize((max(1, round((x1 - x0) * s)), max(1, round((y1 - y0) * s))), Image.LANCZOS)
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0)); c.alpha_composite(f, ((w - f.width) // 2, h - f.height)); return c
def bg(color, w, h): return Image.new('RGBA', (w, h), color)
def over(b, im, at=(0, 0)): b = b.copy(); b.alpha_composite(im, at); return b
def body(im):
    a = np.asarray(im)[..., 3] > 128; lab, n = nd.label(a); return lab == (np.bincount(lab.ravel())[1:].argmax() + 1)
def fit48(m):
    ys, xs = np.where(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; h, w = m.shape; s = 48 / max(h, w)
    a = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)) > 128
    o = np.zeros((48, 48), bool); oh, ow = a.shape; x0 = (48 - ow) // 2; o[48 - oh:, x0:x0 + ow] = a; return o
iou = lambda a, b: float((a & b).sum() / (a | b).sum())
rep = {}
# 1 takes
T = bg((214, 206, 190, 255), 304 * len(ALL), 624)
for i, k in enumerate(ALL): T.alpha_composite(P[k]['crested'], (i * 304, 0)); T.paste(over(crop(near), P[k]['crested']), (i * 304, 312))
T.convert('RGB').save(f'{OUT}/takes-1x.png')
# 2 reads apart
S = {k: fit48(body(P[k]['crested'])) for k in ALL}; tab = {k: {'anchor': round(iou(S[k], S['anchor']), 3), 'curl': round(iou(S[k], S['curl']), 3)} for k in TAKES}
pairs = {f'{s}x{c}': round(iou(S[s], S[c]), 3) for s in TAKES if s.startswith('shake') for c in TAKES if c.startswith('calm')}
R = bg((214, 206, 190, 255), max(64 * len(ALL), 420), 64 + 16 * (len(TAKES) + 3)); d = ImageDraw.Draw(R)
for i, k in enumerate(ALL):
    s = np.zeros((48, 48, 4), np.uint8); s[S[k]] = (0, 0, 0, 255); R.alpha_composite(Image.fromarray(s), (8 + i * 64, 8))
d.text((8, 60), '   '.join(ALL), fill=(0, 0, 0))
for j, k in enumerate(TAKES): d.text((8, 76 + 16 * j), f'{k}: IoU anchor {tab[k]["anchor"]:.3f}  curl {tab[k]["curl"]:.3f}  ({"reads apart" if max(tab[k].values()) <= 0.80 else "FAILS > 0.80"})', fill=(0, 0, 0))
d.text((8, 76 + 16 * len(TAKES)), 'shake x calm: ' + '  '.join(f'{a} {b:.3f}' for a, b in pairs.items()) + '  (<= 0.85)', fill=(0, 0, 0))
R.convert('RGB').save(f'{OUT}/reads-apart-48-1x.png'); rep['reads_apart'] = {'iou': tab, 'pairs': pairs}
# 3 layers
Lr = bg((214, 206, 190, 255), 304 * 6, 312 * len(ALL))
for r, k in enumerate(ALL):
    p = P[k]; bc = over(p['base'], p['crest']); row = [p['crested'], p['base'], bc, over(bc, p['patches']), over(bc, p['stripes']), over(over(bc, p['patches']), p['stripes'])]
    for c, im in enumerate(row): Lr.alpha_composite(im, (c * 304, r * 312))
    if k in TAKES: rep.setdefault('base+crest_vs_crested_px_diff_alpha>128', {})[k] = int(((np.asarray(bc)[..., 3] > 128) != (np.asarray(p['crested'])[..., 3] > 128)).sum())
Lr.convert('RGB').save(f'{OUT}/layers-1x.png')
# 4 cards
well = Image.open('slices/plate-well-120x120.png').convert('RGBA'); thumbw = Image.open('slices/plate-well-152x48.png').convert('RGBA')
LOOKS = [('charcoal and ash', 'stripes and patches', True), ('charcoal', 'none', False), ('russet', 'patches', True), ('ash', 'stripes', True)]
C = bg((29, 35, 43, 255), 4 * 280, 128 * len(ALL))
for r, k in enumerate(ALL):
    for c, (coat, marks, crest) in enumerate(LOOKS):
        im = look(P[k]['base'], ldir(k), k, stage, coat, marks, crest, P[k])
        cw = well.copy(); cw.alpha_composite(over(bg((29, 35, 43, 255), 96, 96), fit(im, 96, 96)), (12, 12)); C.alpha_composite(cw, (c * 280, r * 128))
        tw = thumbw.copy(); tw.alpha_composite(over(bg((29, 35, 43, 255), 48, 48), fit(im, 48, 48)), (96, 0)); C.alpha_composite(tw, (c * 280 + 124, r * 128 + 36))
C.convert('RGB').save(f'{OUT}/cards-1x.png'); C.convert('RGB').resize((C.width * 3, C.height * 3), Image.NEAREST).save(f'{OUT}/cards-x3.png')
# 5 looks (24 x crest/bare) and the recolour exit
ws = (144, 152) if stage == 'adult' else (104, 112); ground = near.crop((0, 408 - ws[1], ws[0], 408))
Lk = bg((214, 206, 190, 255), ws[0] * 24, ws[1] * 2 * len(TAKES)); rep['recolour_diff_outside_fur_mask'] = {}
for r, k in enumerate(TAKES):
    rep['recolour_diff_outside_fur_mask'][k] = recolour_exit(P[k]['base'], ldir(k), k, stage)
    for ci, coat in enumerate(['charcoal'] + COATS):
        for mi, mk in enumerate(MARKS):
            for cr in (0, 1):
                im = look(P[k]['base'], ldir(k), k, stage, coat, mk, cr == 0, P[k]); Lk.alpha_composite(over(ground, fit(im, *ws)), ((ci * 4 + mi) * ws[0], (r * 2 + cr) * ws[1]))
rep['recolour_diff_outside_fur_mask']['anchor (reference)'] = recolour_exit(P['anchor']['base'], WQL, 'anchor', stage)
Lk.convert('RGB').save(f'{OUT}/looks-1x.png')
# 6 window
ad = over(rgba(f'{F}/keys/mibi-adult-S01-base-anchor-304x312.png'), rgba(f'{F}/overlays/mibi-adult-S01-anchor-crest-304x312.png')); ax0, ay0, ax1, ay1 = solid_box(ad)
sc = float(sys.argv[3]) if len(sys.argv) > 3 else 149 / (ay1 - ay0) * (1 if stage == 'adult' else 0.733 / 0.601)   # a measured factor given as the third argument wins (juvenile 0.5822, the P1 build's)     # juvenile: the adult factor times the proof scales' ratio (the sheets draw both stages at one world scale); an assumption, see README
bds = [near] + [Image.open(f'sitting-backdrops-near/slices/sitting-backdrop-{p}-544x408.png').convert('RGBA') for p in ('meadow', 'pond', 'rock', 'wood', 'cave')]
WL = [('charcoal and ash', 'stripes and patches', True), ('charcoal', 'none', False)]      # Dot's look and the worst coat (ruling Round 3, R3.4)
Wn = bg((214, 206, 190, 255), 544 * len(bds), 408 * 2 * len(ALL))
for r, k in enumerate(ALL):
    for li, (coat, marks, crest) in enumerate(WL):
        im = look(P[k]['base'], ldir(k), k, stage, coat, marks, crest, P[k]); f = im.resize((round(304 * sc), round(312 * sc)), Image.LANCZOS); x0, y0, x1, y1 = solid_box(f)
        for c, b in enumerate(bds): Wn.alpha_composite(over(b, f, (round(272 - (x0 + x1) / 2), 380 - (y1 - 1))), (c * 544, (r * 2 + li) * 408))
Wn.convert('RGB').save(f'{OUT}/window-1x.png'); rep['window_scale'] = round(sc, 4)
# 7 edge
E = bg((0, 0, 0, 255), 304 * 3, 312 * len(TAKES)); rep['edge'] = {}
for r, k in enumerate(TAKES):
    im = over(P[k]['base'], P[k]['crest'])
    for c, b in enumerate((bg((0, 0, 0, 255), 304, 312), bg((29, 35, 43, 255), 304, 312), crop(night))): E.alpha_composite(over(b, im), (c * 304, r * 312))
    a = np.asarray(im).astype(int); al = a[..., 3]; edge = (al > 0) & ~nd.binary_erosion(al > 0, iterations=2)
    cast = edge & (np.minimum(a[..., 0], a[..., 2]) - a[..., 1] > 30)
    rep['edge'][k] = {'magenta_cast_px_on_2px_edge': int(cast.sum()), 'alpha_1_59_px': int(((al >= 1) & (al <= 59)).sum())}
E.convert('RGB').save(f'{OUT}/edge-1x.png')
jp = f'{F}/sitting/guides/proofs.json'; Jp = json.load(open(jp)) if os.path.exists(jp) else {}; Jp[stage] = rep; json.dump(Jp, open(jp, 'w'), indent=1); print(json.dumps(rep, indent=1))
