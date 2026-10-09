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
DEEP = np.array([22.0, 42.0, 55.0]); PAPER = np.array([246.0, 243.0, 236.0])
slug = lambda s: re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")
def key(img, keepedge=None, choke=0):
    """Paper to deep: the ground is the flood of paper-coloured pixels (distance under 10 in any channel, or the cast shadow's grey scaling) from the painting's border: a pale feather inside the bird, even one
    near the paper's tone, is never ground, and the flood cannot leak through a 1 px gap because it only spreads over pixels that are themselves paper. The boundary is then feathered by 1 px (a 3x3 box on
    the alpha) and the colour defringed from the solid fur inside; the old 1 px choke is gone (it cut the pale forehead; `keepedge` is kept for the signature)."""
    a = np.asarray(img.convert("RGB")).astype(float); d = np.abs(a - PAPER).max(2); r = a / PAPER; spread = r.max(2) - r.min(2)
    shadow = (spread < 0.05) & (r.mean(2) < 0.985) & (r.mean(2) > 0.5); shadow[:430] = False                # the cast shadow lies under the feet; a pale grey feather above is never shadow
    ground = (d < 10) | shadow; H_, W_ = ground.shape; lab = np.zeros_like(ground)
    st = [(y, x) for y in (0, H_ - 1) for x in range(W_) if ground[y, x]] + [(y, x) for x in (0, W_ - 1) for y in range(H_) if ground[y, x]]
    for p in st: lab[p] = True
    while st:
        y, x = st.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H_ and 0 <= xx < W_ and ground[yy, xx] and not lab[yy, xx]: lab[yy, xx] = True; st.append((yy, xx))
    alpha = np.where(lab, 0.0, 1.0)
    # drop islands: any opaque piece under 40 px (a speck of the paper's noise left unflooded) is ground
    op = alpha > 0.5; seen = np.zeros_like(op)
    for y0 in range(H_):
        for x0 in range(W_):
            if op[y0, x0] and not seen[y0, x0]:
                comp = [(y0, x0)]; seen[y0, x0] = True; i = 0
                while i < len(comp):
                    y, x = comp[i]; i += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < H_ and 0 <= xx < W_ and op[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; comp.append((yy, xx))
                if len(comp) < 40:
                    for (y, x) in comp: alpha[y, x] = 0.0
    if choke: alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(2 * choke + 1))).astype(float) / 255      # a choke where the painting's rim carries a pale dotted hairline (the tail)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0.8))).astype(float) / 255
    solid = alpha > 0.97; col = a.copy()
    for _ in range(3):
        p = np.pad(solid, 1); cnt = sum(p[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_].astype(float) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        pc = np.pad(col * solid[..., None], ((1, 1), (1, 1), (0, 0)))
        sm = sum(pc[1 + dy:1 + dy + H_, 1 + dx:1 + dx + W_] for dy in (-1, 0, 1) for dx in (-1, 0, 1))
        grow = (~solid) & (cnt > 0) & (alpha > 0.02); col[grow] = (sm / np.maximum(cnt, 1)[..., None])[grow]; solid = solid | grow
    out = col * alpha[..., None] + DEEP * (1 - alpha[..., None]); return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
def limited(img, limit, feather):
    """Everything outside the allowed rectangle goes to the deep ground, with a feather per side (l, t, r, b) inside it."""
    if limit is None: return img
    a = np.asarray(img).astype(float); H_, W_ = a.shape[:2]; yy, xx = np.mgrid[0:H_, 0:W_].astype(float); x0, y0, x1, y1 = limit; fl, ft, fr, fb = feather
    m = np.ones((H_, W_))
    for dist, f in ((xx - x0, fl), (yy - y0, ft), (x1 - xx, fr), (y1 - yy, fb)): m *= np.clip(dist / max(f, 1e-6), 0, 1) if f else (dist >= 0)
    return Image.fromarray(np.clip(a * m[..., None] + DEEP * (1 - m[..., None]), 0, 255).astype(np.uint8))
def poly_mask(points, W, H, feather):
    """A soft polygon mask on the painting: the polygon drawn at 4x, blurred by `feather` px, 0..1."""
    from PIL import ImageDraw
    m = Image.new("L", (W * 4, H * 4), 0); ImageDraw.Draw(m).polygon([(x * 4, y * 4) for x, y in points], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather * 4 / 2.0)).resize((W, H), Image.LANCZOS); return np.asarray(m).astype(float) / 255
