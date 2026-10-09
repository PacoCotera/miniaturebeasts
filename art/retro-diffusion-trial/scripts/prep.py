"""Build the 48-colour Companion palette PNG and the reference crops."""
import json, os, sys
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

RAMPS = {
    "N": "#0e0c16 #1e1a2b #332e45 #4f4865 #766f8f #a8a2bf #dcd8ea",
    "W": "#2b1b19 #4f3226 #7f5536 #b6844f #e2bd83 #f8ead0",
    "G": "#0f3433 #1b5638 #2d823b #56ad45 #94d457 #d4f07f",
    "T": "#0a2c38 #0f5559 #188a83 #3cc6ae #a3f2d9",
    "B": "#172150 #1d4796 #2c80d4 #5fbbf2 #b4e7ff",
    "V": "#2b1850 #50329c #8461d6 #b99bf2 #e6d7ff",
    "R": "#4b1230 #9a2242 #dc4450 #ff8c7c #ffd3c4",
    "O": "#6e2610 #b5461a #f06d1e #ffa83e",
    "Y": "#c8860e #ffd23f #fff2a1",
    "PX": "#ff7fbf #ffffff",
}
colors = []
for ramp, s in RAMPS.items():
    for i, h in enumerate(s.split()):
        colors.append({"id": f"{ramp}{i}", "hex": h,
                       "rgb": [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]})
assert len(colors) == 48, len(colors)
# 48x1 strip, one pixel per colour, plus an 8x upscaled copy for humans.
strip = Image.new("RGB", (48, 1))
for i, c in enumerate(colors):
    strip.putpixel((i, 0), tuple(c["rgb"]))
strip.save(os.path.join(OUT, "companion-palette-48.png"))
strip.resize((48 * 8, 16), Image.NEAREST).save(os.path.join(OUT, "companion-palette-48-preview.png"))
json.dump(colors, open(os.path.join(OUT, "companion-palette-48.json"), "w"), indent=1)

# Reference crops (kept in the trial folder so the sidecars point at files that exist).
refs = os.path.join(OUT, "refs")
os.makedirs(refs, exist_ok=True)
# Screen area of the owner's reach concept photo: the cloud bank around the island.
im = Image.open(os.path.join(REPO, "art/concept-homepage/companion-map-hands.png"))
im.crop((560, 232, 980, 680)).save(os.path.join(refs, "map-hands-screen.png"))
im.crop((580, 240, 960, 650)).resize((256, 276), Image.LANCZOS).save(os.path.join(refs, "map-hands-clouds-256.png"))
# Hopper from the UI-kit Station Home mock-up.
sh = Image.open(os.path.join(REPO, "design/proposals/ui-kit/station-home.png")).convert("RGB")
sh.crop((140, 380, 260, 500)).save(os.path.join(refs, "station-home-hopper.png"))
sh.crop((16, 52, 664, 548)).save(os.path.join(refs, "station-home-vivarium.png"))
# Miniature Lives creature references (copied, unchanged pixels).
for src in ["assets/hibit-plain-280x300.png", "assets/rich-plain-300x310.png"]:
    Image.open(os.path.join(REPO, "art/miniature-lives", src)).convert("RGB").save(
        os.path.join(refs, os.path.basename(src)))
print("ok", [c["hex"] for c in colors][:3], os.listdir(refs))
