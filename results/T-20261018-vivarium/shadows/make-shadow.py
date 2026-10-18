# The contact shadow layer for the layered stand (op "under", drawn before the base), at art scale 304 x 312.
# Per stage, from the anchor base key: the body's foot extent (the alpha in the lowest 45 rows above the feet line, row 305)
# sets the ellipse: width = that extent, centred on it, nudged 2 px right (the light is top left); height set so it
# is 5 px at 54 (adult) / 4 px at 40 (juvenile) after reduction; a soft falloff; warm near-black (18, 12, 6) at 0.72 peak.
import sys, numpy as np
from PIL import Image
KEYS, OUT = sys.argv[1:3]
for stage, pose, h_px, fig_px in (('adult', 'anchor', 5, 54), ('juvenile', 'anchor', 4, 40), ('adult', 'curl', 5, 54), ('juvenile', 'curl', 4, 40)):
    b = np.asarray(Image.open(f'{KEYS}/mibi-{stage}-S01-base-{pose}-304x312.png').convert('RGBA'))
    sc = np.asarray(Image.open(f'{KEYS}/mibi-{stage}-S01-base-anchor-304x312.png').convert('RGBA'))[..., 3] > 128   # the scale is always the standing figure's
    al = b[..., 3] > 128
    ys, xs = np.nonzero(al); top, foot = ys.min(), 305
    k = fig_px / (foot - np.nonzero(sc.any(1))[0].min())                                           # the stand's reduction at its world size
    band = al[foot - 30:foot + 1]; fx = np.nonzero(band.any(0))[0]; x0, x1 = fx.min(), fx.max()
    cx = (x0 + x1) / 2 + 2; rx = 0.5 * (x1 - x0); ry = (h_px / k) * 0.75
    # its own canvas, 304 x 48, anchored so its row 24 is the feet line (row 305 of the stand): the stand's canvas ends
    # 7 rows below the feet, too little room for the shadow's lower half
    yy, xx = np.mgrid[0:48, 0:304].astype(float)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - 27) / ry) ** 2)
    a = np.clip(1 - d, 0, 1) ** 0.9 * 0.8
    out = np.zeros((48, 304, 4)); out[..., :3] = (18, 12, 6); out[..., 3] = a * 255
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(f'{OUT}/S01-{stage}' + ('' if pose == 'anchor' else '-curl') + '-304x48-shadow.png')
    print(stage, pose, 'feet x', x0, x1, 'scale', round(k, 4), 'ellipse rx', round(rx, 1), 'ry', round(ry, 1))
