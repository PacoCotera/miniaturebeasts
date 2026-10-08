"""Checks the pod placeholders: counts off-palette pixels and the rest of the rules. Exit status 1 on any failure.

usage:  python3 -I check.py            (from anywhere; run build.py first)

Standard library only. It decodes the built PNGs itself and tests the pixels, not the source:
  - off-palette pixels in every PNG (an opaque pixel whose colour is not one of the 62 in station-settled.json): must be 0;
  - the PNG palette is the 62 colours in file order, plus the one transparent entry; alpha only 0 or 255 (no partial alpha);
  - no pixel in void (black), no outline in black;
  - the atlas rects fit their sheets and the sprites are not empty; sprite sizes equal the class box;
  - the stem's top row is the box's top row and the shell's foot is the box's last row, both centred;
  - the sealed sprite is the identified sprite plus exactly the band, and the glyph is clear of the stem, the cap's edge and the neck;
  - the glow sits wholly inside the shell; the glyph source equals the frames' glyphs;
  - isolated pixels (no 8-neighbour of the same colour) per sprite, which would be noise in a clean band;
  - nothing is scaled: every glyph is a whole-number multiple of its 5x5 source.
"""
import json, os, struct, sys, zlib, glob

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", ".."))


def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    pos, chunks = 8, {}
    idat = b""
    while pos < len(d):
        n, t = struct.unpack(">I4s", d[pos:pos + 8]); body = d[pos + 8:pos + 8 + n]; pos += 12 + n
        if t == b"IDAT":
            idat += body
        else:
            chunks[t] = body
    w, h, depth, ctype, _, _, inter = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    assert (depth, ctype, inter) == (8, 3, 0), "%s: not an 8-bit indexed, non-interlaced PNG" % path
    raw = zlib.decompress(idat)
    rows, prev = [], bytearray(w)
    for y in range(h):
        f = raw[y * (w + 1)]; line = bytearray(raw[y * (w + 1) + 1:(y + 1) * (w + 1)])
        for x in range(w):
            a = line[x - 1] if x else 0; b = prev[x]; c = prev[x - 1] if x else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    pl = chunks[b"PLTE"]
    pal = [tuple(pl[i:i + 3]) for i in range(0, len(pl), 3)]
    trns = list(chunks.get(b"tRNS", b""))
    return w, h, rows, pal, trns


