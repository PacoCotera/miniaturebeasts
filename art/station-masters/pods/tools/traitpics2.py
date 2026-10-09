"""Trait pictures, round 2, the part traits: crops from the rig's part regions (prototypes/workbench/grow/regions/trait-regions-<SNN>.json, boxes [x,y,w,h] in the 600x620 portrait of the species' accepted
painting, species/<SNN>/portrait-600x620.png) at the five sizes, the paper ground keyed to deep with the key choked by 1 px and the colour defringed from the fur inside. Slices
trait-<SNN>-<trait>-<look>-<w>x<h>. Quality traits (a null box: Colour, Fluff, Sheen, Markings, Scales ...) are not cropped: they take per-look plates after the quota, and show the stand-in card until then.
Round 2 does S09 (Face, Legs & tail). python3 -I tools/traitpics2.py
Source note: the service's raw step2.png files in grow/lab are other experiments (1024x1024, different birds and framings) and do not correspond to the accepted painting the regions were exported for; the only
source the boxes fit is the accepted 600x620 painting, so crops are from it and none is enlarged."""
import json, os, re, hashlib
import numpy as np
from PIL import Image, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
GROW = os.path.join(REPO, "prototypes/workbench/grow")
SIZES = [(128, 160), (144, 176), (104, 160), (104, 96), (104, 64)]
DEEP = np.array([14.0, 28.0, 36.0]); PAPER = np.array([246.0, 243.0, 236.0])
slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
def key(img):
    a = np.asarray(img.convert("RGB")).astype(float); d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    shadow = (spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5)
    alpha = np.clip((d - 12) / 26.0, 0, 1); alpha[shadow] = 0
    # only the ground connected to the painting's border is ground: a pale feather inside the bird (near the paper's colour) stays opaque
    bgish = alpha < 0.5; lab = np.zeros(bgish.shape, bool); st = [(y, x) for y in (0, bgish.shape[0] - 1) for x in range(bgish.shape[1]) if bgish[y, x]] + [(y, x) for x in (0, bgish.shape[1] - 1) for y in range(bgish.shape[0]) if bgish[y, x]]
    for p in st: lab[p] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < bgish.shape[0] and 0 <= xx < bgish.shape[1] and bgish[yy, xx] and not lab[yy, xx]: lab[yy, xx] = True; st.append((yy, xx))
    alpha = np.where(lab | (alpha >= 0.5), alpha, 1.0)
    m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)); alpha = np.asarray(m).astype(float) / 255          # choke the key by 1 px
    solid = alpha > 0.97; col = a.copy()
    for _ in range(3):                                                                              # defringe: the edge's colour is taken from the nearest solid fur
        p = np.pad(solid, 1); cnt = sum(p[1 + dy:1 + dy + solid.shape[0], 1 + dx:1 + dx + solid.shape[1]].astype(float) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        pc = np.pad(col * solid[..., None], ((1, 1), (1, 1), (0, 0)))
        s = sum(pc[1 + dy:1 + dy + solid.shape[0], 1 + dx:1 + dx + solid.shape[1]] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~solid) & (cnt > 0) & (alpha > 0.02); col[grow] = (s / np.maximum(cnt, 1)[..., None])[grow]; solid = solid | grow
    out = col * alpha[..., None] + DEEP * (1 - alpha[..., None]); return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
def window(rect, tw, th, W, H):
    x, y, w0, h0 = rect; x1, y1 = x + w0, y + h0; ratio = tw / th; w = max(w0, h0 * ratio); h = w / ratio; flag = None
    if w < tw or h < th: flag = f"the part's box is {w0}x{h0} px, smaller than the {tw}x{th} cell: shown with its surroundings at 1:1, not enlarged"; w, h = float(tw), float(th)
    if w > W or h > H: s = min(W / w, H / h); w, h = w * s, h * s
    cx, cy = (x + x1) / 2, (y + y1) / 2; bx = min(max(cx - w / 2, 0), W - w); by = min(max(cy - h / 2, 0), H - h); return (int(round(bx)), int(round(by)), int(round(bx + w)), int(round(by + h))), flag
man = json.load(open("slices/manifest.json")); R = json.load(open(os.path.join(ROOT, "traitpics/rig-regions/trait-regions-S09.json"))); P = R["parts"]
looks = json.load(open("source/work/looks-S09-type.json"))
union = lambda *bs: [min(b[0] for b in bs), min(b[1] for b in bs), max(b[0] + b[2] for b in bs) - min(b[0] for b in bs), max(b[1] + b[3] for b in bs) - min(b[1] for b in bs)]
# which box each part trait is cropped from: the rig's box for the trait where it is tight; the single part's box where two traits share one union (told apart, never alike)
BOX = {"face/head": ("the head part", P["head"]), "face/beak": ("the beak part", P["beak"]), "face/eyes": ("the eye part", P["eye"]), "face/crown": ("the crown part", P["crown"]),
       "face/feather-crest": ("the crown part with the head (the trait's union)", R["traits"]["feather-crest"]["box"]),
       "legs-tail/tail": ("the tail part", P["tail"]), "legs-tail/tail-curl": ("the tail part with the hind body it leaves (the tail and region-1)", union(P["tail"], P["region-1"]))}
paint = Image.open(os.path.join(GROW, "species/S09/portrait-600x620.png")).convert("RGB"); W, H = paint.size; keyed = key(paint)
doc = {"species": "S09", "painting": "prototypes/workbench/grow/species/S09/portrait-600x620.png", "size": [W, H], "regions": "prototypes/workbench/grow/regions/trait-regions-S09.json", "genome": "grow/out/S09/09e30f12feee02c6/genome.json (the accepted painting's genome)", "traits": {}}
n = 0; flagged = []
for key_, (why, rect) in BOX.items():
    ch, tid = key_.split("/"); name = looks[key_]["name"]; look = looks[key_]["look"]; ent = {"chapter": ch, "trait": name, "look": look, "box": list(rect), "source": why, "crops": {}}
    for (tw, th) in SIZES:
        box, flag = window(rect, tw, th, W, H); crop = keyed.crop(box); cw, chh = crop.size
        im = crop.resize((tw, th), Image.LANCZOS) if (cw, chh) != (tw, th) else crop
        nm = f"trait-S09-{slug(name)}-{slug(look)}-{tw}x{th}"; im.save(f"slices/{nm}.png", optimize=True)
        man[nm] = {"size": [tw, th], "rect": None, "src": f"S09 accepted painting, {why} {list(rect)}", "made": f"the {name} of the Belatz ({look}): a crop of the accepted painting from the rig's region, re-framed to {tw}x{th} from a {cw}x{chh} window ({'reduced' if (cw, chh) != (tw, th) else '1:1'}, never enlarged), paper keyed to deep, key choked 1 px, defringed" + (f"; FLAG: {flag}" if flag else ""), "sha256": hashlib.sha256(open(f"slices/{nm}.png", "rb").read()).hexdigest()}
        ent["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": nm, "flag": flag}; n += 1
        if flag: flagged.append((name, f"{tw}x{th}", rect[2:]))
    doc["traits"][key_] = ent
doc["quality_traits_waiting"] = [k for k, v in R["traits"].items() if v["whole"]]
json.dump(doc, open("traitpics/trait-regions-S09-round2.json", "w"), indent=1); json.dump(man, open("slices/manifest.json", "w"), indent=1)
# drop the round 1 slices for the traits redone here (their ids carried the old looks)
print(n, "slices;", len(flagged), "flagged"); print(sorted({(f[0], tuple(f[2])) for f in flagged}))
