"""Builds the pod placeholder sheets, atlas and contact sheets from the hand-editable source.

usage:  python3 -I build.py            (from anywhere)

Reads   source/pod-large.txt, pod-medium.txt, pod-small.txt, pod-well.txt   the drawings: pieces body, band, glow
        source/glyphs.txt                                                    the 16 species glyphs, 5x5 cells
        source/layout.json                                                   anchors, ramps, pigments, species
        ../../../../palettes/station.json                          the 62 colours
Writes  pod-bodies.png      sheet: per class, the sealed pod, the identified pod, the seal band and the glow
        pod-glyphs.png      sheet: per class, the 16 glyphs (cream, one cell = the class's glyph cell)
        pod-atlas.json      sprite rects, anchors, ramps, per-species remaps, how to composite, manifest entries
        contact-1x.png, contact-2x.png

Standard library only. PNGs are written here, indexed: PLTE holds the 62 palette colours in file order (index = position
in station.json) and entry 62 is the transparent index (tRNS alpha 0, the only alpha there is). A pixel can
only be a palette colour or empty: nothing can be off palette, there is no anti-aliasing and no dithering.

Source legend. The drawings use two base ramps that stand for "the species' colour A" and "colour B"; the species'
own colours replace them by a palette remap, one pass, indices to indices:
    O D B L H G   ramp A: outline, shade, base, light, highlight, glow core      (base: bar hairline bevel metal enamel frostS)
    o d b l h g   ramp B: the foot ring                                          (base: wine red coral peach blush white)
    n s t k c     fixed, never remapped: night, slate, stone, ink, cream         (the cap, stem, neck, band, glyph)
    .             empty
"""
import json, os, struct, sys, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "source")
CLASSES = ["large", "medium", "small", "well"]
GAP = 2
RAMP_CHARS = {"A": "ODBLHG", "B": "odblhg"}


def read_palette(layout):
    path = os.path.normpath(os.path.join(SRC, layout["palette"]))
    d = json.load(open(path, encoding="utf-8"))
    names = [n for n, _ in d["colours"]]
    assert len(names) == 62, "the palette must hold 62 colours, has %d" % len(names)
    rgb = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, h in d["colours"]]
    return names, rgb


def parse_pieces(path):
    pieces, rows, errors, cur = {}, None, [], None
    lines = open(path, encoding="utf-8").read().split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln or ln.startswith(";"):
            i += 1; continue
        if not ln.startswith("piece "):
            errors.append("%s line %d: expected 'piece <name> <w> <h>'" % (os.path.basename(path), i + 1)); i += 1; continue
        _, name, w, h = ln.split(); w, h = int(w), int(h)
        block = [l.rstrip("\n") for l in lines[i + 1:i + 1 + h]]
        for k, r in enumerate(block):
            if len(r) != w:
                errors.append("%s piece %s row %d: %d wide, header says %d" % (os.path.basename(path), name, k, len(r), w))
        pieces[name] = block
        i += 1 + h
    if errors:
        sys.exit("source errors:\n  " + "\n  ".join(errors))
    return pieces


def parse_glyphs(path):
    out, cur = {}, None
    for n, ln in enumerate(open(path, encoding="utf-8").read().split("\n"), 1):
        ln = ln.strip()
        if not ln or ln.startswith(";"):
            continue
        if ln[0] == "S" and ln[1:3].isdigit():
            cur = ln.split()[0]; out[cur] = []
        else:
            if cur is None or len(ln) != 5 or set(ln) - set(".#"):
                sys.exit("glyphs.txt line %d: a glyph row is 5 characters of . and #" % n)
            out[cur].append(ln)
    for k, v in out.items():
        if len(v) != 5:
            sys.exit("glyphs.txt: %s has %d rows, needs 5" % (k, len(v)))
    return out


