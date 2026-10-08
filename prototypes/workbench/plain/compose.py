#!/usr/bin/env python3
"""Lays one sheet per species for the plain renderer's first round (plain-renderer.md §6): the accepted
Pip as the bar on the first row, then six specimens (the type specimen and five random individuals),
each with the plain Station render beside its stage 1 portrait where one was painted, the plain
Companion beside the portrait's derived Companion, the 48 px token at 1x and 3x, and the rig's
shaded pass (the control image) for reference. Device sizes at 1x. Run after `node plain/render.mjs`.

  python3 plain/compose.py
"""
import json, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
WB = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(WB))
BG = (246, 243, 236)
SPECIES = ["S01", "S09", "S12"]


def flat(path, size=None):
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
    os.makedirs(os.path.join(HERE, "sheets"), exist_ok=True)
    cols = [("plain Station 300x310", 300), ("stage 1 portrait 300x310", 300), ("plain Companion 280x300", 280), ("portrait Companion derived", 280), ("plain token 48 at 1x and 3x", 200), ("rig shaded pass (control)", 300)]
    gap = 12; rowh = 310 + 30
    for sp in SPECIES:
        index = json.load(open(os.path.join(WB, "out/reference", sp, "index.json")))
        members = index["members"][:6]
        W = gap + sum(w + gap for _, w in cols); H = 70 + (len(members) + 1) * rowh
        sheet = Image.new("RGB", (W, H), (255, 255, 255)); draw = ImageDraw.Draw(sheet)
        draw.text((gap, 8), f"{sp} plain renderer, first round (placeholder species sheet): device size at 1x. Row 1: the accepted Pip, the bar. Rows 2-7: the type specimen and five random individuals.", fill=(40, 40, 50))
        x = gap
        for name, w in cols:
            draw.text((x, 26), name, fill=(40, 40, 50)); x += w + gap
        y = 44
        sheet.paste(flat(os.path.join(REPO, "art/miniature-lives/assets/rich-plain-300x310.png")), (gap, y))
        sheet.paste(flat(os.path.join(REPO, "art/miniature-lives/assets/hibit-plain-280x300.png")), (gap + 2 * (300 + gap), y))
        draw.text((gap, y + 312), "the accepted Pip: rich treatment 300x310 (Station) and HiBit 280x300 (Companion); art/miniature-lives, accepted appearance reference", fill=(40, 40, 50))
        for r, m in enumerate(members):
            y = 44 + (r + 1) * rowh; x = gap
            d = os.path.join(HERE, "renders", sp, m["id"]); s1 = os.path.join(WB, "stage1", "unique", sp, m["id"])
            put(sheet, os.path.join(d, "station-300x310.png"), x, y); x += 300 + gap
            if not put(sheet, os.path.join(s1, "station-300x310.png"), x, y): draw.text((x, y + 140), "no portrait painted", fill=(120, 120, 130))
            x += 300 + gap
            put(sheet, os.path.join(d, "companion-280x300.png"), x, y); x += 280 + gap
            if not put(sheet, os.path.join(s1, "companion-derived-280x300.png"), x, y): draw.text((x, y + 140), "no portrait painted", fill=(120, 120, 130))
            x += 280 + gap
            put(sheet, os.path.join(d, "token-48.png"), x, y); put(sheet, os.path.join(d, "token-48.png"), x + 56, y, 3); x += 200 + gap
            put(sheet, os.path.join(d, "shaded-300x310.png"), x, y)
            draw.text((gap, y + 312), f"{m['id']}  {'type specimen' if m['level'] == 'species' else 'random individual, seed ' + str(m.get('seed'))}  sha256 {(m.get('genomeSha256') or '')[:12]}", fill=(40, 40, 50))
        sheet.save(os.path.join(HERE, "sheets", f"{sp}.png"))
        print("sheet", sp, sheet.size)


if __name__ == "__main__":
    main()
