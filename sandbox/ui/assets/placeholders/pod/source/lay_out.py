"""Lays out the first pass of the pod drawings as text, once. Not part of the build.

    python3 -I source/lay_out.py

Writes source/pod-large.txt, pod-medium.txt, pod-small.txt and pod-well.txt, and prints the anchors that source/layout.json holds (band, glow, glyph, cap). After
that the .txt files are the drawings: edit them by hand and rebuild with ../build.py. Run this again only to start over
(it overwrites the hand edits).

The forms are plain: a stem, a rounded cap, a neck, and a firm ovoid shell (a squared ellipse, so it has a foot to
stand on) lit from the top left in three bands, with a second-colour foot ring.
Characters: see the legend in build.py.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
# name: W, H, stem w,h, cap w,h, cap radius, neck rows, shell top width, foot ring rows, glyph cell
CLASSES = {
    "large":  dict(W=160, H=192, sw=14, sh=16, cw=64, ch=44, cr=9, bh=7, top=78, rim=14, cell=6),
    "medium": dict(W=136, H=168, sw=12, sh=14, cw=54, ch=38, cr=8, bh=6, top=68, rim=12, cell=5),
    "small":  dict(W=112, H=144, sw=10, sh=12, cw=44, ch=32, cr=7, bh=5, top=58, rim=10, cell=4),
    "well":   dict(W=32,  H=40,  sw=4,  sh=4,  cw=18, ch=16, cr=3, bh=3, top=20, rim=4,  cell=2),
}
N = 2.4          # the shell's squareness: 2 is an ellipse; a little more gives it a foot and shoulders


def inside_se(x, y, cx, cy, rx, ry):
    return (abs((x + 0.5 - cx) / rx) ** N + abs((y + 0.5 - cy) / ry) ** N) <= 1.0


def build(name, p):
    W, H = p["W"], p["H"]
    g = [["."] * W for _ in range(H)]
    cx = W / 2

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = c

    # the stem
    sx0 = (W - p["sw"]) // 2
    for y in range(p["sh"]):
        for x in range(p["sw"]):
            edge = y == 0 or x == 0 or x == p["sw"] - 1
            put(sx0 + x, y, "n" if edge else ("s" if x >= p["sw"] - 3 else "t"))
    # the cap: rounded rectangle, 1 px outline, a lit rim on its top and left
    cx0, cy0, cw, ch, r = (W - p["cw"]) // 2, p["sh"], p["cw"], p["ch"], p["cr"]

    def in_cap(x, y):
        if not (0 <= x < cw and 0 <= y < ch):
            return False
        qx = min(x, cw - 1 - x); qy = min(y, ch - 1 - y)
        if qx >= r or qy >= r:
            return True
        return (r - 0.5 - qx) ** 2 + (r - 0.5 - qy) ** 2 <= r * r
    for y in range(ch):
        for x in range(cw):
            if not in_cap(x, y):
                continue
            if not (in_cap(x - 1, y) and in_cap(x + 1, y) and in_cap(x, y - 1) and in_cap(x, y + 1)):
                put(cx0 + x, cy0 + y, "n")
            else:
                # the lit rim: an inner pixel whose left or upper neighbour is an edge pixel
                def edge(a_, b_):
                    return in_cap(a_, b_) and not all(in_cap(a_ + dx, b_ + dy) for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)))
                put(cx0 + x, cy0 + y, "t" if (edge(x - 1, y) or edge(x, y - 1)) else "s")
    # the neck, between the cap and the shell
    by0 = p["sh"] + p["ch"]
    nw = p["cw"] - (14 if p["cw"] > 30 else 8)
    nx0 = (W - nw) // 2
    for y in range(by0, by0 + p["bh"]):
        for x in range(nw):
            put(nx0 + x, y, "n" if x in (0, nw - 1) else ("t" if x == 1 else "s"))
    # the shell
    y_s = by0 + p["bh"]; Hs = H - y_s
    rx = W / 2; lo, hi = Hs / 2, Hs * 1.2
    for _ in range(60):                      # ry so that the shell is p["top"] wide on its top row
        ry = (lo + hi) / 2; yc = H - ry
        d = yc - (y_s + 0.5)
        w = rx * (1 - (abs(d) / ry) ** N) ** (1 / N) * 2 if abs(d) < ry else 0
        if w > p["top"]:
            hi = ry
        else:
            lo = ry
    ry = (lo + hi) / 2; yc = H - ry
    a, b = max(2, round(0.10 * rx)), max(2, round(0.07 * ry))
    a2, b2 = max(2, round(0.13 * rx)), max(2, round(0.10 * ry))

    def in_shell(x, y, dx=0, dy=0):
        return y >= y_s and inside_se(x - dx, y - dy, cx, yc, rx, ry) or (y >= y_s and False)
    def shell_at(x, y):
        return 0 <= x < W and y_s <= y < H and inside_se(x, y, cx, yc, rx, ry)
    def lit_shift(x, y):
        return inside_se(x - a, y - b, cx, yc, rx, ry)
    def dark_shift(x, y):
        return inside_se(x + a2, y + b2, cx, yc, rx, ry)
    ring = {"D": "d", "B": "b", "L": "l", "H": "l"}
    for y in range(y_s, H):
        for x in range(W):
            if not shell_at(x, y):
                continue
            edge = not (shell_at(x - 1, y) and shell_at(x + 1, y) and shell_at(x, y - 1) and shell_at(x, y + 1))
            if edge:
                c = "O"
            else:
                s = (x + 0.5 - cx) / rx + (y + 0.5 - yc) / ry
                if s < -0.1 and not lit_shift(x, y):
                    c = "L"
                elif s >= -0.1 and not dark_shift(x, y):
                    c = "D"
                else:
                    c = "B"
                if y <= y_s + 2:
                    c = "D" if c != "O" else c
                hx, hy = cx - 0.46 * rx, yc - 0.32 * ry
                if c in "BL" and ((x + 0.5 - hx) / (0.12 * rx)) ** 2 + ((y + 0.5 - hy) / (0.07 * ry)) ** 2 <= 1:
                    c = "H"
                if y >= H - p["rim"]:
                    c = "l" if y == H - p["rim"] and c in "BLH" else ring.get(c, c)
            g[y][x] = c
    return g, dict(y_s=y_s, by0=by0, nw=nw, yc=yc, ry=ry, cap=(cx0, cy0, cw, ch))


def band(p, W):
    bw = p["cw"] + 4
    rows = []
    for y in range(p["bh"]):
        row = ["k"] * bw
        if y == 0 or y == p["bh"] - 1:
            row[0] = row[-1] = "."
        rows.append("".join(row))
    return rows


def glow(p, geo):
    gw = int(round(p["W"] * 0.60)); gh = int(round(gw * 0.54))
    gw -= gw % 2; gh -= gh % 2
    rows = [["."] * gw for _ in range(gh)]
    for k, (f, c) in enumerate(((1.0, "L"), (0.64, "H"), (0.32, "G"))):
        ew, eh = max(2, int(gw * f) // 2 * 2), max(2, int(gh * f) // 2 * 2)
        for y in range(gh):
            for x in range(gw):
                if ((x + 0.5 - gw / 2) / (ew / 2)) ** 2 + ((y + 0.5 - gh / 2) / (eh / 2)) ** 2 <= 1:
                    rows[y][x] = c
    return ["".join(r) for r in rows]


def main():
    layout = {}
    for name, p in CLASSES.items():
        g, geo = build(name, p)
        body = ["".join(r) for r in g]
        b = band(p, p["W"])
        gl = glow(p, geo)
        gwid, ghei = len(gl[0]), len(gl)
        bx = (p["W"] - len(b[0])) // 2
        shell_h = p["H"] - geo["y_s"]
        gx = (p["W"] - gwid) // 2
        gy = round(geo["y_s"] + 0.55 * shell_h - ghei / 2)
        cx0, cy0, cw, ch = geo["cap"]
        gl_w = 5 * p["cell"]
        layout[name] = dict(w=p["W"], h=p["H"], cell=p["cell"], band=[bx, geo["by0"]], glow=[gx, gy],
                            glyph=[cx0 + (cw - gl_w) // 2, cy0 + (ch - gl_w) // 2 + (1 if name != "well" else 0)],
                            cap=[cx0, cy0, cw, ch])
        with open(os.path.join(HERE, "pod-%s.txt" % name), "w") as f:
            f.write("; pod-%s.txt: the %dx%d pod, hand-editable. One block per piece: 'piece <name> <w> <h>' then h rows of w characters.\n" % (name, p["W"], p["H"]))
            f.write("; '.' empty. Shell ramp A: O outline, D shade, B base, L light, H highlight, G glow core. Ramp B (foot ring): o d b l h g.\n")
            f.write("; Fixed: n night, s slate, t stone, k ink, c cream. See build.py for the colours.\n")
            for nm, rows in (("body", body), ("band", b), ("glow", gl)):
                f.write("piece %s %d %d\n" % (nm, len(rows[0]), len(rows)))
                f.write("\n".join(rows) + "\n")
    return layout


if __name__ == "__main__":
    print("anchors for layout.json (band, glow, glyph, cap):")
    for k, v in main().items():
        print(" ", k, {x: v[x] for x in ("band", "glow", "glyph", "cap")})
