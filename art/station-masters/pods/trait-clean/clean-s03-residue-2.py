"""The S03 scales and claws plates' residue, round 2 (the art director's cut; round 1's saturation rule missed it).
Measured: on the scales crops the residue is (1) near-black blocks, ~125 luma under the fur round them, and (2) a blocky
grey-green trail in the warm cream fur (blue at or above red where the fur's 9x9 median is warm, r - b >= 12), ~40 luma under it;
on the claws crops it is a dotted ring ~50 luma under both the leg's cream highlight and the fur, hugging the highlight.
Rules, inside the plate's content (8 px in, alpha 255): scales: luma 70+ under the 9x9 median luma, or (warm median, b >= r - 6,
luma 20+ under the median); claws: within 3 px of the highlight (luma >= 230) and luma 15+ under the median. The mask grows by
1 px and is filled from its unmasked neighbours, ring by ring; nothing else moves.
Run twice (the second pass, over the first's output, takes what the first pass's medians hid: the scales' dark marks at 45+
under the median, the claws' ring ends).
usage: clean-s03-residue-2.py IN.png OUT.png scales|claws [2]"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
src, dst, kind = sys.argv[1:4]; second = len(sys.argv) > 4
a = np.asarray(Image.open(src).convert('RGBA')).astype(float); rgb = a[..., :3]; H, W = rgb.shape[:2]
L = rgb @ [.2126, .7152, .0722]; ch = rgb.max(-1) - rgb.min(-1)
mL = nd.median_filter(L, 9); mc = nd.median_filter(ch, 9)
inner = np.zeros((H, W), bool); inner[8:H - 8, 8:W - 8] = True; inner &= a[..., 3] == 255
mr = nd.median_filter(rgb[..., 0], 9); mb = nd.median_filter(rgb[..., 2], 9)
if kind == 'scales':
    res = inner & ((L < mL - (45 if second else 70)) | ((mr - mb >= 12) & (rgb[..., 2] >= rgb[..., 0] - 6) & (L < mL - 20)))
else:
    res = inner & nd.binary_dilation(L >= 230, iterations=3) & (L < mL - 15)
mask = nd.binary_dilation(res, iterations=1) & inner
out = rgb.copy(); known = ~mask
for _ in range(40):
    if known.all(): break
    s = nd.convolve(np.where(known[..., None], out, 0), np.ones((3, 3, 1))); n = nd.convolve(known.astype(float), np.ones((3, 3)))
    edge = ~known & (n > 0); out[edge] = s[edge] / n[edge][:, None]; known |= edge
o = a.copy(); o[..., :3] = np.round(out)
Image.fromarray(o.astype(np.uint8), 'RGBA').save(dst)
print(src.split('/')[-1], 'px', int(mask.sum()))
