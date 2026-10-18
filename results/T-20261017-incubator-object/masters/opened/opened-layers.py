# The opened pod's renderer layers (the bowl and the tipped cap), from the neutral painting, so every species' pod opens
# in its own colours with the same compose as the closed pod (podlayers.composePod: shade x2, body and accent masks,
# pattern). The bowl is the closed pod with its top broken away, in the same view, so its body/accent split and its
# patterns are carried from pod-large's layers by mapping pod-large's body (from the band down) onto the bowl's body
# (from below its broken rim down), box to box. The cap is accent throughout and carries no pattern.
#   python3 -I opened-layers.py PODS_DIR CUT_DIR OUT_DIR
import sys, os, glob, numpy as np
from PIL import Image, ImageFilter
PODS, CUT, OUT = sys.argv[1:4]; os.makedirs(OUT, exist_ok=True)
L = lambda n: Image.open(f'{PODS}/pod-large-{n}.png').convert('RGBA')
bowl = Image.open(glob.glob(f'{CUT}/pod-opened-bowl-shade-*.png')[0]).convert('RGBA')
cap = Image.open(glob.glob(f'{CUT}/pod-opened-cap-shade-*.png')[0]).convert('RGBA')
W = 144                                                                  # pod-large's width
bowl = bowl.resize((W, round(bowl.height * W / bowl.width)), Image.LANCZOS)
# the cap at its true size: the closed pod's cap is about 0.62 of its width (about 90 at pod-large), so the painted cap's
# long axis is reduced to 92; then it is pre-tilted 14 degrees outward (its top leaning away from the bowl), offline
k = 92 / cap.height
cap = cap.resize((round(cap.width * k), 92), Image.LANCZOS).rotate(14, resample=Image.BICUBIC, expand=True)
cap = cap.crop(cap.getbbox())
def shade(im):                                                           # neutral grey, mean matched to pod-large's shade
    a = np.asarray(im).astype(float); m = a[..., 3] > 128
    g = a[..., 0] * (134 / a[m][:, 0].mean())
    return Image.fromarray(np.dstack([g, g, g, a[..., 3]]).clip(0, 255).astype(np.uint8), 'RGBA')
def rim_line(a):                                                         # per column, the lowest row of the broken rim's opening
    al = a[..., 3] > 128; g = a[..., 0]
    inner = al & (g < np.percentile(g[al], 30))                          # the dark inside of the bowl, seen through the rim
    inner[int(a.shape[0] * 0.35):] = False                               # the opening is in the top third
    rows = np.nonzero(inner.any(1))[0]
    return rows.max() if len(rows) else 0
ba = np.asarray(bowl).astype(float); h = ba.shape[0]
y_rim = rim_line(ba)
g = ba[..., 0]; al = ba[..., 3] > 128
inside = al & (g < np.percentile(g[al], 30)); inside[int(h * 0.35):] = False
inside = np.asarray(Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
                    .filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255
outer = 1 - inside
src_top, src_bot = 45, 176                                               # pod-large from mid-band down: the bowl's whole height
def carried(name):
    s = L(name).crop((0, src_top, 144, src_bot))
    s = s.resize((W, h), Image.LANCZOS)
    o = np.asarray(s).astype(float); o[..., 3] *= ba[..., 3] / 255 * outer   # never on the bowl's inside
    return Image.fromarray(o.astype(np.uint8), 'RGBA')
shade(bowl).save(f'{OUT}/pod-opened-bowl-shade.png')
acc = carried('mask-accent'); body = np.asarray(bowl).astype(float).copy()
aa = np.asarray(acc).astype(float)[..., 3]
body[..., :3] = 255; body[..., 3] = ba[..., 3] * (1 - aa / 255)                    # body = the bowl less its accent (inside included)
Image.fromarray(body.astype(np.uint8), 'RGBA').save(f'{OUT}/pod-opened-bowl-mask-body.png')
acc.save(f'{OUT}/pod-opened-bowl-mask-accent.png')
for p in sorted(glob.glob(f'{PODS}/pod-large-pattern-*.png')):
    n = os.path.basename(p)[len('pod-large-'):-4]
    carried(n).save(f'{OUT}/pod-opened-bowl-{n}.png')
ca = np.asarray(cap).astype(float)
shade(cap).save(f'{OUT}/pod-opened-cap-shade.png')
z = np.zeros_like(ca); z[..., :3] = 255; z[..., 3] = 0
Image.fromarray(z.astype(np.uint8), 'RGBA').save(f'{OUT}/pod-opened-cap-mask-body.png')
z[..., 3] = ca[..., 3]; Image.fromarray(z.astype(np.uint8), 'RGBA').save(f'{OUT}/pod-opened-cap-mask-accent.png')
print('bowl', bowl.size, 'rim row', y_rim, '| cap', cap.size)
