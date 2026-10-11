# S05 walk set from the edited sheet (motion-S05-juvenile-pass-b, the programme lead's go 16:03): the edit repainted every
# cell, so the whole set comes from it, so pass, steps, crouch and curl are one rendering. Keyed with the adult cut's method
# (component shadow, defringe: 0 magenta), at the old sheet's scale 0.405, feet on row 305, centred by the stand-in's centre.
# usage: cut-s05b.py PODS_ROOT
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
P = sys.argv[1]; K = f'{P}/concepts/mibi-motion-proof/keys-b'
src = open(f'{P}/adult/cut-adults.py').read()
exec(src[src.index('def cut_adult(a):'):src.index('im, ground, cx, w = cut_adult(')])
A = np.asarray(Image.open(f'{P}/source/raw/motion-S05-juvenile-pass-b.jpg').convert('RGB')).astype(float); h, w = A.shape[:2]
st = np.asarray(Image.open(f'{P}/juvenile/mibi-juvenile-S05-304x312.png'))[..., 3] > 200; sx = np.where(st.any(0))[0]; CX = (sx.min() + sx.max()) / 2
SC, I = 0.405, 6
for i, k in enumerate(['pass', 'stepA', 'stepB', 'crouch', 'curl']):
    y0, x0 = (i // 3) * h // 2, (i % 3) * w // 3
    im, ground, cx, ww = cut_adult(A[y0 + I:y0 + h // 2 - I, x0 + I:x0 + w // 3 - I])
    p = im.resize((round(im.width * SC), round(im.height * SC)), Image.LANCZOS); pa = np.asarray(p).copy(); al = pa[..., 3]
    pa[..., 3] = np.where(al >= 200, 255, np.where(al >= 60, np.minimum(al, 110), 0)); pa[pa[..., 3] == 0] = 0
    r_, g_, b_ = [pa[..., i].astype(int) for i in range(3)]
    pa[(pa[..., 3] > 0) & (((g_ < 0.75 * np.minimum(r_, b_)) & (np.abs(r_ - b_) < 90) & (np.minimum(r_, b_) > 50)) | ((b_ > g_ + 30) & (r_ > g_ + 60)))] = 0   # the resized edge's magenta and hot-pink cast (orange fur keeps blue below green)
    for _ in range(2):                                                     # the outer ring, twice: an edge pixel with blue at or above green is the magenta's tint (the orange fur keeps blue well below green)
        body = pa[..., 3] >= 200; ring = body & ~nd.binary_erosion(body)
        r_, g_, b_ = [pa[..., i].astype(int) for i in range(3)]
        pa[ring & (b_ >= g_ - 5)] = 0
    c = Image.new('RGBA', (304, 312), (0, 0, 0, 0)); c.alpha_composite(Image.fromarray(pa), (round(CX - cx * SC), round(305 - ground * SC)))
    c.save(f'{K}/juv-S05-{k}-304x312.png')
    a = np.asarray(c).astype(int); r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    print(k, 'magenta', int(((al > 0) & (g < 0.6 * np.minimum(r, b)) & (np.abs(r - b) < 70) & (np.minimum(r, b) > 60)).sum()))