def masked(img, m):
    a = np.asarray(img).astype(float); return Image.fromarray(np.clip(a * m[..., None] + DEEP * (1 - m[..., None]), 0, 255).astype(np.uint8))
def window(rect, tw, th, W, H):
    x, y, w0, h0 = rect; x1, y1 = x + w0, y + h0; ratio = tw / th; w = max(w0, h0 * ratio); h = w / ratio; flag = None
    if w < tw or h < th: flag = f"the part's box is {w0}x{h0} px, smaller than the {tw}x{th} cell: shown with its surroundings at 1:1, not enlarged"; w, h = float(tw), float(th)
    if w > W or h > H: s = min(W / w, H / h); w, h = w * s, h * s
    cx, cy = (x + x1) / 2, (y + y1) / 2; bx = min(max(cx - w / 2, 0), W - w); by = min(max(cy - h / 2, 0), H - h); return (int(round(bx)), int(round(by)), int(round(bx + w)), int(round(by + h))), flag
def tail_only(img):
    """The tail alone: the wing (butter yellow) and the feet are not part of the tail; their pixels go to the deep ground. The body the tail leaves stays only where it lies inside the tail's own box."""
    a = np.asarray(img).astype(float); wing = (a[..., 0] > a[..., 2] + 6)                                 # warm (yellow, cream) pixels: the wing's feathers
    wing = np.asarray(Image.fromarray((wing * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
    a[wing] = DEEP; return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
man = json.load(open("slices/manifest.json")); R = json.load(open(os.path.join(ROOT, "traitpics/rig-regions/trait-regions-S09.json"))); P = R["parts"]
looks = json.load(open("source/work/looks-S09-type.json"))
exec(open(os.path.join(ROOT, "tools/cutfade.py")).read(), globals())      # fade_cut (pass 60)
CONTENT = 0.75                                       # the owner's rule (pass 59): a crop's content sits inside the cell's centred 75 percent, reduced from the painting and never enlarged, on the cell tone
union = lambda *bs: [min(b[0] for b in bs), min(b[1] for b in bs), max(b[0] + b[2] for b in bs) - min(b[0] for b in bs), max(b[1] + b[3] for b in bs) - min(b[1] for b in bs)]
# which box each part trait is cropped from: the rig's box for the trait where it is tight; the single part's box where two traits share one union (told apart, never alike)
# kind, region, (pad around the region for the window), limit: the allowed rectangle [x0, y0, x1, y1] on the painting with a feather per side (l, t, r, b) in px (everything outside goes to deep)
HEAD = union(P["head"], P["crown"], P["beak"])
BOX = {"face/head": ("the whole head, crown to throat (the head, crown and beak parts' union) with a margin; the painting gives no profile: it is a three-quarter front view", HEAD, "crop", 10, [HEAD[0] - 8, HEAD[1] - 8, HEAD[0] + HEAD[2] + 12, HEAD[1] + HEAD[3] + 4], (0, 0, 0, 10)),
       "face/beak": ("the beak part", P["beak"], "crop", 0, None, None),
       "face/crown": ("the crown only: the horn, the crest and the ear; everything below the skull's curve is taken out along that curve", P["crown"], "crop", 6, None, None),
       "legs-tail/tail": ("the tail alone, tip to root: the feather bundle inside a polygon (the rump's feathers and the wing left out), the root tapering out along the feather lines", P["tail"], "crop", 12, None, None)}
CROWN_CURVE = [(148, 158), (165, 146), (200, 134), (232, 142), (252, 160), (268, 172), (310, 178)]      # the skull's top, left to right, on the painting
TAIL_POLY = [(372, 301), (392, 298), (440, 275), (480, 254), (488, 262), (480, 292), (466, 306), (440, 318), (418, 323), (398, 321), (384, 316), (374, 311)]
TAIL_TIP, TAIL_ROOT = (484.0, 258.0), (380.0, 306.0)
PLATES = {"face/feather-crest": "the crest alone, close up against deep", "face/eyes": "one eye close up filling the cell: iris, ring, lid; no beak", "legs-tail/tail-curl": "the whole hind body and tail in silhouette, small in the cell, showing how the tail is held", "coat/feathers": "the feather surface of the coat as a quality: a close patch of the plumage in this look, filling the cell, no wing or outline", "coat/fur-reach": "the tufts as a quality: how far the fur reaches, a close patch of the coat edge in this look, filling the cell, no wing"}      # small parts and a posture: per-look plates after the quota
paint = Image.open(os.path.join(GROW, "species/S09/portrait-600x620.png")).convert("RGB"); W, H = paint.size; keyed = key(paint); keyed_tail = key(paint, choke=1)
yy_, xx_ = np.mgrid[0:H, 0:W].astype(float)
crown_m = poly_mask([(148, 0)] + CROWN_CURVE + [(318, 0)], W, H, 3.0)                       # above the skull's curve, a 3 px feather along it
def soften(m, r): return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def dist_from(core, limit=24):
    """Distance in px from the part (octagonal: dilation steps alternate 4- and 8-neighbour), capped at `limit`."""
    cur = core >= 0.5; d = np.full(core.shape, float(limit)); d[cur] = 0
    for k in range(1, limit + 1):
        n = cur.copy(); n[1:] |= cur[:-1]; n[:-1] |= cur[1:]; n[:, 1:] |= cur[:, :-1]; n[:, :-1] |= cur[:, 1:]
        if k % 2: n[1:, 1:] |= cur[:-1, :-1]; n[:-1, :-1] |= cur[1:, 1:]; n[1:, :-1] |= cur[:-1, 1:]; n[:-1, 1:] |= cur[1:, :-1]
        d[n & ~cur] = k; cur = n
    return d
def with_body(img, core, gate, linear=False, weight=None, orig_img=None):
    """Treatment B (pass 52): the part's own pixels at 100 percent; the painted body next to it at 35 percent, fading to nothing over about 22 px from the part, only inside `gate`; no shadow."""
    solid = (np.abs(np.asarray(keyed).astype(float) - DEEP).max(2) > 14).astype(float); near = soften(core, 12)
    body = (np.clip(1 - dist_from(core) / 22.0, 0, 1) if linear else np.clip(near * 3.0, 0, 1)) * solid * (1 - core) * (0.35 if weight is None else weight) * gate; base = np.asarray(masked(img, core)).astype(float); orig = np.asarray(img if orig_img is None else orig_img).astype(float)
    return Image.fromarray(np.clip(base * (1 - body[..., None]) + orig * body[..., None], 0, 255).astype(np.uint8))
hx, hy, hw, hh = P["head"]; head_gate = poly_mask([(hx, hy), (hx + hw, hy), (hx + hw, hy + hh), (hx, hy + hh)], W, H, 4.0)   # where the painting's head really covers the ear and crest roots
def crown_short(box, ch_):
    """The body's fade is shortened so that it reaches the ground 3 rows above the content box's bottom edge (the dome must not run off it into a flat cut): a vertical ramp of 8 cell rows ends there; 35 percent at the part is kept (104x64 in pass 53, every size from pass 59)."""
    sc = (box[3] - box[1]) / ch_; ycut = box[3] - 3 * sc; ramp = 8 * sc; yy = np.mgrid[0:H, 0:W][0].astype(float)
    return with_body(keyed_tail, crown_m, head_gate * np.clip((ycut - yy) / ramp, 0, 1))
crown_img = with_body(keyed_tail, crown_m, head_gate)
axis = np.array(TAIL_ROOT) - np.array(TAIL_TIP); L_ = np.hypot(*axis); axis = axis / L_
sproj = (xx_ - TAIL_TIP[0]) * axis[0] + (yy_ - TAIL_TIP[1]) * axis[1]                      # px along the feather axis from the tip toward the root
tail_m = poly_mask(TAIL_POLY, W, H, 2.0) * np.clip((L_ + 4 - sproj) / 16.0, 0, 1)         # the polygon, and the root fading out along the feather lines over 16 px, perpendicular to them
doc = {"species": "S09", "painting": "prototypes/workbench/grow/species/S09/portrait-600x620.png", "size": [W, H], "regions": "prototypes/workbench/grow/regions/trait-regions-S09.json", "genome": "grow/out/S09/09e30f12feee02c6/genome.json (the accepted painting's genome)", "traits": {}}
n = 0; flagged = []
for key_, (why, rect, kind, pad, limit, feather) in BOX.items():
    ch, tid = key_.split("/"); name = looks[key_]["name"]; look = looks[key_]["look"]; ent = {"chapter": ch, "trait": name, "look": look, "kind": kind, "box": list(rect), "source": why, "crops": {}}
    for (tw, th) in SIZES:
        prect = [rect[0] - pad, rect[1] - pad, rect[2] + 2 * pad, rect[3] + 2 * pad]; cw_, cellh = round(tw * CONTENT), round(th * CONTENT); box, flag = window(prect, cw_, cellh, W, H); base_ = masked(keyed_tail, tail_m) if key_ == "legs-tail/tail" else crown_short(box, cellh) if key_ == "face/crown" else keyed; crop = limited(base_, limit, feather).crop(box); cw, chh = crop.size
        im = crop.resize((cw_, cellh), Image.LANCZOS) if (cw, chh) != (cw_, cellh) else crop
        edges_ = []
        if key_ == "face/beak" and (tw, th) == (128, 160): im, edges_ = fade_cut(im, tuple(int(v) for v in DEEP))      # pass 60: a keyed fade on the straight cut edges (the beak's face continues past the box)
        cv_ = Image.new("RGB", (tw, th), tuple(int(v) for v in DEEP)); cv_.paste(im, ((tw - cw_) // 2, (th - cellh) // 2)); im = cv_      # pass 59: the content inside the centred 75 percent of the cell (96x120 in 128x160), the cell tone round it
        nm = f"trait-S09-{slug(name)}-{slug(look)}-{tw}x{th}"; im.save(f"slices/{nm}.png", optimize=True)
        man[nm] = {"size": [tw, th], "rect": None, "src": f"S09 accepted painting, {why} {list(rect)}", "made": f"the {name} of the Belatz ({look}): a crop of the accepted painting from the rig's region, re-framed to {tw}x{th} from a {cw}x{chh} window{' into the centred 75 percent of the cell (' + str(cw_) + 'x' + str(cellh) + ' at (' + str((tw - cw_) // 2) + ', ' + str((th - cellh) // 2) + '))'} ({'reduced' if (cw, chh) != (tw, th) else '1:1'}, never enlarged), paper keyed to deep, key choked 1 px, defringed" + ("; body kept at 35 percent alpha fading over about 22 px, no shadow" if key_ == "face/crown" else "") + (f"; FLAG: {flag}" if flag else ""), "sha256": hashlib.sha256(open(f"slices/{nm}.png", "rb").read()).hexdigest()}
        ent["crops"][f"{tw}x{th}"] = {"window": list(box), "source_px": [cw, chh], "slice": nm, "flag": flag, **({"keyed_edges": edges_} if (tw, th) == (128, 160) and key_ == "face/beak" else {})}; n += 1
        if edges_: man[nm]["made"] += f"; 128x160 (pass 60): a keyed fade (smoothstep over 12 px, finished inside the box) on the straight cut edges: {edges_}"; man[nm]["sha256"] = hashlib.sha256(open(f"slices/{nm}.png", "rb").read()).hexdigest()
        if flag: flagged.append((name, f"{tw}x{th}", rect[2:]))
    doc["traits"][key_] = ent
for k_, nm_ in (("coat/feathers", "Feathers"), ("coat/fur-reach", "Tufts")): doc["traits"][k_] = {"chapter": "coat", "trait": nm_, "look": looks[k_]["look"], "kind": "plate", "box": None, "source": "a surface material: a per-look plate painted as a quality after the quota, no crop", "crops": {}}
doc["quality_traits_waiting"] = [k for k, v in R["traits"].items() if v["whole"]]
doc["plates_waiting"] = PLATES
doc["rule"] = "a distinct visible part is a crop (Beak, Crown, Tail, Feathers, Tufts, Head); a quality, a surface material, a small part or a posture is a per-look plate (Colour, Fluff, Sheen, Markings, Scales, Feathers, Tufts, Crest, Eyes, Carriage); the surface materials (Fluff, Sheen, Feathers, Tufts) count as qualities: no crop is cut from the flap box or the fur-reach box, because it would read as a Wings picture; each trait's kind is recorded here"
json.dump(doc, open("traitpics/trait-regions-S09-round2.json", "w"), indent=1); json.dump(man, open("slices/manifest.json", "w"), indent=1)
# drop the round 1 slices for the traits redone here (their ids carried the old looks)
print(n, "slices;", len(flagged), "flagged"); print(sorted({(f[0], tuple(f[2])) for f in flagged}))
