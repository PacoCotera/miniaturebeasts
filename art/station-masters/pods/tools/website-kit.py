"""0 MXN finish of the website kit edit (website-hero-kit-caddy-a): the printed stamp is replaced by the true stamp
(Pip's genome, encoder output, bilevel) warped onto the edit's paper; the retired words on the device are wiped by hand,
and the key words PRINT, FEED, CALL, BACK and CONFIRM healed from their ground (step 4).
usage: python3 -I tools/website-kit.py  -> source/website/hero-kit-2026-10-1536x1024.png"""
from PIL import Image, ImageFilter, ImageDraw
import numpy as np, os
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
im = Image.open(P + 'source/raw/website-hero-kit-caddy-a.jpg').convert('RGB')
def coeffs(dst, src):
    m = []; b = []
    for (x, y), (u, v) in zip(dst, src):
        m += [[x, y, 1, 0, 0, 0, -u*x, -u*y], [0, 0, 0, x, y, 1, -v*x, -v*y]]; b += [u, v]
    return np.linalg.solve(np.array(m, float), np.array(b, float)).tolist()
# 1 the stamp: the edit's perforation corners (native px) <- the true stamp's outer dot centres
quad = [(1802, 1302), (2052, 1320), (2028, 1578), (1768, 1558)]
st = Image.open(P + 'source/website/stamp-pip-print-20mm-203dpi.png').convert('L')
s0, s1 = 8 + 3, 164 - 3                       # dot centres of the perforation (cells 6.9 px)
src = [(s0, s0), (s1, s0), (s1, s1), (s0, s1)]
W, H = im.size
big = st.resize((st.width * 8, st.height * 8), Image.NEAREST)
ink = big.transform((W, H), Image.PERSPECTIVE, coeffs(quad, [(x * 8, y * 8) for x, y in src]), Image.BICUBIC, fillcolor=255)
area = Image.new('L', (W, H), 0); ImageDraw.Draw(area).polygon(quad, fill=255)
area = area.filter(ImageFilter.MaxFilter(41))
a = np.array(im).astype(np.float32); L = np.array(im.convert('L')).astype(np.float32)
paper = (L > 170).astype(np.float32)          # the paper's own pixels, without the edit's ink
blur = lambda arr, r: np.array(Image.fromarray(arr).filter(ImageFilter.GaussianBlur(r)), np.float32)
num = np.stack([blur((a[..., c] * paper).astype(np.uint8), 18) for c in range(3)], -1); den = blur((paper * 255).astype(np.uint8), 18)[..., None] / 255 + 1e-3
fill = num / den
m = np.array(area, np.float32)[..., None] / 255
base = a * (1 - m) + fill * m
inkf = 1 - np.array(ink, np.float32)[..., None] / 255           # 1 where black
inkf = np.array(Image.fromarray((inkf[..., 0] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32)[..., None] / 255
out = base * (1 - 0.88 * inkf) + np.array([22, 21, 20], np.float32) * 0.0
out = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).resize((1536, 1024), Image.LANCZOS)
# 2 everything else from the concept: the edit drifted the Station screen's strings ("Gato", "Eroence"), so only the
#   e-ink panel and the printer's paper are taken from it, each at its measured offset (the edit is 0.65 % wider)
conc = Image.open(P + 'source/website/hero-kit-concept-1536x1024.png').convert('RGB')
def take(dst, src, box, dx):
    x0, y0, x1, y1 = box
    piece = src.crop((x0 + dx, y0, x1 + dx, y1))
    m = Image.new('L', piece.size, 0); ImageDraw.Draw(m).rectangle((6, 6, piece.width - 7, piece.height - 7), fill=255)
    dst.paste(piece, (x0, y0), m.filter(ImageFilter.GaussianBlur(3)))
take(conc, out, (356, 686, 930, 880), 0)
take(conc, out, (1026, 748, 1298, 998), 2)
out = conc
# 3 the retired words, wiped by hand: the key labels (keys carry no words, ruling of 10-10; HABITAT is a retired room)
def clear_band(img, x0, x1, top, h):
    a = np.array(img).astype(np.float32)
    for x in range(x0, x1):
        up = a[top-3:top, x].mean(axis=0); dn = a[top+h:top+h+3, x].mean(axis=0)
        for i, y in enumerate(range(top, top + h)):
            f = (i + 0.5) / h; a[y, x] = up * (1 - f) + dn * f
    return Image.fromarray(a.astype(np.uint8))
out = clear_band(out, 352, 650, 606, 27)
# "Research · Hopper pod" on the concept's Station screen: the retired species word wiped to the bar's own ground
out = clear_band(out, 402, 512, 208, 18)
# the concept's own drift "Excence" under the droplet: wiped and set again as "Essence" (Inter SemiBold 11, the label's colour and baseline)
from PIL import ImageFont
out = clear_band(out, 776, 821, 214, 14)
f = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 11)
d = ImageDraw.Draw(out); w = d.textlength('Essence', font=f)
d.text((797 - w / 2, 212), 'Essence', font=f, fill=(226, 231, 240))
# 4 the key words left by the first pass (the 10-10 ruling: keys carry no words): PRINT on the print key, FEED under the
#   feed key, CALL, BACK and CONFIRM on the Companion; each label's box refilled from the ground on its four edges
#   (a Coons patch smoothed by diffusion), boxes measured at 1x so no edge touches the d-pad, the ledge or a key's rim
def heal(img, box, it=400):
    a = np.array(img.convert('RGB')).astype(np.float32); x0, y0, x1, y1 = box
    T = a[y0-1, x0-1:x1+1]; B = a[y1, x0-1:x1+1]; Lf = a[y0-1:y1+1, x0-1]; R = a[y0-1:y1+1, x1]
    v = np.linspace(0, 1, y1 - y0 + 2)[:, None, None]; u = np.linspace(0, 1, x1 - x0 + 2)[None, :, None]
    Q = (1-v)*T[None] + v*B[None] + (1-u)*Lf[:, None] + u*R[:, None] - ((1-u)*(1-v)*T[0] + u*(1-v)*T[-1] + (1-u)*v*B[0] + u*v*B[-1])
    for _ in range(it): Q[1:-1, 1:-1] = (Q[:-2, 1:-1] + Q[2:, 1:-1] + Q[1:-1, :-2] + Q[1:-1, 2:]) / 4
    a[y0:y1, x0:x1] = Q[1:-1, 1:-1]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
for box in [(956, 770, 1001, 788),    # PRINT, light on the dark key
            (955, 859, 998, 876),     # FEED
            (1026, 643, 1058, 655),   # CALL
            (1153, 647, 1190, 660),   # BACK
            (1211, 638, 1270, 651)]:  # CONFIRM
    out = heal(out, box)
out.save(P + 'source/website/hero-kit-2026-10-1536x1024.png')
print('ok')
