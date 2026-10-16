# S01's adult stand-in is Pip (ad-adult-plan.md: "S01 = Pip, placed 1:1, shadow and small sizes by hand"), from the accepted
# art/miniature-lives/assets/rich-plain-300x310.png. Pip's body is alpha 224-254 with soft edges, and its painted shadow is a soft
# alpha fall under the feet. The family's form is a hard body and the house shadow (#1e1a22 at alpha 110), so:
#   body   = alpha >= 192, one component (stray specks dropped), holes filled, made opaque with its own colour
#   shadow = the soft pixels under the feet (below the body's lowest fifth, alpha 16-191), closed, as the house shadow
# Then the family's fit (cut-adults.py): 304x312 1:1 (Pip is 288 tall, under the 296 cap), the ground row on 305, centred;
# 144x152 x0.4737 (feet 145); 96x88 x0.276 (feet 85); 48x48 refit to 44 (feet 44).
# usage: python3 -I cut-pip.py REPO_ROOT PODS_ROOT
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
R, P = sys.argv[1:3]
a = np.asarray(Image.open(f'{R}/art/miniature-lives/assets/rich-plain-300x310.png').convert('RGBA')).astype(float)
al = a[..., 3]
body = al >= 192
lab, n = nd.label(body); sz = nd.sum(body, lab, range(1, n + 1)); body = lab == 1 + int(np.argmax(sz))
body = nd.binary_fill_holes(body)
ys = np.where(body.any(1))[0]; top, foot = ys.min(), ys.max()
low = np.arange(a.shape[0])[:, None] > top + 0.8 * (foot - top)
soft = (al >= 16) & (al < 192) & low & ~body
lab2, n2 = nd.label(nd.binary_dilation(soft, iterations=2)); keep = np.zeros(soft.shape, bool)
for i in range(1, n2 + 1):
    c = lab2 == i
    if (c & soft).sum() >= 40 and (c & nd.binary_dilation(body, iterations=3)).any(): keep |= c & soft   # a shadow touches the feet; specks do not
shadow = nd.binary_closing(keep, iterations=2) & ~body
rgb = np.where(body[..., None], a[..., :3] / np.maximum(al[..., None], 1) * 255, 0)                     # un-premultiply the soft edge so it does not grey
rgb = np.where(body[..., None], np.where(al[..., None] >= 250, a[..., :3], rgb), np.array([30, 26, 34]))
alpha = np.where(body, 255, np.where(shadow, 110, 0))
im = Image.fromarray(np.dstack([rgb.clip(0, 255), alpha]).astype(np.uint8), 'RGBA')
ground = max(foot, np.where(shadow.any(1))[0].max() - 3) if shadow.any() else foot
xs = np.where(body.any(0))[0]; cx = (xs.min() + xs.max()) / 2; w = xs.max() - xs.min() + 1
def fit(W, Hc, feet, sc):
    p = im if sc == 1 else im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
    pa = np.asarray(p).copy(); a_ = pa[..., 3]
    pa[..., 3] = np.where(a_ >= 200, 255, np.where(a_ >= 60, np.minimum(a_, 110), 0)) if W > 48 else np.where(a_ >= 128, np.where(a_ > 200, 255, 110), 0)
    c = Image.new('RGBA', (W, Hc), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(W / 2 - cx * sc), round(feet - ground * sc)))
    c.save(f'{P}/adult/mibi-adult-S01-{W}x{Hc}.png'); return (round(W / 2 - cx * sc), round(feet - ground * sc))
o = fit(304, 312, 305, 1.0); fit(144, 152, 145, 0.4737); fit(96, 88, 85, 0.276); fit(48, 48, 44, min(44 / (ground - top + 1), 44 / w))
print('S01 Pip: height', foot - top + 1, 'ground', ground, 'placed at', o, 'shadow px', int(shadow.sum()), 'specks dropped', int(((al > 0) & ~body & ~shadow).sum()))
