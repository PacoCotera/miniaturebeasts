import os
"""T-20261015-05 step 2: the Library spread's masters, by hand over the fitted painted journal (fit-book.py), 0 MXN.
- library-stage-spread-1024x522: the journal (boards, two aged pages, the fold, the ribbon) + the sixteen empty ruled frames, each
  96x112 at the spread's places, printed into the paper: a 1 px bark ink rule, an 8 px mat a step darker than the page with a
  slight emboss (its outer edge lit on the top and left, shaded on the bottom and right; the inner edge the reverse, a shallow
  recess where a plate is tipped in), a soft 2 px shade under the mat to the lower right; one 1 px clay caption rule under each
  frame (y 256 and 440 screen), 96 wide. No plates, no rules over frames, no words.
- spread-plate-{S01,S02,S03,S09}-80x96: the found plate, tipped in: the species' painted type (mibi-adult-SNN-304x312, or for S09
  its painted adult source/raw/mibi-adult-S09-a.jpg keyed from magenta) downsampled (never enlarged) bottom-anchored on a printed
  plate ground (warm off-white, a soft vignette, a 1 px darker plate-mark), with a soft contact shadow.
- marks, every one at least 12 px:
  * clan-roundel-{C01..C16}-16x16 (new size, was 12x12): the clan's shape from its signed mark-clan-Cnn-24x24 (circle, hexagon,
    square, diamond, pentagon, pill, with the centre dot), drawn at 16 in the clan's ink (clanColours), as a stamp on paper.
  * spread-progress-{full,empty}-12x12 (new size, was 8x8): a pressed seed, inked full (bark, lit top-left, shaded lower-right),
    or its outline in clay on the paper.
  * spread-gilt-corner-16x16: a gilt photo corner (a triangle pocket along the top and right edges) in gold leaf, lit top-left.
  * spread-seal-16x16: guide-seal-32 downsampled.
usage: STATION_PALETTE=<public>/prototypes/ui/palettes/station.json python3 make-spread.py BOOK.png SLICES_DIR OUT_DIR"""
import sys, os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
book, sl, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
pal = {k: np.array([int(v[i:i + 2], 16) for i in (1, 3, 5)], float) for k, v in json.load(open(os.environ.get('STATION_PALETTE', 'station.json')))['colours']}
def save(a, n): Image.fromarray(np.clip(np.round(a), 0, 255).astype(np.uint8), 'RGBA' if a.shape[-1] == 4 else 'RGB').save(os.path.join(out, n + '.png'))
st = np.asarray(Image.open(book).convert('RGB')).astype(float); H, W = st.shape[:2]
# ---- the frames (slice y = screen y - 40)
places = [(x, y) for y in (112, 296) for x in (48, 160, 272, 384, 544, 656, 768, 880)]
yy, xx = np.mgrid[0:H, 0:W]
shade = np.zeros((H, W)); lit = np.zeros((H, W)); mat = np.zeros((H, W), bool); rule = np.zeros((H, W), bool); inner_lit = np.zeros((H, W)); inner_sh = np.zeros((H, W))
for x, y in places:
    y -= 40
    box = (xx >= x) & (xx < x + 96) & (yy >= y) & (yy < y + 112)
    inn = (xx >= x + 8) & (xx < x + 88) & (yy >= y + 8) & (yy < y + 104)
    mat |= box & ~inn
    rule |= box & ~((xx >= x + 1) & (xx < x + 95) & (yy >= y + 1) & (yy < y + 111))
    lit += ((yy == y + 1) & (xx >= x + 1) & (xx < x + 95)) | ((xx == x + 1) & (yy >= y + 1) & (yy < y + 111))
    lit += 0.0
    sh = ((yy == y + 110) & (xx >= x + 1) & (xx < x + 95)) | ((xx == x + 94) & (yy >= y + 1) & (yy < y + 111))
    shade += sh
    inner_sh += ((yy == y + 8) & (xx >= x + 8) & (xx < x + 88)) | ((xx == x + 8) & (yy >= y + 8) & (yy < y + 104))
    inner_lit += ((yy == y + 103) & (xx >= x + 8) & (xx < x + 88)) | ((xx == x + 87) & (yy >= y + 8) & (yy < y + 104))
    rule_c = (yy == y + 144) & (xx >= x) & (xx < x + 96)
    st[rule_c] = st[rule_c] * 0.45 + pal['clay'] * 0.55
