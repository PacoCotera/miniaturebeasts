"""The collection overview's places at 1x (design-station-frame ed904fb8 A): six places on the 3x2 grid (16 + 336c, 48 + 240r, 320, 224), each a recessed panel with its ring (176x176 at the
place + (8, 24)), the 88x112 collection pod centred on the ring, the name plate, the place picture, the glint star. Written to places/collection-proof-1x.png. Stand-ins: the panel, the plates' text,
the can-grow mark and the waiting mark are not painted yet. python3 -I tools/collection_proof.py"""
import os
from PIL import Image, ImageDraw, ImageFont
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FD = "/usr/share/fonts/opentype/inter/"; f20 = ImageFont.truetype(FD + "Inter-Medium.otf", 20)
S = lambda n: Image.open(f"slices/{n}.png").convert("RGBA")
cv = Image.new("RGBA", (1024, 600), (16, 26, 36, 255)); cv.alpha_composite(S("room-bench-stage-collection"), (0, 40)); d = ImageDraw.Draw(cv)
places = [("Loika", "pod-collection-identified", 6, [0, 1, 2], "meadow"), ("Unknown", "pod-collection-unknown", None, [], "pond"), ("Tuikis", "pod-collection-identified", 8, list(range(8)), "rock"),
          (None, None, None, [], None), ("Belatz", "pod-collection-sealed", 5, [0, 1], "wood"), ("Peplos", "pod-collection-identified", 4, [], "cave")]
for k, (name, pod, n, read, pic) in enumerate(places):
    c, r = k % 3, k // 3; px, py = 16 + 336 * c, 48 + 240 * r
    card = S("panel-place-320x224").copy(); cd = ImageDraw.Draw(card)
    if n is None and pod is None: ring = S("ring-collection-idle-176x176"); card.alpha_composite(ring, (8, 24))
    elif n is None: card.alpha_composite(S("ring-collection-idle-176x176"), (8, 24))
    elif len(read) == n: card.alpha_composite(S("ring-collection-closed-176x176"), (8, 24))
    else:
        card.alpha_composite(S(f"ring-arc-collection-n{n}-track-176x176"), (8, 24))
        for i in read: card.alpha_composite(S(f"ring-arc-collection-n{n}-s{i + 1}-176x176"), (8, 24))
    if pod: card.alpha_composite(S(pod), (96 - 44, 112 - 56))
    if name:
        card.alpha_composite(S("plate-name-80x24") if len(name) < 6 else S("plate-name-96x24"), (184, 64)) if os.path.exists("slices/plate-name-96x24.png") or len(name) < 6 else None
        cd.text((184 + 40, 76), name, font=f20, fill=(241, 235, 223, 255), anchor="mm")
        card.alpha_composite(S(f"place-{pic}-48x48"), (184, 104))
        if n is not None and len(read) < n: card.alpha_composite(S("glint-star-12x12"), (148, 40))
    cv.alpha_composite(card, (px, py))
os.makedirs("places", exist_ok=True); cv.convert("RGB").save("places/collection-proof-1x.png")
