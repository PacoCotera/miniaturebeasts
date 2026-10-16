"""Cargo rework (AD, 10-15 20:40 commission, owner refs ref-1..10): the crate family re-cut from two Pro edits of the signed crates
(source/raw/rw-crate-sealed.jpg, rw-crate-open.jpg: the ref-4 hard case, yellow shell, black rubber corners, black latches and
handle, a black label plate with a white egg). Each edit is fitted onto the signed crate's bounding box in its 432x272 canvas (so the
id, size and rect are kept), keyed from its flat grey ground by colour distance (soft 2 px edge, the grey unmixed from the edge pixels).
usage: python3 -I cut-crates.py SLICES_DIR"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sl = sys.argv[1]
def cut(raw, ref):
    o = np.asarray(Image.open(f'{sl}/{ref}.png').convert('RGBA')); ys, xs = np.where(o[..., 3] > 127)
    ob = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    r = np.asarray(Image.open(raw).convert('RGB')).astype(float)
    g = np.median(np.concatenate([r[:20].reshape(-1, 3), r[-20:].reshape(-1, 3), r[:, :20].reshape(-1, 3), r[:, -20:].reshape(-1, 3)]), axis=0)
    d = np.linalg.norm(r - g, axis=-1)
    fg = nd.binary_opening(d > 30, iterations=3); lab, k = nd.label(fg); sz = nd.sum(fg, lab, range(1, k + 1)); fg = nd.binary_fill_holes(lab == (np.argmax(sz) + 1))
    ys2, xs2 = np.where(fg); rb = (xs2.min(), ys2.min(), xs2.max() + 1, ys2.max() + 1)
    sx, sy = (ob[2] - ob[0]) / (rb[2] - rb[0]), (ob[3] - ob[1]) / (rb[3] - rb[1])
    a = np.clip((d - 12) / 26, 0, 1) * nd.binary_dilation(fg, iterations=2)          # soft alpha from the colour distance, only near the subject
    a = np.where(nd.binary_erosion(fg, iterations=3), 1.0, a)
    W, H = round(r.shape[1] * sx), round(r.shape[0] * sy)
    rgb = np.asarray(Image.fromarray(r.astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(float)
    al = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(float) / 255
    ox, oy = round(ob[0] - rb[0] * sx), round(ob[1] - rb[1] * sy)
    out = np.zeros((272, 432, 4))
    y0, y1 = max(0, oy), min(272, oy + H); x0, x1 = max(0, ox), min(432, ox + W)
    c = rgb[y0 - oy:y1 - oy, x0 - ox:x1 - ox]; aa = al[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    un = (c - (1 - aa[..., None]) * g) / np.maximum(aa[..., None], 0.05)                # unmix the grey from the edge
    out[y0:y1, x0:x1, :3] = np.clip(un, 0, 255); out[y0:y1, x0:x1, 3] = np.where(aa < 0.04, 0, aa) * 255
    out[out[..., 3] == 0, :3] = 0
    return Image.fromarray(np.round(out).astype(np.uint8), 'RGBA')
if __name__ == '__main__':
    import os
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    for raw, ref in (('rw-crate-sealed', 'crate-sealed-432x272'), ('rw-crate-open', 'crate-open-432x272')):
        cut(os.path.join(root, 'source/raw', raw + '.jpg'), ref).save(os.path.join(sys.argv[2] if len(sys.argv) > 2 else sl, ref + '.png'))
        print(ref)
