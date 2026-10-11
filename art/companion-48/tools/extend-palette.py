"""A proposal: the Companion's 48 colours extended from the approved terrain painting, ramp by ramp.

The signed 48 stay as they are, first and in their order. Each material ramp (grass, rock, water, earth and wood) gains, in
CIE LCh so its colour is kept and not greyed: a step between every two signed shades more than 7 L* apart; a deeper shadow 7 L*
below its darkest, turned 12 degrees toward cool blue-violet; a brighter highlight 5 L* above its lightest, turned 12 degrees
toward warm yellow; and an edge tone 14 L* below its darkest, for borders and outlines. One light (shadows cool, highlights
warm); no teal-led colours (a hue of 160-200 degrees with chroma over 20 is moved off teal).

Writes palette-ext.json (index, name, hex, ramp; the 48 first, in their order), palette-ext.png (the ramps as rows, for the eye)
and, re-quantised to it and to the 48 for comparison, the mockup's two screens, with the mean dE of each.
usage: python3 -I extend-palette.py PAINTING OUT_DIR"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import pal, quant
P = quant.P
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)

def lab(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
def lab2rgb(L):
    fy = (L[..., 0] + 16) / 116; fx = fy + L[..., 1] / 500; fz = fy - L[..., 2] / 200
    f = np.stack([fx, fy, fz], -1); xyz = np.where(f ** 3 > 0.008856, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1.0, 1.08883])
    M = np.linalg.inv(np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]))
    c = np.clip(xyz @ M.T, 0, 1); c = np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)
    return np.clip(np.round(c * 255), 0, 255).astype(int)
RAMPS = {   # material: (the signed colours that belong to it, unused)
    "grass": (["pine", "forest", "leaf", "grass", "sprout", "lime"], 14),
    "rock": (["night", "slate", "stone", "rock", "rockL", "mist", "fog"], 14),
    "water": (["deep", "sea", "river", "sky", "ice"], 10),
    "earth": (["soil", "bark", "clay", "sand", "paper"], 10),
}
im = Image.open(src).convert("RGB"); im = im.resize((int(im.width * .96), int(im.height * .96)), Image.BOX)
SIG = lab(P.rgb)
members = {m: [P.index[n] for n in ns] for m, (ns, _) in RAMPS.items()}
owner = {i: m for m, ix in members.items() for i in ix}
new = []   # (material, lab)
def lch(l): return np.array([l[0], np.hypot(l[1], l[2]), np.degrees(np.arctan2(l[2], l[1])) % 360])
def unlch(c): return np.array([c[0], c[1] * np.cos(np.radians(c[2])), c[1] * np.sin(np.radians(c[2]))])
def mix(c1, c2, t):
    dh = ((c2[2] - c1[2] + 180) % 360) - 180
    return np.array([c1[0] + (c2[0] - c1[0]) * t, max(c1[1], c2[1]), (c1[2] + dh * t) % 360])   # chroma kept at the stronger of the two
WARM, COOL = 85.0, 265.0                 # highlights turn toward warm yellow, shadows toward cool blue-violet
def turn(c, target, deg):
    dh = ((target - c[2] + 180) % 360) - 180
    return (c[2] + np.clip(dh, -deg, deg)) % 360
for m, (ns, _) in RAMPS.items():
    seq = sorted([lch(SIG[P.index[n]]) for n in ns], key=lambda c: c[0])
    for c1, c2 in zip(seq[:-1], seq[1:]):                              # a step between every two signed shades, chroma kept
        if c2[0] - c1[0] > 7: new.append((m, unlch(mix(c1, c2, .5))))
    lo, hi = seq[0], seq[-1]
    sh = np.array([max(5, lo[0] - 7), lo[1] * .95, turn(lo, COOL, 12)])      # a deeper, cooler shadow
    hl = np.array([min(97, hi[0] + 5), hi[1] * .85, turn(hi, WARM, 12)])     # a brighter, warmer highlight
    edge = np.array([max(3, lo[0] - 14), lo[1] * .8, turn(lo, COOL, 18)])    # the edge tone, for borders and outlines
    for c in (sh, hl, edge):
        if 160 <= c[2] <= 200 and c[1] > 20: c[2] = 155 if c[2] < 180 else 205   # no teal-led colours
        new.append((m, unlch(c)))
cols = [{"index": i, "name": P.names[i], "hex": P.hexes[i], "ramp": owner.get(i, pal.RAMP_OF.get(P.names[i], "-"))} for i in range(len(P.names))]
for j, (m, l) in enumerate(sorted(new, key=lambda t: (t[0], t[1][0]))):
    rgb = lab2rgb(l[None])[0]; h = "#%02x%02x%02x" % tuple(rgb)
    if any(c["hex"] == h for c in cols): continue
    cols.append({"index": len(cols), "name": f"{m}{j + 1}", "hex": h, "ramp": m, "new": True})
json.dump({"proposal": True, "base": "palette/palette.json (the signed 48, unchanged, first)", "count": len(cols), "colours": cols}, open(os.path.join(out, "palette-ext.json"), "w"), indent=1)

# the ramps for the eye: one row per material, signed and new together, dark to light; new ones marked with a dot
rows = []
for m in RAMPS:
    rs = sorted([c for c in cols if c["ramp"] == m], key=lambda c: lab(np.array([int(c["hex"][i:i + 2], 16) for i in (1, 3, 5)]))[0])
    rows.append(rs)
W = max(len(r) for r in rows) * 20; sw = Image.new("RGB", (W, len(rows) * 24), (26, 23, 37))
for y, rs in enumerate(rows):
    for x, c in enumerate(rs):
        rgb = tuple(int(c["hex"][i:i + 2], 16) for i in (1, 3, 5))
        for yy in range(20):
            for xx in range(18): sw.putpixel((x * 20 + xx, y * 24 + yy), rgb)
        if c.get("new"): sw.putpixel((x * 20 + 8, y * 24 + 21), (255, 255, 255))
sw.resize((sw.width * 2, sw.height * 2), Image.NEAREST).save(os.path.join(out, "palette-ext.png"))

# the mockup re-quantised: nearest colour in Lab, to the extended set and to the 48, with the mean dE of each
EXT = np.array([[int(c["hex"][i:i + 2], 16) for i in (1, 3, 5)] for c in cols]); EL = lab(EXT)
full = np.asarray(im).astype(int); FL = lab(full)
res = {}
for nm, (x0, y0) in {"screen-pond": ((full.shape[1] - 450) // 2, full.shape[0] - 532 - 40), "screen-cliffs": (20, 60)}.items():
    crop = FL[y0:y0 + 532, x0:x0 + 450].reshape(-1, 3)
    for tag, PLT, RGB in (("ext", EL, EXT), ("48", SIG, P.rgb)):
        i = np.concatenate([((crop[s:s + 20000, None, :] - PLT[None]) ** 2).sum(-1).argmin(1) for s in range(0, len(crop), 20000)])
        de = float(np.sqrt(((crop - PLT[i]) ** 2).sum(-1)).mean())
        img = Image.fromarray(RGB[i].reshape(532, 450, 3).astype(np.uint8))
        img.save(os.path.join(out, f"{nm}-{tag}-1x.png")); img.resize((1350, 1596), Image.NEAREST).save(os.path.join(out, f"{nm}-{tag}-3x.png"))
        res[f"{nm}-{tag}"] = {"meanDE": round(de, 2), "colours_used": int(len(np.unique(i)))}
json.dump(res, open(os.path.join(out, "requant.json"), "w"), indent=1)
print(len(cols), "colours (", len(cols) - len(P.names), "new )", res)
