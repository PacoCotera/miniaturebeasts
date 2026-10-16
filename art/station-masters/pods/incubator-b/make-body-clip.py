"""T-20261016-68: the founder's shadow is clipped to the shell's translucent body, so light and shadow never cross the opaque cap, band or straps.
incubator-shell-body-clip (224 x 272, the incubator class's box): white, alpha = the body minus the accent (cap and straps) minus the band,
zero wherever the accent or band is half opaque or more, all from the class's own layers (pod-incubator-mask-body, -mask-accent, -band), inside the shade's silhouette.
usage: python3 -I make-body-clip.py SLICES_DIR OUT.png"""
import sys, numpy as np
from PIL import Image
sl, out = sys.argv[1:3]
a = lambda n: np.asarray(Image.open(f"{sl}/pod-incubator-{n}.png").convert("RGBA"))[..., 3].astype(float) / 255
op = lambda m: 1 - np.minimum(1, 2 * m)                                  # half opaque or more takes no shadow; the edge below that fades
clip = a("mask-body") * op(a("mask-accent")) * op(a("band")) * (a("shade") > 0)
Image.fromarray(np.dstack([np.full(clip.shape + (3,), 255), np.round(clip * 255)]).astype(np.uint8), "RGBA").save(out)
