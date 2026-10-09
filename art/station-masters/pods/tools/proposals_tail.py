"""Proof only (pass 52): the Tail with treatment B on a clean rump mask, beside the signed Tail, 128x160 at 1x and 3x. No slice is changed.
The rump mask: the painted body below and behind the tail's root, inside a wedge about 20 px deep, with every warm (wing) pixel and 6 px around it taken out.  python3 -I tools/proposals_tail.py"""
import os
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src = open("tools/traitpics2.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics2.py")}; exec(src[:src.index("doc = {\"species\"")], ns)
P, W, H, DEEP = ns["P"], ns["W"], ns["H"], ns["DEEP"]; keyed, keyed_tail, poly_mask, masked, window, with_body, tail_m = ns["keyed"], ns["keyed_tail"], ns["poly_mask"], ns["masked"], ns["window"], ns["with_body"], ns["tail_m"]
a = np.asarray(paint := ns["paint"]).astype(float)
warm = (a[..., 0] > a[..., 2] + 6) & (a.sum(2) > 200)                                         # the wing's cream and butter (the navy rump is never warm)
warm_img = Image.fromarray((warm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13)); wing_free = 1 - np.asarray(warm_img.filter(ImageFilter.GaussianBlur(1))).astype(float) / 255   # 6 px clear of any warm pixel
wedge = poly_mask([(372, 305), (400, 311), (420, 321), (432, 340), (424, 358), (386, 358), (364, 340)], W, H, 3.0)
gate = wedge * wing_free
img = with_body(keyed_tail, tail_m, gate, linear=True)
np.save("/tmp/claude-0/-home-user-miniaturebeasts/0a19fd67-e76f-5a43-9c35-dc889c07cdb9/scratchpad/rump_gate.npy", gate)
rect = P["tail"]; pad = 12; prect = [rect[0] - pad, rect[1] - pad, rect[2] + 2 * pad, rect[3] + 2 * pad]; box, _ = window(prect, 128, 160, W, H)
old = masked(keyed_tail, tail_m).crop(box); new = img.crop(box)
sheet = Image.new("RGB", (2 * 136 + 8, 168), (30, 40, 50)); sheet.paste(old.resize((128, 160), Image.LANCZOS), (4, 4)); sheet.paste(new.resize((128, 160), Image.LANCZOS), (140, 4))
os.makedirs("proposals", exist_ok=True); sheet.save("proposals/tail-rump-1x.png"); sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save("proposals/tail-rump-3x.png")
g = (gate[box[1]:box[3], box[0]:box[2]] * 255).astype(np.uint8); Image.fromarray(g).resize((128 * 3, 160 * 3), Image.NEAREST).save("/tmp/claude-0/-home-user-miniaturebeasts/0a19fd67-e76f-5a43-9c35-dc889c07cdb9/scratchpad/gate.png")
print(box, "gate px >0.5:", int((gate > 0.5).sum()), "warm px inside gate>0.05:", int((warm & (gate > 0.05)).sum()))
