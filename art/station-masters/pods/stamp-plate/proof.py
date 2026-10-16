#!/usr/bin/env python3
"""T-20261016-16 proof: a whole capture with the plate master composed 1:1 at (804, 232), NO multiply on the plate, and the stamp
glyph lifted from the capture (its pixels as drawn today, K 0.20 x WARM included) drawn back on top. The glyph is every pixel inside
the old plate's 1 px hairline that is not the old flat plate tone (116, 110, 96). Prints the plate rect's p95 and mean relative
luminance (linear light, .2126/.7152/.0722) and the full proof sheet's numbers.
usage: python3 -I proof.py PLATE.png CAPTURE.png OUT.png"""
import sys, numpy as np
from PIL import Image

plate = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
cap = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float); out = sys.argv[3]
X0, Y0, N = 804, 232, 120
def lin(c): c = c / 255; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
old = cap[Y0:Y0 + N, X0:X0 + N]
glyph = np.abs(old - [116, 110, 96]).sum(2) > 6
glyph[[0, -1], :] = False; glyph[:, [0, -1]] = False                 # the old hairline is not the glyph
res = cap.copy(); res[Y0:Y0 + N, X0:X0 + N] = np.where(glyph[..., None], old, plate)
Image.fromarray(res.astype(np.uint8)).save(out)
Y = lin(res[Y0:Y0 + N, X0:X0 + N]) @ [.2126, .7152, .0722]
ys, xs = np.where(glyph)
print(f'{sys.argv[2].split("/")[-1]}: plate rect p95 {np.percentile(Y, 95):.3f} mean {Y.mean():.3f} | glyph bbox {xs.min()}..{xs.max() + 1} x {ys.min()}..{ys.max() + 1}')