# cast shade of each frame onto the page, lower right
drop = np.zeros((H, W))
for x, y in places:
    y -= 40; m = np.zeros((H, W)); m[y + 2:y + 114, x + 2:x + 98] = 1; drop = np.maximum(drop, m)
drop = nd.gaussian_filter(drop, 1.6) * (1 - nd.binary_dilation(mat | rule | np.zeros_like(mat), iterations=0))
frames_in = np.zeros((H, W), bool)
for x, y in places: frames_in[y - 40:y - 40 + 112, x:x + 96] = True
st = np.where((~frames_in)[..., None], st * (1 - 0.18 * drop[..., None]), st)
st = np.where(mat[..., None], st * 0.9, st)                                         # the mat a step darker than the page
st = np.where((lit > 0)[..., None], st * 1.06 + 4, st)
st = np.where((shade > 0)[..., None], st * 0.78, st)
st = np.where((inner_sh > 0)[..., None], st * 0.8, st)
st = np.where((inner_lit > 0)[..., None], st * 1.05 + 3, st)
st = np.where(rule[..., None], st * 0.35 + pal['bark'] * 0.65, st)
save(st, 'library-stage-spread-1024x522')
# ---- the plates
def plate(src_rgba, n):
    P = np.zeros((96, 80, 4)); g = np.array([243, 233, 212.])
    vy, vx = np.mgrid[0:96, 0:80]; v = 1 - 0.07 * (((vx - 40) / 40) ** 2 + ((vy - 48) / 48) ** 2)
    P[..., :3] = g * v[..., None]; P[..., 3] = 255
    P[[0, -1], :, :3] *= 0.86; P[:, [0, -1], :3] *= 0.86
    a = src_rgba.astype(float); ys, xs = np.where(a[..., 3] > 16); sub = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sc = min(70 / sub.shape[1], 80 / sub.shape[0], 1.0); w, h = max(1, round(sub.shape[1] * sc)), max(1, round(sub.shape[0] * sc))
    pm = np.dstack([sub[..., :3] * sub[..., 3:] / 255, sub[..., 3:]])
    r = np.asarray(Image.fromarray(np.clip(np.round(pm), 0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    al = r[..., 3:] / 255; rgb = np.where(al > 0, r[..., :3] / np.maximum(al, 1e-6), 0)
    x0, y0 = (80 - w) // 2, 96 - 7 - h
    shad = np.zeros((96, 80)); cy = 96 - 8; shad = np.clip(1 - np.hypot((vx - 40 - 2) / (w * 0.42 + 2), (vy - cy) / 3.2), 0, 1) ** 1.5 * 0.35
    P[..., :3] *= (1 - shad[..., None])
    reg = P[y0:y0 + h, x0:x0 + w, :3]; P[y0:y0 + h, x0:x0 + w, :3] = reg * (1 - al) + rgb * al
    save(P, f'spread-plate-{n}-80x96')
for n in ('S01', 'S02', 'S03'):
    plate(np.asarray(Image.open(os.path.join(sl, f'mibi-adult-{n}-304x312.png')).convert('RGBA')), n)
r9 = np.asarray(Image.open(os.path.join(sl, '..', 'source', 'raw', 'mibi-adult-S09-a.jpg')).convert('RGB')).astype(float)
mag = np.minimum(r9[..., 0], r9[..., 2]) - r9[..., 1]
fg = nd.binary_opening(mag < 70, iterations=2); lab, k = nd.label(fg); sz = nd.sum(fg, lab, range(1, k + 1)); fg = nd.binary_fill_holes(lab == (np.argmax(sz) + 1))
a9 = np.clip((90 - mag) / 60, 0, 1) * nd.binary_dilation(fg, iterations=2); a9 = np.where(nd.binary_erosion(fg, iterations=2), 1, a9)
un = np.clip((r9 - (1 - a9[..., None]) * np.array([255, 0, 255.])) / np.maximum(a9[..., None], 0.05), 0, 255)
plate(np.dstack([un, a9 * 255]), 'S09')
# ---- marks
S = 8
def ss(fn, w, h):
    y, x = (np.mgrid[0:h * S, 0:w * S] + .5) / S; return fn(x, y).reshape(h, S, w, S).mean((1, 3))
clan = {'C01': 'tealD', 'C02': 'sea', 'C03': 'leaf', 'C04': 'plum', 'C05': 'bark', 'C06': 'river', 'C07': 'pine', 'C08': 'magenta', 'C09': 'soil', 'C10': 'deep', 'C11': 'forest', 'C12': 'plumD', 'C13': 'wine', 'C14': 'rock', 'C15': 'sageD', 'C16': 'stone'}
for c, role in clan.items():
    m = np.asarray(Image.open(os.path.join(sl, f'mark-clan-{c}-24x24.png')).convert('RGBA')).astype(float)[..., 3] / 255
    big = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((16 * S, 16 * S), Image.BICUBIC)).astype(float) / 255
    a = big.reshape(16, S, 16, S).mean((1, 3)); a = np.clip(a * 1.25, 0, 1)
    ink = pal[role]; rng = np.random.RandomState(int(c[1:]))
    col = ink[None, None] * (0.92 + 0.08 * rng.rand(16, 16, 1))
    save(np.dstack([col, a * 235]), f'clan-roundel-{c}-16x16')
# progress seeds 12x12
def seed(x, y):
    u, v = (x - 6) / 4.6, (y - 6.2) / 5.6; return u * u + v * v
d = ss(lambda x, y: (seed(x, y) <= 1).astype(float), 12, 12)
lam = ss(lambda x, y: np.clip(0.6 - ((x - 6) / 4.6 * 0.55 + (y - 6.2) / 5.6 * 0.62) * 0.6, 0, 1) * (seed(x, y) <= 1), 12, 12)
full = pal['bark'][None, None] * (0.7 + 0.7 * lam[..., None]); full = np.dstack([full, d * 255])
ring = ss(lambda x, y: ((seed(x, y) <= 1) & (seed(x, y) >= 0.55)).astype(float), 12, 12)
empty = np.dstack([np.zeros((12, 12, 3)) + pal['clay'], ring * 255])
save(full, 'spread-progress-full-12x12'); save(empty, 'spread-progress-empty-12x12')
# gilt corner 16x16: a photo-corner pocket along the top and right edges
tri = ss(lambda x, y: ((x - y) >= 0).astype(float) * (x <= 16) * (y >= 0), 16, 16)
lg = ss(lambda x, y: np.clip(0.75 - (x / 16 * 0.2 + y / 16 * 0.9) * 0.6, 0, 1), 16, 16)
gold = pal['gold'][None, None] * (0.75 + 0.55 * lg[..., None]); edge = ss(lambda x, y: (np.abs(x - y) < 1.2).astype(float), 16, 16)
gold = gold * (1 - 0.35 * edge[..., None])
save(np.dstack([gold, tri * 255]), 'spread-gilt-corner-16x16')
s32 = Image.open(os.path.join(sl, 'guide-seal-32.png')).convert('RGBA')
pm = np.asarray(s32).astype(float); pre = np.dstack([pm[..., :3] * pm[..., 3:] / 255, pm[..., 3:]]).astype(np.uint8)
r = np.asarray(Image.fromarray(pre, 'RGBA').resize((16, 16), Image.LANCZOS)).astype(float); al = r[..., 3:] / 255
save(np.dstack([np.where(al > 0, r[..., :3] / np.maximum(al, 1e-6), 0), r[..., 3:]]), 'spread-seal-16x16')
print('ok')
