"""PA2 step 1: the gauge, screwdriver and wrench lifted off room-bench-stage-probe (slice y = screen y - 40).
The floor runs to slice row 491 (the dark lip 492-495, the rim from 496). The three tool boxes (the spec's screen boxes, grown 8 px,
clamped to rows <= 491) are filled harmonically (Laplace, coarse to fine) from the real floor around them, low-passed: that is the
floor's tone under the tools. A tool is every pixel deviating from that tone by more than 22 (mean) or 30 (any channel), opened,
filled; its old painted shadow (pixels darker than the tone by 2+, near-neutral, within 16 px of the tool) is lifted too but not
kept. The lifted area (tool + shadow, grown 2 px, feathered 1.2) is repainted as tone + the floor's own grain from 150 rows above
(high-passed, clamped to 8). Writes stage-clean.png and tool-{gauge,screwdriver,wrench}.png (RGBA, the tool alone).
usage: python3 -I lift-tools.py STAGE.png OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
st = np.asarray(Image.open(src).convert('RGB')).astype(float); H, W = st.shape[:2]
FLOOR_LAST = 491
TOOLS = {'gauge': (97, 441, 174, 526), 'screwdriver': (199, 498, 398, 526), 'wrench': (433, 491, 571, 522)}   # screen
boxes = {}
unknown = np.zeros((H, W), bool)
for n, (x0, y0, x1, y1) in TOOLS.items():
    b = (x0 - 8, y0 - 40 - 8, x1 + 12, min(y1 - 40 + 6, FLOOR_LAST + 1)); boxes[n] = b
    unknown[b[1]:b[3], b[0]:b[2]] = True
def harmonic(img, inside, iters):
    t = img.copy()
    for _ in range(iters):
        avg = (np.roll(t, 1, 0) + np.roll(t, -1, 0) + np.roll(t, 1, 1) + np.roll(t, -1, 1)) / 4
        t[inside] = avg[inside]
    return t
RY0, RY1, RX0, RX1 = 360, 496, 60, 640                                   # the working window
lp = nd.gaussian_filter(st, (1.5, 1.5, 0))[RY0:RY1, RX0:RX1]; ins = unknown[RY0:RY1, RX0:RX1]
small = np.stack([nd.zoom(lp[..., c], 0.25, order=1) for c in range(3)], -1); ins_s = nd.zoom(ins.astype(float), 0.25, order=0) > 0.5
small = harmonic(np.where(ins_s[..., None], small.mean((0, 1)), small), ins_s, 4000)
up = np.stack([nd.zoom(small[..., c], (lp.shape[0] / small.shape[0], lp.shape[1] / small.shape[1]), order=1) for c in range(3)], -1)
tone = harmonic(np.where(ins[..., None], up, lp), ins, 600)
TONE = st.copy(); TONE[RY0:RY1, RX0:RX1] = tone
gs = np.roll(st, 150, axis=0); grain = np.clip(gs - nd.gaussian_filter(gs, (4, 4, 0)), -8, 8)
clean = st.copy()
for n, (X0, Y0, X1, Y1) in boxes.items():
    sub = st[Y0:Y1, X0:X1]; tn = TONE[Y0:Y1, X0:X1]
    dev = np.abs(sub - tn)
    obj = (dev.mean(-1) > 22) | (dev.max(-1) > 30)
    obj = nd.binary_fill_holes(nd.binary_closing(nd.binary_opening(obj, iterations=1), iterations=2))
    neutral = np.abs(sub - sub.mean(-1, keepdims=True)).max(-1) < 12
    shadow = nd.binary_dilation(obj, iterations=16) & ((tn.mean(-1) - sub.mean(-1)) > 2) & neutral
    tool = obj & ~(shadow & (sub.mean(-1) < 40))
    lab, k = nd.label(tool); sz = nd.sum(tool, lab, range(1, k + 1)); tool = np.isin(lab, [i + 1 for i, v in enumerate(sz) if v >= 30])
    rm = nd.binary_dilation(obj | shadow, iterations=2)
    w = nd.gaussian_filter(rm.astype(float), 1.2); w = np.where(rm, 1.0, w)
    clean[Y0:Y1, X0:X1] = sub * (1 - w[..., None]) + (tn + grain[Y0:Y1, X0:X1]) * w[..., None]
    a = np.where(tool, 255.0, nd.gaussian_filter(nd.binary_dilation(tool, iterations=1).astype(float), 0.6) * 255)
    ys, xs = np.where(a > 8); cut = np.dstack([sub, a])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(np.clip(np.round(cut), 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(out, f'tool-{n}.png'))
    print(n, 'cut', cut.shape[1], 'x', cut.shape[0])
Image.fromarray(np.clip(np.round(clean), 0, 255).astype(np.uint8)).save(os.path.join(out, 'stage-clean.png'))
