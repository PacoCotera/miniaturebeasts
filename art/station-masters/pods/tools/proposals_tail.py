"""Proof only (pass 53, round 2): the Tail with a deeper rump, beside the signed Tail, 128x160 at 1x and 3x. No slice is changed.
The rump mask: the painted body behind and under the tail's root, about 24 px deep at 1x, its back contour rounded (a 3 px feather on a polygon that carries the tail's upper edge into the body), every warm (wing) pixel and 6 px around it taken out.
The rump's own pixels are blurred 2 px so the feather striations read as one mass. Alpha 40 percent at the root, fading to 0 over 24 px measured along the body (along the tail's axis, with the under-side measured the same way), not radially.
python3 -I tools/proposals_tail.py"""
import os
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SC = "/tmp/claude-0/-home-user-miniaturebeasts/0a19fd67-e76f-5a43-9c35-dc889c07cdb9/scratchpad/"
src = open("tools/traitpics2.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics2.py")}; exec(src[:src.index("doc = {\"species\"")], ns)
P, W, H = ns["P"], ns["W"], ns["H"]; keyed_tail, poly_mask, masked, window, with_body, tail_m = ns["keyed_tail"], ns["poly_mask"], ns["masked"], ns["window"], ns["with_body"], ns["tail_m"]
axis, L_, sproj, xx_, yy_ = ns["axis"], ns["L_"], ns["sproj"], ns["xx_"], ns["yy_"]
a = np.asarray(ns["paint"]).astype(float)
warm = (a[..., 0] > a[..., 2] + 6) & (a.sum(2) > 200)
warm_img = Image.fromarray((warm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13)); wing_free = 1 - np.asarray(warm_img.filter(ImageFilter.GaussianBlur(1))).astype(float) / 255
RUMP = [(374, 300), (392, 297), (410, 303), (428, 318), (440, 338), (434, 360), (410, 372), (378, 372), (352, 356), (340, 330), (350, 312)]    # rounded back: the tail's upper edge carried into the body, 24 px and more behind and under the root
wedge = poly_mask(RUMP, W, H, 4.0); gate = wedge * wing_free
perp = np.abs((xx_ - 484.0) * axis[1] - (yy_ - 258.0) * axis[0])                                  # distance from the tail's axis line
t = np.maximum(sproj - (L_ - 4), 0) + 0.6 * np.maximum(perp - 14, 0)           # along the body: behind the root by the axis, under the tail by how far below its edge (continuous)
weight = 0.40 * np.clip(1 - t / 24.0, 0, 1)
blur = np.asarray(keyed_tail.filter(ImageFilter.GaussianBlur(2)))                               # the rump's striations softened to a mass
img = with_body(keyed_tail, tail_m, gate, weight=weight, orig_img=Image.fromarray(blur))
rect = P["tail"]; pad = 12; prect = [rect[0] - pad, rect[1] - pad, rect[2] + 2 * pad, rect[3] + 2 * pad]; box, _ = window(prect, 128, 160, W, H)
old = masked(keyed_tail, tail_m).crop(box); new = img.crop(box)
sheet = Image.new("RGB", (2 * 136 + 8, 168), (30, 40, 50)); sheet.paste(old.resize((128, 160), Image.LANCZOS), (4, 4)); sheet.paste(new.resize((128, 160), Image.LANCZOS), (140, 4))
os.makedirs("proposals", exist_ok=True); sheet.save("proposals/tail-rump-1x.png"); sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save("proposals/tail-rump-3x.png")
body = (weight * gate * (tail_m < 0.5) * (np.asarray(ns["keyed"]).astype(float).__sub__(ns["DEEP"]).__abs__().max(2) > 14)); ys, xs = np.where(body > 0.02)
print("warm px inside mask (gate>0.05):", int((warm & (gate > 0.05)).sum()), "| rump px >2% alpha:", len(xs), "| max alpha", round(float(body.max()), 3), "| extent in the window", xs.min() - box[0], ys.min() - box[1], xs.max() - box[0], ys.max() - box[1])
Image.fromarray((np.clip(body / 0.4, 0, 1) * 255).astype(np.uint8)).crop(box).resize((384, 480), Image.NEAREST).save(SC + "rumpw.png")
