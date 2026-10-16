# S04 stripe contrast (art director 15:46; programme lead's go 15:48): the striped base is one Pro edit of the signed
# stand's raw (trait-S04-stripes-base-a). Cut with the topline keys' method and transform (registered to the signed stand),
# the stripe region is where the striped key is darker than the plain key; the three looks are recolours of that region
# only: faint = 30 % of the painted stripe over the plain coat, between = as painted, bold = 140 %. No new pixel outside it.
# usage: python3 -I cut-stripes.py PODS_ROOT
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; O = f'{P}/floor/S04/stripes'
src = open(f'{P}/adult/cut-adults.py').read()
exec(src[src.index('def cut_adult(a):'):src.index('im, ground, cx, w = cut_adult(')])
T = json.load(open(f'{P}/floor/S04/topline/cut-topline.json'))
cuts = {k: cut_adult(np.asarray(Image.open(f'{P}/source/raw/{v}.jpg').convert('RGB')).astype(float))[0] for k, v in
        {'plain': 'mibi-juvenile-S04-a', 'striped': 'trait-S04-stripes-base-a'}.items()}
log = {}
for (W, H) in [(304, 312), (104, 112), (96, 88)]:
    sc = T[f'{W}x{H}']['scale']; ox, oy = T[f'{W}x{H}']['offset']; L = {}
    for k, im in cuts.items():
        a = np.asarray(im); body = a.copy(); body[a[..., 3] != 255] = 0
        p = Image.fromarray(body).resize((round(a.shape[1] * sc), round(a.shape[0] * sc)), Image.LANCZOS); pa = np.asarray(p).copy()
        pa[..., 3] = np.where(pa[..., 3] >= 128, 255, 0); pa[pa[..., 3] == 0] = 0
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(ox), round(oy))); L[k] = np.asarray(c).astype(float)
    pl, st = L['plain'], L['striped']
    both = (pl[..., 3] == 255) & (st[..., 3] == 255)
    dark = (pl[..., :3].mean(-1) - st[..., :3].mean(-1))
    region = both & (dark > 10)
    region = nd.binary_opening(region, iterations=1) if W > 100 else region
    Image.fromarray((region * 255).astype(np.uint8)).save(f'{O}/mibi-juvenile-S04-stripes-region-{W}x{H}.png')
    for look, t in [('faint', 0.3), ('between', 1.0), ('bold', 1.4)]:
        out = st.copy()                                                   # the edit's own coat everywhere; only the stripe region is recoloured
        mix = pl[..., :3] + t * (st[..., :3] - pl[..., :3])
        out[region, :3] = np.clip(mix[region], 0, 255)
        o = out.round().astype(np.uint8); Image.fromarray(o).save(f'{O}/mibi-juvenile-S04-stripes-{look}-{W}x{H}-body.png')
        r, g, b = [o[..., i].astype(int) for i in range(3)]; al = o[..., 3] == 255
        mag = int((al & (g < 0.6 * np.minimum(r, b)) & (np.abs(r - b) < 70) & (np.minimum(r, b) > 60)).sum())
        log.setdefault(f'{W}x{H}', {})[look] = {'stripe_px': int(region.sum()), 'magenta_px': mag}
json.dump(log, open(f'{O}/cut-stripes.json', 'w'), indent=1); print(json.dumps(log))
