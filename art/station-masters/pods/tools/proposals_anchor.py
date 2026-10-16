"""Proof only: ways to anchor the S09 Tail and Crown crops (they float with no body; at 1x the tail can be taken for a wing). Three treatments beside the signed crop, at 128x160, 1x and 3x:
 B  a faint body edge left in: the part's neighbourhood (the rump behind the tail's root, the skull under the crown) kept at 35 percent alpha, fading to nothing over about 22 px away from the part;
 S  a ground shadow: a soft dark ellipse under the part (as under the pod's dish), no body;
 BS both.  python3 -I tools/proposals_anchor.py -> proposals/anchor-*.png (no slice is changed)"""
import os, json
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
src = open("tools/traitpics2.py").read(); ns = {"__file__": os.path.abspath("tools/traitpics2.py")}; exec(src[:src.index("doc = {\"species\"")], ns)
P = ns["P"]; W, H = ns["W"], ns["H"]; DEEP = ns["DEEP"]; keyed, keyed_tail = ns["keyed"], ns["keyed_tail"]; poly_mask, masked, window, limited = ns["poly_mask"], ns["masked"], ns["window"], ns["limited"]
tail_m, crown_m = ns["tail_m"], ns["crown_m"]
def soften(m, r): return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def variants(kind):
    img = keyed_tail; core = tail_m if kind == "tail" else crown_m; sil = np.asarray(keyed).astype(float); solid = (np.abs(sil - DEEP).max(2) > 14).astype(float)   # the painted bird, everything not ground
    near = soften(core, 12)                                                  # how near the part: 1 on it, falling to 0 about 22 px away
    body = np.clip(near * 3.0, 0, 1) * solid * (1 - core) * 0.35               # the neighbourhood at 35 percent
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    ys, xs = np.where(core > 0.5); cx, cy = xs.mean(), (ys.max() - 4 if kind == "tail" else ys.max() + 6); rx, ry = (xs.max() - xs.min()) * 0.55, 9.0
    sh = np.clip(1 - (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2), 0, 1) ** 1.2; sh = soften(sh, 3) * 0.55                     # a soft ground shadow
    base = np.asarray(masked(img, core)).astype(float); orig = np.asarray(img).astype(float)
    def comp(m_body, m_shadow):
        out = base.copy()
        if m_shadow is not None: out = out * (1 - m_shadow[..., None]) + np.array([4.0, 10.0, 14.0]) * m_shadow[..., None] * 1.0 + 0 * out                   # the shadow darkens the deep ground
        if m_body is not None: out = out * (1 - m_body[..., None]) + orig * m_body[..., None]                                                                      # the faint body edge laid back in
        return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    return {"signed": masked(img, core), "B faint body": comp(body, None), "S ground shadow": comp(None, sh), "BS both": comp(body, sh)}
rows = {"tail": ("legs-tail/tail", P["tail"], 12), "crown": ("face/crown", P["crown"], 6)}
sheet = Image.new("RGB", (4 * 136 + 8, 2 * 168 + 8), (30, 40, 50))
for r, (kind, (key_, rect, pad)) in enumerate(rows.items()):
    vs = variants(kind); prect = [rect[0] - pad, rect[1] - pad, rect[2] + 2 * pad, rect[3] + 2 * pad]; box, _ = window(prect, 128, 160, W, H)
    for c, (nm, im) in enumerate(vs.items()): sheet.paste(im.crop(box).resize((128, 160), Image.LANCZOS) if im.crop(box).size != (128, 160) else im.crop(box), (4 + c * 136, 4 + r * 168))
os.makedirs("proposals", exist_ok=True); sheet.save("proposals/anchor-tail-crown-1x.png"); sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save("proposals/anchor-tail-crown-3x.png")
