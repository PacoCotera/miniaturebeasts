"""Round 2 of the who-it-is marks (the lead's verdict): the frost mark veiled, and the clan roundels by plan.
python3 -I tools/marks3.py   (rewrites mark-species-frost-24x24 and mark-clan-<CNN>-24x24, prints the clan table and the collision check, writes marks/marks-round2-1x.png)
- frost: a veiled mark, not a light: a 22 px disc in frostS at a low alpha with a frostD texture at about 0.5 alpha; its mean grey (over black) is held under the name plate's.
- clan: the roundel's SHAPE follows the clan's plan (one shape per plan code: ten plans, ten shapes), a 2 px ring in the clan's anchor pigment and a solid 8 px centre; the centre takes the anchor
  too unless plan plus anchor collide with another clan (then it takes the clan's second pigment). No symbols."""
import json, os, hashlib, itertools
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
PIG = {"charcoal": "#465459", "coral": "#e98268", "lagoon": "#269fa5", "russet": "#ae674d", "marigold": "#e8b83f", "cobalt": "#4d7ed4", "jade": "#38a878", "plum": "#a967b8", "periwinkle": "#8b7dd8",
       "cream": "#dfd2ae", "slate": "#718489", "milk-mint": "#d8f1d4", "ice": "#d9ecf5", "butter": "#fff0b8", "peach": "#ffd7c5"}
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
man = json.load(open("slices/manifest.json"))
def save(name, im, rect, made, src):
    im = im.convert("RGBA"); im.save(f"slices/{name}.png", optimize=True)
    man[name] = {"size": list(im.size), "rect": rect, "src": src, "made": made, "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
# ---- the frost mark
plate = np.asarray(Image.open("slices/plate-name-80x24.png").convert("RGBA")).astype(float); pm = plate[..., 3] > 128
plate_mean = float(((plate[..., :3] @ np.array([0.299, 0.587, 0.114]))[pm]).mean())
yy, xx = np.mgrid[0:24, 0:24]; rr = np.hypot(xx - 11.5, yy - 11.5); disc = rr <= 11.0
rng = np.random.RandomState(7); tex = rng.rand(24, 24) < 0.42
A0 = 0.22                                                                                     # the veil: frostS at a low alpha
out = np.zeros((24, 24, 4)); out[disc, :3] = PAL["frostS"]; out[disc, 3] = A0 * 255
t = disc & tex; out[t, :3] = PAL["frostD"]; out[t, 3] = (A0 + (1 - A0) * 0.5 * 0.0 + 0.5 * A0 * 0.9) * 255       # a frostD stipple at about half again the veil's alpha
rim = disc & (rr > 9.4) & ((xx - 11.5) + (yy - 11.5) < -2); out[rim, :3] = PAL["frostD"]; out[rim, 3] = A0 * 1.6 * 255                      # a faint lit rim upper left
im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA"); a = np.asarray(im).astype(float); fm = a[..., 3] > 0
mark_mean = float(((a[..., :3] * a[..., 3:4] / 255) @ np.array([0.299, 0.587, 0.114]))[fm].mean())
save("mark-species-frost-24x24", im, [200, 488, 24, 24], f"the unidentified pod's mark, veiled: a 22 px disc in frostS at alpha 0.22 with a frostD stipple (about 0.5 alpha above the veil) and a faint lit rim; its mean grey over black {mark_mean:.1f}, the name plate's {plate_mean:.1f}", "geometry, seeded stipple")
print("frost mean", round(mark_mean, 1), "plate mean", round(plate_mean, 1))
# ---- the clans
PLAN_SHAPE = {"B1·L4": "circle", "B2·L4": "rounded square", "B3·L4": "hexagon (flat)", "B3": "vertical stadium", "B3·L6": "octagon", "B2·L2·flaps": "diamond", "B3·L6·flaps": "pentagon (up)",
              "R1·flaps": "hexagon (pointy)", "Rfan2·rays": "horizontal stadium", "Bfan3": "pentagon (down)"}
def sdf(shape, x, y):
    def ngon(n, rot, apo):
        d = -1e9
        for k in range(n):
            ang = rot + 2 * np.pi * k / n; d = np.maximum(d, x * np.cos(ang) + y * np.sin(ang))
        return d - apo
    if shape == "circle": return np.hypot(x, y) - 11.5
    if shape == "rounded square": q = np.maximum(np.abs(x) - 8.5, 0), np.maximum(np.abs(y) - 8.5, 0); return np.hypot(*q) - 3.0 + np.minimum(np.maximum(np.abs(x) - 11.5, np.abs(y) - 11.5), 0) * 0 - (0)  # box 11.5 with 3 px corners
    if shape == "hexagon (flat)": return ngon(6, 0.0, 10.2)
    if shape == "hexagon (pointy)": return ngon(6, np.pi / 2, 10.2)
    if shape == "octagon": return ngon(8, np.pi / 8, 11.2)
    if shape == "diamond": return ngon(4, np.pi / 4, 8.6)                            # a square on its corner
    if shape == "pentagon (up)": return ngon(5, -np.pi / 2 + np.pi, 9.8)
    if shape == "pentagon (down)": return ngon(5, -np.pi / 2, 9.8)
    if shape == "vertical stadium": return np.hypot(x, np.maximum(np.abs(y) - 4.5, 0)) - 8.2
    if shape == "horizontal stadium": return np.hypot(np.maximum(np.abs(x) - 4.5, 0), y) - 8.2
def roundel(shape, ring, dot):
    S = 8; N = 24; g = (np.arange(N * S) + 0.5) / S - 12.0; X, Y = np.meshgrid(g, g)
    if shape == "rounded square":                                                       # a 23 px box with 4 px corners
        q = np.maximum(np.abs(X) - 7.5, 0), np.maximum(np.abs(Y) - 7.5, 0); d = np.hypot(*q) - 4.0
    else: d = sdf(shape, X, Y)
    outer = d <= 0; ringm = outer & (d > -2.0); centre = np.hypot(X, Y) <= 4.0
    cov = lambda m: m.reshape(N, S, N, S).mean((1, 3)) >= 0.5                           # crisp pixels
    im = Image.new("RGBA", (N, N), (0, 0, 0, 0)); R, C = cov(ringm), cov(centre)
    for y in range(N):
        for x in range(N):
            if C[y, x]: im.putpixel((x, y), dot + (255,))
            elif R[y, x]: im.putpixel((x, y), ring + (255,))
    return im
frames = {f"S{i:02d}": json.load(open(os.path.join(REPO, f"prototypes/workbench/frames/species-S{i:02d}.json"))) for i in range(1, 17)}
clans = []
for sp, d in frames.items():
    t = d["taxonomy"]; clans.append({"clan": t["clan"], "name": t["clanName"], "plan": t["planCode"], "anchor": d["signature"]["anchor"], "second": d["signature"].get("second"), "species": sp})
key = lambda c: (PLAN_SHAPE[c["plan"]], c["anchor"])
for c in clans:
    c["collide"] = sum(1 for o in clans if o is not c and key(o) == key(c)) > 0
    c["dot"] = (c["second"] if c["collide"] and c["second"] else c["anchor"])
print("clan plan -> shape | anchor | second | dot")
for c in clans: print(c["clan"], c["name"], c["plan"], "->", PLAN_SHAPE[c["plan"]], "|", c["anchor"], "|", c["second"], "|", c["dot"], "(second pigment: collision)" if c["collide"] else "")
bad = [(a["clan"], b["clan"]) for a, b in itertools.combinations(clans, 2) if PLAN_SHAPE[a["plan"]] == PLAN_SHAPE[b["plan"]] and (a["anchor"], a["dot"]) == (b["anchor"], b["dot"])]
share_ring = [(a["clan"], b["clan"]) for a, b in itertools.combinations(clans, 2) if PLAN_SHAPE[a["plan"]] == PLAN_SHAPE[b["plan"]] and a["anchor"] == b["anchor"]]
inks_both = [(a["clan"], b["clan"]) for a, b in itertools.combinations(clans, 2) if PLAN_SHAPE[a["plan"]] == PLAN_SHAPE[b["plan"]] and a["anchor"] != b["anchor"] and a["dot"] != b["dot"]]
print("pairs identical in shape and both inks:", bad, "| same shape and same ring (told apart by the dot only):", share_ring)
assert not bad
shape_of = {c["clan"]: PLAN_SHAPE[c["plan"]] for c in clans}
masks = {}
for c in clans:
    im = roundel(shape_of[c["clan"]], rgb(PIG[c["anchor"]]), rgb(PIG[c["dot"]])); masks[c["clan"]] = np.asarray(im)[..., 3] > 0
    save(f"mark-clan-{c['clan']}-24x24", im, [232, 488, 24, 24], f"clan {c['clan']} ({c['name']}), plan {c['plan']}: a {shape_of[c['clan']]} roundel, a 2 px ring in {c['anchor']} {PIG[c['anchor']]} and a solid 8 px centre in {c['dot']} {PIG[c['dot']]}" + (" (the clan's second pigment, because plan and anchor collide with another clan)" if c["collide"] else ""), "geometry, species frames")
worst = max(((np.logical_and(masks[a], masks[b]).sum() / np.logical_or(masks[a], masks[b]).sum(), a, b) for a, b in itertools.combinations(masks, 2) if shape_of[a] != shape_of[b]), key=lambda t: t[0])
print("most similar pair of different shapes (mask IoU):", round(worst[0], 2), worst[1], worst[2])
json.dump(man, open("slices/manifest.json", "w"), indent=1)
# the sheet
FD = "/usr/share/fonts/opentype/inter/"; f12 = ImageFont.truetype(FD + "Inter-Regular.otf", 11)
sheet = Image.new("RGBA", (8 * 120, 2 * 64 + 40), (16, 26, 36, 255)); d = ImageDraw.Draw(sheet)
for k, c in enumerate(clans):
    x0 = (k % 8) * 120; y0 = (k // 8) * 64
    sheet.alpha_composite(Image.open(f"slices/mark-clan-{c['clan']}-24x24.png").convert("RGBA"), (x0 + 8, y0 + 8)); d.text((x0 + 38, y0 + 10), c["clan"], font=f12, fill=(170, 180, 190, 255)); d.text((x0 + 38, y0 + 24), shape_of[c["clan"]][:16], font=f12, fill=(110, 124, 142, 255))
yb = 2 * 64 + 6; bg = Image.new("RGBA", (30, 30), PAL["panel"] + (255,)); sheet.alpha_composite(bg, (8, yb)); sheet.alpha_composite(Image.open("slices/mark-species-frost-24x24.png").convert("RGBA"), (11, yb + 3))
d.text((46, yb + 8), "frost mark over the panel", font=f12, fill=(170, 180, 190, 255))
os.makedirs("marks", exist_ok=True); sheet.convert("RGB").save("marks/marks-round2-1x.png"); sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).convert("RGB").save("marks/marks-round2-2x-proof.png")
