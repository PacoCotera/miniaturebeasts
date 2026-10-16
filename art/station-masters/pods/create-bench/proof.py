"""T-20261016-41 proof: S01's create-shape at 1x with the new masters at the spec's rects (specs/station-create-bench-spec.md §2, §3), and a
comparison sheet beside the references (Pods focused, Pods collection, the vivarium, the kit).
The bank, S01 (5 drums, no slide): Coat (Markings: plain), Face (Crown: leaf crest, turned, so the notch; focused, so the turn marks; Eyes:
between), Movement (Drive: a doing, pinned), Stamina (Efficiency: pinned); x 104, pitch 88, +16 between chapters, y 440.
Stand-ins (the build's): the pod in the well (S01's shell composed from the signed pod-large layers by pods.json podLayers.compose, reduced to
112 x 136); no live text (the chapter words, the name plate, the found sentence, the slip's lines, the bottom line), no focus ring, no
founder contact shadow (the build's).
usage: python3 -I create-bench/proof.py SLICES_DIR NEW_DIR GOLDENS_DIR CONCEPTS_DIR OUT_DIR"""
import sys, os, numpy as np
from PIL import Image
sl, nd_, gold, conc, out = sys.argv[1:6]; os.makedirs(out, exist_ok=True)
Lo = lambda p: Image.open(p).convert("RGBA")
N = lambda n: Lo(os.path.join(nd_, n + ".png"))
def shell():
    g = lambda n: np.asarray(Lo(f"{sl}/pod-large-{n}.png")).astype(float)
    A, B = np.array([0x46, 0x54, 0x59], float), np.array([0xdf, 0xd2, 0xae], float)
    shade = g("shade"); body, acc, pt = g("mask-body")[..., 3] / 255, g("mask-accent")[..., 3] / 255, g("pattern-dots")[..., 3] / 255
    col = (A * (body * (1 - pt))[..., None] + B * np.minimum(1, acc + pt)[..., None]) * (2 * shade[..., :3] / 255)
    alpha = np.maximum(body, acc) * (g("identified")[..., 3] / 255 > 0)
    return Image.fromarray(np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8), "RGBA").resize((112, 136), Image.LANCZOS)
f = Image.new("RGBA", (1024, 600), (22, 42, 55, 255)); f.alpha_composite(N("create-bench"), (0, 40))
f.alpha_composite(N("create-well"), (96, 96)); f.alpha_composite(shell(), (136, 128))
f.alpha_composite(N("create-gene-line"), (288, 192)); f.alpha_composite(N("create-dish"), (312, 372))
f.alpha_composite(N("founder-S01-base-304x312"), (360, 80)); f.alpha_composite(N("founder-S01-crown-leaf-crest-304x312"), (360, 80))
f.alpha_composite(N("slip-208x296"), (728, 96))
bank = [("rest", "look-S01-markings-plain-64x64", False), ("rest", "look-S01-crown-leaf-crest-64x64", True), ("rest", "look-S01-eyes-between-64x64", False),
        ("pinned", "look-S01-drive-64x64", False), ("pinned", "look-S01-efficiency-64x64", False)]
xs = [104, 208, 296, 400, 504]
for (state, look, turned), x in zip(bank, xs):
    f.alpha_composite(N(look), (x + 8, 448)); f.alpha_composite(N(f"create-drum-{state}"), (x, 440))
    if turned:
        f.alpha_composite(N("create-drum-notch"), (x + 34, 440))
        f.alpha_composite(N("create-drum-turn-up"), (x + 32, 440)); f.alpha_composite(N("create-drum-turn-down"), (x + 32, 512))
f.convert("RGB").save(os.path.join(out, "create-shape-S01-1x.png"))
refs = [Lo(os.path.join(gold, p)).convert("RGB") for p in ("pods/pods-overview-identified-pod-focused.png", "pods/pods-collection.png", "vivarium/vivarium-docked-day.png")]
k = Lo(os.path.join(conc, "hero-kit.png")).convert("RGB"); c = Image.new("RGB", (1024, 600), (24, 24, 24)); k.thumbnail((1024, 600)); c.paste(k, ((1024 - k.width) // 2, (600 - k.height) // 2)); refs.append(c)
sh = Image.new("RGB", (3 * 1024, 2 * 600))
sh.paste(f.convert("RGB").resize((2048, 1200), Image.NEAREST), (0, 0))
for i, r in enumerate(refs): sh.paste(r.resize((512, 300)), (2048 + (i % 2) * 512, (i // 2) * 300))
sh.paste(Image.new("RGB", (1024, 600), (10, 10, 10)), (2048, 600))
sh.resize((1536, 600)).save(os.path.join(out, "comparison-create-S01.png"))
print("proof written")
