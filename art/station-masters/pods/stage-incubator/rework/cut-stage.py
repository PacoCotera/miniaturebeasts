"""T-20261015-01 (Incubator art pass; AD, 10-15): the wall machinery of room-bench-stage-incubator re-rendered (one Pro edit of the
signed stage, source/raw/rw-inc-stage.jpg: the flat IA1 shapes as bevelled painted sage metal lit from the top left, louvred vents,
each with a soft cast shadow). The edit is brought back to 1024x522 (resized from 1376x774 to 1024x576, the 27-row pad cut, aligned
by 1 row, found by matching the unchanged hose and gauge band) and taken ONLY inside the two machinery regions (slice x 88-350,
y 40-380 at the left; x 680-960, y 40-370 at the right), feathered 10 px: the frame, screws, handles, floor, hoses and gauges stay
the signed stage's own pixels. Same id, same size.
usage: python3 -I cut-stage.py STAGE.png EDIT.jpg OUT.png"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
stp, ep, out = sys.argv[1:4]
st = np.asarray(Image.open(stp).convert('RGB')).astype(float)
e = np.asarray(Image.open(ep).convert('RGB').resize((1024, 576), Image.LANCZOS)).astype(float)
e = e[26:26 + 522]                                                       # the 27-row pad, less the 1-row shift found
m = np.zeros(st.shape[:2]); m[40:380, 88:350] = 1; m[40:370, 680:960] = 1
m = nd.uniform_filter(m, 21)
o = st * (1 - m[..., None]) + e * m[..., None]
Image.fromarray(np.clip(np.round(o), 0, 255).astype(np.uint8)).save(out)