# ---------------------------------------------------------------- png (stdlib, indexed)
def write_png(path, w, h, pix, palette, transparent=None):
    def chunk(t, d):
        c = struct.pack(">I", len(d)) + t + d
        return c + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + bytes(r) for r in pix)
    extra = b""
    if transparent is not None:
        extra = chunk(b"tRNS", bytes([255] * transparent + [0]))
    data = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
            + chunk(b"PLTE", b"".join(bytes(c) for c in palette)) + extra
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(data)


class Img:
    def __init__(self, w, h, fill):
        self.w, self.h = w, h
        self.p = [[fill] * w for _ in range(h)]

    def blit(self, src, x0, y0, skip):
        for y, row in enumerate(src.p):
            yy = y0 + y
            if not 0 <= yy < self.h:
                continue
            for x, v in enumerate(row):
                if v != skip and 0 <= x0 + x < self.w:
                    self.p[yy][x0 + x] = v

    def rect(self, x, y, w, h, v):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if 0 <= yy < self.h and 0 <= xx < self.w:
                    self.p[yy][xx] = v

    def scaled(self, k):
        return [[v for v in row for _ in range(k)] for row in self.p for _ in range(k)]


def main():
    layout = json.load(open(os.path.join(SRC, "layout.json"), encoding="utf-8"))
    names, rgb = read_palette(layout)
    idx = {n: i for i, n in enumerate(names)}
    T = len(names)                                   # the transparent index, 62
    palette = rgb + [(0, 0, 0)]
    legend = {}
    for ramp, chars in RAMP_CHARS.items():
        for c, n in zip(chars, layout["legend"][ramp]):
            legend[c] = idx[n]
    for c, n in layout["legend"]["fixed"].items():
        legend[c] = idx[n]
    legend["."] = T

    def to_img(rows):
        im = Img(len(rows[0]), len(rows), T)
        for y, r in enumerate(rows):
            for x, c in enumerate(r):
                if c not in legend:
                    sys.exit("unknown source character %r" % c)
                im.p[y][x] = legend[c]
        return im

    glyph_src = parse_glyphs(os.path.join(SRC, "glyphs.txt"))
    species = layout["species"]
    assert [s["id"] for s in species] == sorted(glyph_src), "glyphs.txt and layout.json disagree on the species"

    def glyph_img(rows, cell):
        im = Img(5 * cell, 5 * cell, T)
        for y, r in enumerate(rows):
            for x, c in enumerate(r):
                if c == "#":
                    im.rect(x * cell, y * cell, cell, cell, idx["cream"])
        return im

    # ---- the pieces, in class order
    pieces = {}
    for cl in CLASSES:
        pc = parse_pieces(os.path.join(SRC, "pod-%s.txt" % cl))
        c = layout["classes"][cl]
        body, band, glow = to_img(pc["body"]), to_img(pc["band"]), to_img(pc["glow"])
        assert (body.w, body.h) == (c["w"], c["h"]), "%s body must be %dx%d" % (cl, c["w"], c["h"])
        sealed = Img(body.w, body.h, T); sealed.blit(body, 0, 0, T); sealed.blit(band, c["band"][0], c["band"][1], T)
        pieces[cl] = {"sealed": sealed, "identified": body, "band": band, "glow": glow}

    # ---- the bodies sheet
    atlas_sprites = {}
    rows_w = [sum(pieces[cl][k].w for k in ("sealed", "identified", "band", "glow")) + 3 * GAP for cl in CLASSES]
    sheet_w = max(rows_w)
    sheet_h = sum(layout["classes"][cl]["h"] for cl in CLASSES) + GAP * (len(CLASSES) - 1)
    bodies = Img(sheet_w, sheet_h, T)
    y = 0
    for cl in CLASSES:
        x = 0
        for k in ("sealed", "identified", "band", "glow"):
            im = pieces[cl][k]
            bodies.blit(im, x, y, T)
            atlas_sprites["pod.%s.%s" % (cl, k)] = {"sheet": "pod-bodies.png", "x": x, "y": y, "w": im.w, "h": im.h}
            x += im.w + GAP
        y += layout["classes"][cl]["h"] + GAP
    write_png(os.path.join(HERE, "pod-bodies.png"), bodies.w, bodies.h, bodies.p, palette, T)

    # ---- the glyphs sheet
    gh_rows = [16 * (5 * layout["classes"][cl]["glyphCell"] + GAP) - GAP for cl in CLASSES]
    glyphs = Img(max(gh_rows), sum(5 * layout["classes"][cl]["glyphCell"] for cl in CLASSES) + GAP * 3, T)
    y = 0
    glyph_imgs = {}
    for cl in CLASSES:
        cell = layout["classes"][cl]["glyphCell"]; x = 0
        for s in species:
            im = glyph_img(glyph_src[s["id"]], cell)
            glyph_imgs[(cl, s["id"])] = im
            glyphs.blit(im, x, y, T)
            atlas_sprites["glyph.%s.%s" % (cl, s["id"])] = {"sheet": "pod-glyphs.png", "x": x, "y": y, "w": im.w, "h": im.h}
            x += im.w + GAP
        y += 5 * cell + GAP
    write_png(os.path.join(HERE, "pod-glyphs.png"), glyphs.w, glyphs.h, glyphs.p, palette, T)

    # ---- per-species remaps (base index -> species index), one pass
    base_idx = {r: [idx[n] for n in layout["legend"][r]] for r in ("A", "B")}
    remaps = {}
    for s in species:
        m = {}
        for slot, ramp in (("slotA", "A"), ("slotB", "B")):
            for b_, n in zip(base_idx[ramp], layout["pigments"][s[slot]]):
                m[b_] = idx[n]
        remaps[s["id"]] = m

    def remapped(im, sid):
        m = remaps[sid]
        out = Img(im.w, im.h, T)
        out.p = [[m.get(v, v) for v in row] for row in im.p]
        return out

    ground = idx["ground"]

    def compose(cl, state, sid):
        c = layout["classes"][cl]
        im = Img(c["w"], c["h"], T)
        im.blit(remapped(pieces[cl]["sealed" if state == "sealed" else "identified"], sid), 0, 0, T)
        im.blit(remapped(pieces[cl]["glow"], sid), c["glow"][0], c["glow"][1], T)
        if state == "identified":
            im.blit(glyph_imgs[(cl, sid)], c["glyph"][0], c["glyph"][1], T)
        return im

    # ---- the contact sheet
    M, G = 12, 16
    ids = {"large": "S02", "medium": "S01", "small": "S03", "well": "S01"}
    W = 1040
    cs = Img(W, 1000, ground)
    y = M
    # row 1: the raw pieces, sealed and identified, in the base ramps
    x = M
    for cl in CLASSES:
        for k in ("sealed", "identified"):
            im = pieces[cl][k]; cs.blit(im, x, y + 192 - im.h, T); x += im.w + G
    y += 192 + G
    # row 2: band and glow per class, as the sheet holds them
    x = M; row_h = 0
    for cl in CLASSES:
        for k in ("band", "glow"):
            im = pieces[cl][k]; cs.blit(im, x, y, T); x += im.w + G; row_h = max(row_h, im.h)
    y += row_h + G
    # rows 3-6: the 16 glyphs per class, on the cap's slate
    for cl in CLASSES:
        cell = layout["classes"][cl]["glyphCell"]; x = M
        for s in species:
            im = glyph_imgs[(cl, s["id"])]
            pad = max(2, cell)
            cs.rect(x, y, im.w + 2 * pad, im.h + 2 * pad, idx["slate"]); cs.blit(im, x + pad, y + pad, T)
            x += im.w + 2 * pad + (4 if cell > 2 else 2)
        y += 5 * cell + 2 * max(2, cell) + G
    # row 7: one composed pod per class, sealed and identified, bottom-aligned on a shared line
    base_y = y + 192
    x = M
    for cl in CLASSES:
        for st in ("sealed", "identified"):
            im = compose(cl, st, ids[cl]); cs.blit(im, x, base_y - im.h, T); x += im.w + G
    y = base_y + G
    # row 8: the sixteen species as identified wells
    x = M
    for s in species:
        cs.blit(compose("well", "identified", s["id"]), x, y, T); x += 32 + 8
    y += 40 + M
    cs.h = y; cs.p = cs.p[:y]
    write_png(os.path.join(HERE, "contact-1x.png"), cs.w, cs.h, cs.p, palette, T)
    write_png(os.path.join(HERE, "contact-2x.png"), cs.w * 2, cs.h * 2, cs.scaled(2), palette, T)

    # ---- the atlas
    cls_out = {}
    for cl in CLASSES:
        c = layout["classes"][cl]
        cls_out[cl] = {"box": [c["w"], c["h"]], "sealed": "pod.%s.sealed" % cl, "identified": "pod.%s.identified" % cl,
                       "band": "pod.%s.band" % cl, "glow": "pod.%s.glow" % cl, "glyph": "glyph.%s.<species id>" % cl,
                       "bandAt": c["band"], "glowAt": c["glow"], "glyphAt": c["glyph"], "glyphCell": c["glyphCell"],
                       "cap": c["cap"]}
    sp_out = {}
    for s in species:
        sp_out[s["id"]] = {"name": s["name"], "sizeClass": s["sizeClass"], "slotA": s["slotA"], "slotB": s["slotB"],
                           "remap": {str(k): v for k, v in sorted(remaps[s["id"]].items())},
                           "remapNames": {names[k]: names[v] for k, v in sorted(remaps[s["id"]].items())}}
    manifest = []
    for sheet, im in (("pod-bodies.png", bodies), ("pod-glyphs.png", glyphs)):
        manifest.append({"id": "pod.sheet." + sheet[4:-4], "file": "prototypes/ui/assets/placeholders/pod/" + sheet,
                         "w": im.w, "h": im.h, "status": "placeholder"})
    atlas = {
        "name": "Pod placeholders", "status": layout["status"],
        "note": "Hand-drawn placeholders: one drawing per size class and state, coloured per species by remap. Never a master.",
        "palette": {"file": "prototypes/ui/palettes/station.json", "colours": 62, "transparentIndex": T,
                    "names": names, "note": "PNG palette index = position in that file; index 62 is transparent (tRNS)"},
        "stage": layout["stage"],
        "ramps": {"A": {"chars": RAMP_CHARS["A"], "names": layout["legend"]["A"], "indices": base_idx["A"]},
                  "B": {"chars": RAMP_CHARS["B"], "names": layout["legend"]["B"], "indices": base_idx["B"]},
                  "fixed": {k: {"name": v, "index": idx[v]} for k, v in layout["legend"]["fixed"].items()}},
        "classes": cls_out, "sprites": atlas_sprites, "species": sp_out, "pigments": layout["pigments"],
        "composite": [
            "1. Place the class's box so it is bottom-centred on the stage anchor: box x = anchor.x - w/2, y = anchor.y - h (large (264,120), medium (276,144), small (288,168) with the anchor (344,312); well: centred in its 64 px ring cell).",
            "2. Draw the body sprite (sealed or identified), remapped to the species (single pass: each base index to its species index; keep every other index).",
            "3. Draw the glow sprite at box + glowAt, remapped the same way (a still stand-in for the soft inner glow; the builder may animate later).",
            "4. Identified only: draw glyph.<class>.<species id> at box + glyphAt, as it is (cream, never remapped).",
            "5. The sealed pod already has its seal band inside the sealed sprite. To break the seal over time, draw the identified body and the band sprite at box + bandAt, then remove the band.",
            "Nothing is scaled. The stem's top row is the box's top row; the shell's foot is the box's last row (y 312 for the pod on the stage)."],
        "manifest": manifest,
    }
    with open(os.path.join(HERE, "pod-atlas.json"), "w", encoding="utf-8") as f:
        json.dump(atlas, f, indent=1); f.write("\n")
    print("built: pod-bodies.png %dx%d, pod-glyphs.png %dx%d, contact %dx%d (1x), %d sprites" %
          (bodies.w, bodies.h, glyphs.w, glyphs.h, cs.w, cs.h, len(atlas_sprites)))


if __name__ == "__main__":
    main()