def main():
    atlas = json.load(open(os.path.join(HERE, "pod-atlas.json")))
    pj = json.load(open(os.path.join(ROOT, atlas["palette"]["file"])))
    names = [n for n, _ in pj["colours"]]
    want = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for _, h in pj["colours"]]
    T = atlas["palette"]["transparentIndex"]
    fails = []
    sheets = {}
    off_total = 0
    print("off-palette pixels")
    for f in ("pod-bodies.png", "pod-glyphs.png", "contact-1x.png", "contact-2x.png"):
        w, h, rows, pal, trns = read_png(os.path.join(HERE, f))
        sheets[f] = (w, h, rows)
        off = 0; opaque = 0
        for r in rows:
            for v in r:
                if v == T:
                    continue
                opaque += 1
                if v >= len(pal) or v >= 62 or pal[v] != want[v]:
                    off += 1
        pal_ok = pal[:62] == want and len(pal) == 63
        alpha_ok = trns == [255] * T + [0]
        void = sum(1 for r in rows for v in r if v == names.index("void"))
        print("  %-16s %5dx%-4d opaque %7d  off-palette %d  void %d  palette %s  alpha %s" %
              (f, w, h, opaque, off, void, "62+1 ok" if pal_ok else "WRONG", "0/255 only" if alpha_ok else "WRONG"))
        off_total += off
        if off or void or not pal_ok or not alpha_ok:
            fails.append(f + ": palette")
    print("  total off-palette: %d" % off_total)

    def sprite(sid):
        s = atlas["sprites"][sid]; w, h, rows = sheets[s["sheet"]]
        assert s["x"] + s["w"] <= w and s["y"] + s["h"] <= h, sid + " outside its sheet"
        return [list(rows[s["y"] + y][s["x"]:s["x"] + s["w"]]) for y in range(s["h"])]

    print("sprites")
    for sid, s in atlas["sprites"].items():
        px = sprite(sid)
        if not any(v != T for r in px for v in r):
            fails.append(sid + ": empty")
    iso_total = 0
    for sid in atlas["sprites"]:
        if sid.startswith("glyph."):
            continue
        px = sprite(sid); h, w = len(px), len(px[0]); iso = 0
        for y in range(h):
            for x in range(w):
                v = px[y][x]
                if v == T:
                    continue
                if not any(0 <= y + dy < h and 0 <= x + dx < w and px[y + dy][x + dx] == v for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1))):
                    iso += 1
        iso_total += iso
        if iso:
            print("  isolated pixels in %s: %d" % (sid, iso))
    print("  isolated pixels in all pieces: %d" % iso_total)
    if iso_total:
        fails.append("isolated pixels")

    print("geometry")
    for cl, c in atlas["classes"].items():
        W, H = c["box"]
        sealed, ident, band, glow = (sprite(c[k]) for k in ("sealed", "identified", "band", "glow"))
        for nm, im in (("sealed", sealed), ("identified", ident)):
            if (len(im[0]), len(im)) != (W, H):
                fails.append("%s %s size" % (cl, nm))
        top = [x for x, v in enumerate(ident[0]) if v != T]; foot = [x for x, v in enumerate(ident[H - 1]) if v != T]
        ok_top = top and (min(top) + max(top) + 1) == W
        ok_foot = foot and (min(foot) + max(foot) + 1) == W
        print("  %-6s box %3dx%-3d stem top row 0: %s, centred: %s; shell foot row %d: %s, centred: %s" %
              (cl, W, H, bool(top), bool(ok_top), H - 1, bool(foot), bool(ok_foot)))
        if not (ok_top and ok_foot):
            fails.append(cl + ": stem top or foot not on the box edge, centred")
        # sealed = identified + band
        bx, by = c["bandAt"]; diff = 0
        for y in range(H):
            for x in range(W):
                inb = 0 <= y - by < len(band) and 0 <= x - bx < len(band[0]) and band[y - by][x - bx] != T
                want_v = band[y - by][x - bx] if inb else ident[y][x]
                if sealed[y][x] != want_v:
                    diff += 1
        print("         sealed = identified + band: %s (%d pixels differ)" % ("yes" if not diff else "NO", diff))
        if diff:
            fails.append(cl + ": sealed is not identified + band")
        # glow inside the shell: every glow pixel lands on a pixel of the identified body that is shell (ramp A or B)
        shell_idx = set(atlas["ramps"]["A"]["indices"]) | set(atlas["ramps"]["B"]["indices"])
        gx, gy = c["glowAt"]
        out_glow = sum(1 for y, r in enumerate(glow) for x, v in enumerate(r) if v != T and ident[gy + y][gx + x] not in shell_idx)
        o_idx = atlas["ramps"]["A"]["indices"][0]
        touch_outline = sum(1 for y, r in enumerate(glow) for x, v in enumerate(r) if v != T and ident[gy + y][gx + x] == o_idx)
        print("         glow inside the shell: %s (%d pixels outside, %d on the outline)" % ("yes" if not (out_glow or touch_outline) else "NO", out_glow, touch_outline))
        if out_glow or touch_outline:
            fails.append(cl + ": glow outside the shell")
        # glyph clear: its box, grown by one pixel, holds only slate in the identified body
        sid0 = next(iter(atlas["species"]))
        g = sprite("glyph.%s.%s" % (cl, sid0)); gwid = len(g[0]); gx, gy = c["glyphAt"]
        slate = atlas["ramps"]["fixed"]["s"]["index"]
        bad = [(x, y) for y in range(gy - 1, gy + gwid + 1) for x in range(gx - 1, gx + gwid + 1) if ident[y][x] != slate]
        print("         glyph %dx%d at (%d,%d): clear of stem, rim and neck: %s (%d non-slate pixels in its box + 1 px)" %
              (gwid, gwid, gx, gy, "yes" if not bad else "NO", len(bad)))
        if bad:
            fails.append(cl + ": glyph not clear on slate")
        cell = c["glyphCell"]
        for sid in atlas["species"]:
            g = sprite("glyph.%s.%s" % (cl, sid))
            for y in range(0, gwid, cell):
                for x in range(0, gwid, cell):
                    if len({g[y + j][x + i] for j in range(cell) for i in range(cell)}) != 1:
                        fails.append("%s %s: glyph not whole cells" % (cl, sid)); break
    # glyphs equal the frames'
    frames = {}
    for f in glob.glob(os.path.join(ROOT, "prototypes", "workbench", "frames", "species-S*.json")):
        d = json.load(open(f)); frames[d["species"]["id"]] = d
    drift = 0
    for sid, d in frames.items():
        g = sprite("glyph.large.%s" % sid); cell = atlas["classes"]["large"]["glyphCell"]
        for y, row in enumerate(d["glyph"]):
            for x, ch in enumerate(row):
                lit = g[y * cell][x * cell] != T
                if lit != (ch == "#"):
                    drift += 1
        sp = atlas["species"][sid]
        if (sp["sizeClass"], sp["slotA"], sp["slotB"]) != (d["pod"]["sizeClass"], d["pod"]["colourPair"][0]["pigment"], d["pod"]["colourPair"][1]["pigment"]):
            drift += 1
    print("frames: %d species checked, glyph or pod-parameter differences: %d" % (len(frames), drift))
    if drift or len(frames) != 16:
        fails.append("frames drift")
    print("RESULT: " + ("FAIL: " + "; ".join(fails) if fails else "ok, 0 off-palette pixels"))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
