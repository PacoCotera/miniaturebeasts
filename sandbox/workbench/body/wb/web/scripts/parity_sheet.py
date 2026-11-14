"""R5 parity sheets for the art desk, at 1x (text 16 px):
  python parity_sheet.py REFS_DIR BROWSER_DIR IOU_JSON OUT_DIR
Writes OUT_DIR/leg-length-live-and-blender-1x.png (Loika at both ends of leg length, Blender clay | live clay | the two silhouettes laid over each other)
and OUT_DIR/parity-sheet-1x.png (every variant at the four angles: Blender silhouette in blue, the live one in orange, where they agree in grey, with the IoU)."""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
PLATE = (243, 241, 238)
INK = (31, 28, 41)
BLUE, ORANGE, BOTH = (61, 91, 208), (224, 123, 32), (150, 150, 158)


def fill(path):
    return np.asarray(Image.open(path).convert("RGBA"))[..., 3] > 127


def overlay(ref, br):
    a, b = fill(ref), fill(br)
    img = np.zeros(a.shape + (3,), np.uint8)
    img[:] = PLATE
    img[a & ~b] = BLUE
    img[b & ~a] = ORANGE
    img[a & b] = BOTH
    return Image.fromarray(img)


def on_plate(path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, PLATE + (255,))
    return Image.alpha_composite(bg, im).convert("RGB")


def main():
    refs, br, iou_json, out = sys.argv[1:5]
    os.makedirs(out, exist_ok=True)
    iou = json.load(open(iou_json))["iou"]
    W, H = 608, 624
    # the legs at both ends, live and Blender side by side
    rows = [("leg-length-lo", "Leg length at its low limit (0.85)"), ("leg-length-hi", "Leg length at its high limit (1.15)")]
    cols = ["Blender clay", "Live in the page", "The two silhouettes: Blender blue, live orange, both grey"]
    top = 70
    sheet = Image.new("RGB", (W * 3 + 40, top + len(rows) * (H + 50)), PLATE)
    d = ImageDraw.Draw(sheet)
    d.text((10, 8), "Loika, az 32: the live viewport against the server's Blender proxy", font=BOLD, fill=INK)
    for c, t in enumerate(cols):
        d.text((10 + c * (W + 10), 40), t, font=FONT, fill=INK)
    for r, (v, t) in enumerate(rows):
        y = top + r * (H + 50)
        d.text((10, y), f"{t}   IoU {iou[v]['32']:.4f}", font=FONT, fill=INK)
        sheet.paste(on_plate(os.path.join(refs, f"clay-{v}-az32.png")), (10, y + 26))
        sheet.paste(on_plate(os.path.join(br, f"clay-{v}-az32.png")), (10 + W + 10, y + 26))
        sheet.paste(overlay(os.path.join(refs, f"{v}-az32.png"), os.path.join(br, f"{v}-az32.png")), (10 + 2 * (W + 10), y + 26))
    sheet.save(os.path.join(out, "leg-length-live-and-blender-1x.png"))

    # every variant at the four angles
    cw, ch = 304, 312
    names = list(iou)
    top = 90
    sheet = Image.new("RGB", (230 + 4 * (cw + 6), top + len(names) * (ch + 6)), PLATE)
    d = ImageDraw.Draw(sheet)
    d.text((10, 8), "Parity: Blender proxy against the live viewport", font=BOLD, fill=INK)
    d.text((10, 36), "Blender only blue, live only orange, both grey. Each cell: IoU of the filled pixels.", font=FONT, fill=INK)
    for j, az in enumerate((0, 32, 90, 180)):
        d.text((230 + j * (cw + 6) + 6, 64), f"az {az}", font=FONT, fill=INK)
    for i, v in enumerate(names):
        y = top + i * (ch + 6)
        d.text((10, y + 8), v, font=FONT, fill=INK)
        for j, az in enumerate((0, 32, 90, 180)):
            im = overlay(os.path.join(refs, f"{v}-az{az}.png"), os.path.join(br, f"{v}-az{az}.png")).resize((cw, ch), Image.LANCZOS)
            sheet.paste(im, (230 + j * (cw + 6), y))
            ImageDraw.Draw(sheet).text((230 + j * (cw + 6) + 6, y + ch - 24), f"{iou[v][str(az)]:.4f}", font=FONT, fill=INK)
    sheet.save(os.path.join(out, "parity-sheet-1x.png"))


if __name__ == "__main__":
    main()
