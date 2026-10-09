"""Clean-up of the Retro Diffusion 24 px pictograms on the Station's 62 colours, in the emblem manner: each picture reduced to its silhouette (alpha >= 128), stray
specks (islands under 3 px) dropped, pinholes filled, then written as typed rows ('#' base, '+' lit edge where the pixel above or to the left is empty, '.' empty), which are
the files the pass edits by hand afterwards (clean/<name>.txt). RD's own colours (teal, yellow fringes) are not kept: the emblem manner is two colours per state.
usage: python3 -I clean.py  (writes clean/<name>.txt only where it does not exist, so hand edits are never overwritten; --force rewrites)"""
import os, sys
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); N = 24
def rows_of(name):
    a = Image.open(os.path.join(HERE, "rd", name + "-rd.png")).convert("RGBA"); m = [[a.getpixel((x, y))[3] >= 128 for x in range(N)] for y in range(N)]
    seen = set(); comps = []
    for y in range(N):
        for x in range(N):
            if m[y][x] and (x, y) not in seen:
                st = [(x, y)]; seen.add((x, y)); c = []
                while st:
                    px, py = st.pop(); c.append((px, py))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        qx, qy = px + dx, py + dy
                        if 0 <= qx < N and 0 <= qy < N and m[qy][qx] and (qx, qy) not in seen: seen.add((qx, qy)); st.append((qx, qy))
                comps.append(c)
    for c in comps:
        if len(c) < 3:
            for x, y in c: m[y][x] = False
    for y in range(1, N - 1):
        for x in range(1, N - 1):
            if not m[y][x] and sum(m[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 3: m[y][x] = True
    return ["".join(("+" if (y == 0 or not m[y - 1][x] or x == 0 or not m[y][x - 1]) else "#") if m[y][x] else "." for x in range(N)) for y in range(N)]
if __name__ == "__main__":
    for n in ([a for a in sys.argv[1:] if not a.startswith("--")] or [f"{k}-{c}" for k in ("tail", "leg") for c in "abcd"]):
        p = os.path.join(HERE, "clean", n + ".txt")
        if os.path.exists(p) and "--force" not in sys.argv: continue
        open(p, "w").write(f"; legs-tail pictogram {n}: Gemini 96 px pictogram (in96/{n}-96.png) pixelated to 24 by Retro Diffusion (rd/{n}-rd.png), reduced to its silhouette on the 24 grid; # base, + lit edge (above or left empty), . empty. Hand edits follow.\n" + "\n".join(rows_of(n)) + "\n")
