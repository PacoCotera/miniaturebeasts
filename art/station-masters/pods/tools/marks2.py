"""Brief (c) and (d): ring-kin-56x56 (painted like the collection ring), mark-cangrow-16x16 and mark-waiting-24x24 (typed pixel rows in the emblem manner: '#' base, '+' lit edge upper left, '.' empty).
python3 -I tools/marks2.py   (writes the slices, the manifest entries and marks/marks-cd-1x.png)"""
import json, os, hashlib
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT); REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
PAL = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open(os.path.join(REPO, "prototypes/ui/palettes/station.json")))["colours"]}
man = json.load(open("slices/manifest.json"))
def save(name, im, rect, made, src):
    im = im.convert("RGBA"); im.save(f"slices/{name}.png", optimize=True); man[name] = {"size": list(im.size), "rect": rect, "src": src, "made": made, "sha256": hashlib.sha256(open(f"slices/{name}.png", "rb").read()).hexdigest()}
# (c) the kin ring: 56x56, a 3 px band (r 25 to 28) painted like the collection ring: 8x supersampled, bevel fill with a gentle light from the upper left, hairline edges
S = 8; N = 56
yy, xx = np.mgrid[0:N * S, 0:N * S].astype(float); x = (xx + 0.5) / S - N / 2; y = (yy + 0.5) / S - N / 2; r = np.hypot(x, y)
m = (r >= 25.0) & (r <= 28.0); lit = np.clip(0.5 - (x + y) / 56.0, 0, 1); bevel = np.array([90.0, 102.0, 114.0]); hair = np.array([60.0, 75.0, 87.0]); sand = np.array([200.0, 214.0, 228.0])
f = bevel[None, None, :] * (1 - 0.16 * (1 - lit[..., None])) + sand[None, None, :] * 0.16 * lit[..., None]
col = np.where(((r < 25.9) | (r > 27.1))[..., None], hair[None, None, :] * 0.8 + f * 0.2, f)
cov = m.reshape(N, S, N, S).mean((1, 3)); c = (col * m[..., None]).reshape(N, S, N, S, 3).sum((1, 3)) / np.maximum(m.reshape(N, S, N, S).sum((1, 3)), 1)[..., None]
save("ring-kin-56x56", Image.fromarray(np.clip(np.dstack([c, cov * 255]), 0, 255).astype(np.uint8), "RGBA"), [None, None, 56, 56], "the kin ring: a 3 px band (r 25 to 28) in bevel with hairline edges, painted at 8x with soft edges and a gentle light from the upper left; centred on the 40x48 pod in the 56x56 cell (rings from (600, 224) on a 64 px pitch)", "procedural, supersampled 8x")
# (d) typed rows. can-grow: a bud with two leaves on a stem (16x16); waiting: three pods receding (24x24). base/lit colours: a quiet sprout green with a lime lit edge; mist with a fog lit edge
cangrow = ["................", ".......++.......", "......+###......", ".....+#####.....", ".....+#####.....", ".....+#####.....", "......+###......", ".......###......", "..++...###...++.", ".+####.###.####.", "..+#####.#####..", "...+###.#.###...", "....+##.#.##....", ".......###......", ".......###......", "................"]
waiting = ["........................"] * 24
spans = {4: [(3, "+###")], 5: [(2, "+#####")], 6: [(2, "+#####")], 7: [(2, "+#####")], 8: [(2, "+#####")], 9: [(3, "+###")],
         6.5: [], 8: [(2, "+#####"), (11, "+##")], 7: [(2, "+#####"), (11, "+##")], 9: [(3, "+###"), (11, "+##")], 10: [(12, "##")]}
rows = [["."] * 24 for _ in range(24)]
def blob(cx, cy, rw, rh):
    out = []
    for y in range(cy - rh, cy + rh + 1):
        for x in range(cx - rw, cx + rw + 1):
            if ((x - cx) / (rw + 0.5)) ** 2 + ((y - cy) / (rh + 0.5)) ** 2 <= 1.0: out.append((x, y))
    return out
for (cx, cy, rw, rh) in ((5, 14, 4, 5), (14, 15, 3, 4), (21, 16, 2, 3)):                  # three pods, large to small, receding to the right: waiting beyond the rack
    pts = blob(cx, cy, rw, rh); S_ = set(pts)
    for (x, y) in pts: rows[y][x] = "+" if ((x - 1, y) not in S_ or (x, y - 1) not in S_) else "#"
waiting = ["".join(r) for r in rows]
for nm, rws, base, lit, rect, made in (("mark-cangrow-16x16", cangrow, "sprout", "lime", [None, None, 16, 16], "the can-grow mark: a bud with two leaves on a stem, in the emblem manner (a quiet sprout green with a lime lit edge upper left); at the place + (184, 168)"),
                                         ("mark-waiting-24x24", waiting, "mist", "fog", [16, 528, 24, 24], "the waiting-beyond-the-rack mark: three pods receding to the right, large to small, mist with a fog lit edge upper left; one quiet mark, never a number; at (16, 528)")):
    assert all(len(r) == len(rws) for r in rws), nm
    im = Image.new("RGBA", (len(rws), len(rws)), (0, 0, 0, 0))
    for y, rw in enumerate(rws):
        for x, ch in enumerate(rw):
            if ch in "#+": im.putpixel((x, y), PAL[lit if ch == "+" else base] + (255,))
    save(nm, im, rect, made, "typed by hand")
json.dump(man, open("slices/manifest.json", "w"), indent=1)
sheet = Image.new("RGBA", (200, 72), (42, 46, 56, 255))
for i, n in enumerate(("ring-kin-56x56", "mark-cangrow-16x16", "mark-waiting-24x24")): sheet.alpha_composite(Image.open(f"slices/{n}.png").convert("RGBA"), (8 + i * 72, 8))
sheet.alpha_composite(Image.open("slices/pod-well-identified.png").convert("RGBA"), (8 + 8, 8 + 4))
os.makedirs("marks", exist_ok=True); sheet.convert("RGB").save("marks/marks-cd-1x.png"); sheet.resize((800, 288), Image.NEAREST).convert("RGB").save("marks/marks-cd-4x-proof.png")
