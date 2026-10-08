#!/usr/bin/env python3
"""Lays the one sheet of the plain placeholder: the accepted Pip as the bar on the first row, then six
specimens (the type specimen and five random individuals) of S01, S09 and S12, one species per block,
each at the three device sizes: the Station 300x310 (portrait view), the Companion 280x300, the 48 px
token at 1x and 3x. Device sizes at 1x. Run after `node plain/render.mjs`.

  python3 plain/compose.py
"""
import json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(WB))
BG = (246, 243, 236)
SPECIES = ["S01", "S09", "S12"]
INK = (40, 40, 50)


def flat(path):
    im = Image.open(path).convert("RGBA")
    out = Image.new("RGB", im.size, BG); out.paste(im, mask=im.split()[3])
    return out


def put(sheet, path, x, y, zoom=1):
    if not os.path.exists(path):
        return 0
    im = Image.open(path).convert("RGB")
    if zoom > 1:
        im = im.resize((im.width * zoom, im.height * zoom), Image.NEAREST)
    sheet.paste(im, (x, y))
    return im.width


def main():
    gap = 12; rowh = 310 + 30; block = 300 + gap + 280 + gap + 200 + gap
    W = gap + block * len(SPECIES); H = 60 + 7 * rowh
    sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
    draw.text((gap, 8), "The plain placeholder (framework/plain.mjs): the offline look while a Grow painting is pending. Device size at 1x. Row 1: the accepted Pip, the bar. Rows 2-7: the type specimen and five random individuals.", fill=INK)
    y0 = 44
    sheet.paste(flat(os.path.join(REPO, "art/miniature-lives/assets/rich-plain-300x310.png")), (gap, y0))
    sheet.paste(flat(os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")), (gap + 300 + gap, y0))
    draw.text((gap, y0 + 312), "the accepted Pip: rich treatment 300x310 (Station) and HiBit 280x300 (Companion); art/miniature-lives, accepted appearance reference", fill=INK)
    for b, sp in enumerate(SPECIES):
        bx = gap + b * block
        draw.text((bx, 26), f"{sp}: plain Station 300x310 (portrait view)", fill=INK)
        draw.text((bx + 300 + gap, 26), "plain Companion 280x300", fill=INK)
        draw.text((bx + 300 + gap + 280 + gap, 26), "plain token 48 at 1x and 3x", fill=INK)
        index = json.load(open(os.path.join(WB, "out/reference", sp, "index.json")))
        for r, m in enumerate(index["members"][:6]):
            y = y0 + (r + 1) * rowh; x = bx
            d = os.path.join(HERE, "renders", sp, m["id"])
            put(sheet, os.path.join(d, "portrait-300x310.png"), x, y); x += 300 + gap
            put(sheet, os.path.join(d, "companion-280x300.png"), x, y); x += 280 + gap
            put(sheet, os.path.join(d, "token-48.png"), x, y); put(sheet, os.path.join(d, "token-48.png"), x + 56, y, 3)
            draw.text((bx, y + 312), f"{m['id']}  {'type specimen' if m['level'] == 'species' else 'random individual, seed ' + str(m.get('seed'))}  sha256 {(m.get('genomeSha256') or '')[:12]}", fill=INK)
    sheet.save(os.path.join(HERE, "sheet.png"))
    print("sheet", sheet.size)


if __name__ == "__main__":
    main()
