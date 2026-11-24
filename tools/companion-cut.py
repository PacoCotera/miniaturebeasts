"""The Companion's pictures, cut from signed masters (no paint, no model call; 0 MXN).
The screen is 8-bit indexed with no alpha and no anti-aliasing, so a mibi on it is a cut of her signed master:
  228 x 234: the signed 304 x 312 stand at x0.75, body alpha hard (0 or 255), the painted contact shadow dropped (the page draws its own dither),
             colours cut to one small palette (median cut, nearest entry, no dither).
  96 x 88:   the signed 96 x 88 sprite, no resize, the same hard edge and palette cut (the shipped sprite has soft edges and thousands of colours).
usage:
  python3 -I tools/companion-cut.py one MASTER.png OUT.png [colours=64]
  python3 -I tools/companion-cut.py all REPO_ROOT [colours=64]     every stand master (each kind, grown and young, every coat and marking) -> prototypes/ui/assets/masters/cuts/
  python3 -I tools/companion-cut.py check REPO_ROOT                 every cut: size, colours, alpha values (the count the art desk signs from)"""
import os, re, sys, json
import numpy as np
from PIL import Image

COATS_DIR = "prototypes/ui/assets/masters/cuts"
MASTERS = "prototypes/ui/assets/masters/pods"
# a stand master: the kind's stand, in its coat and marking (not a pose)
STAND = re.compile(r"^mibi-(adult|juvenile)-(S\d\d)(-(?:[a-z]+)-(?:dark|between|light))?(-lay-(?:spots|saddle|gradient|bands|patches))?-304x312\.png$")


def cut(src, N=64):
    """returns (RGBA uint8 array, colours, box) for a 304x312 or 96x88 master"""
    im = Image.open(src).convert("RGBA")
    assert im.size in ((304, 312), (96, 88)), im.size
    a = np.asarray(im).astype(np.float64) / 255.0
    if im.size == (96, 88):
        W, H = 96, 88
        keep = a[..., 3] >= 0.75                   # its body is 255 with a soft rim; its contact shadow is 110 at most
        rgb = a[..., :3]
    else:
        body = a[..., 3] >= 0.99                   # the master's body is alpha 255; its contact shadow is 110 or 70
        pre = np.dstack([a[..., :3] * body[..., None], body.astype(np.float64)])   # premultiplied, body only
        W, H = 228, 234
        small = np.asarray(Image.fromarray((pre * 255).round().astype(np.uint8), "RGBA").resize((W, H), Image.LANCZOS)).astype(np.float64) / 255.0
        al = small[..., 3]
        keep = al >= 0.5
        rgb = np.where(keep[..., None], small[..., :3] / np.maximum(al[..., None], 1e-6), 0).clip(0, 1)
    rgb8 = (rgb * 255).round().astype(np.uint8)
    px = rgb8[keep]
    q = Image.fromarray(px.reshape(1, -1, 3), "RGB").quantize(colors=N, method=Image.MEDIANCUT, dither=Image.NONE)
    pal = np.asarray(q.getpalette()[: N * 3], dtype=np.int32).reshape(-1, 3)
    pal = pal[np.unique(np.asarray(q))]
    d = ((px[:, None, :].astype(np.int32) - pal[None, :, :]) ** 2).sum(2)
    snapped = pal[d.argmin(1)].astype(np.uint8)
    o = np.zeros((H, W, 4), np.uint8)
    o[keep, :3] = snapped
    o[keep, 3] = 255
    ys = np.where(keep.any(1))[0]; xs = np.where(keep.any(0))[0]
    return o, len(np.unique(snapped.reshape(-1, 3), axis=0)), (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max()))


def save(o, out):
    Image.fromarray(o, "RGBA").save(out, optimize=True)


def cut_name(master):
    """mibi-adult-S01-redder-dark-lay-saddle-304x312.png -> cut-adult-S01-redder-dark-lay-saddle-228x234.png"""
    return "cut-" + master[len("mibi-"):].replace("-304x312.png", "-228x234.png")


def sprite_name(master):
    """the signed 96 x 88 sprite of the same stand, and its cut's name"""
    s = master.replace("-304x312.png", "-96x88.png")
    return s, "cut-" + s[len("mibi-"):]


def cmd_all(root, N):
    src = os.path.join(root, MASTERS); dst = os.path.join(root, COATS_DIR); os.makedirs(dst, exist_ok=True)
    masters = sorted(f for f in os.listdir(src) if STAND.match(f))
    made = []; missing = []
    for f in masters:
        o, n, _ = cut(os.path.join(src, f), N); save(o, os.path.join(dst, cut_name(f))); made.append(cut_name(f))
        s, sn = sprite_name(f)
        if not os.path.exists(os.path.join(src, s)): missing.append(s); continue
        o, n, _ = cut(os.path.join(src, s), N); save(o, os.path.join(dst, sn)); made.append(sn)
    print("stand masters", len(masters), "cuts", len(made), "96 sprites missing", len(missing))
    for m in missing[:20]: print("  no 96 sprite:", m)
    with open(os.path.join(dst, "index.json"), "w") as fh:
        json.dump(sorted(made), fh, indent=0)


def cmd_check(root):
    dst = os.path.join(root, COATS_DIR); n = 0; bad = 0; total = 0; by = {}
    for f in sorted(os.listdir(dst)):
        if not f.endswith(".png"): continue
        im = Image.open(os.path.join(dst, f)).convert("RGBA"); a = np.asarray(im); n += 1; total += os.path.getsize(os.path.join(dst, f))
        size = im.size; al = set(np.unique(a[..., 3]).tolist()); cols = len(np.unique(a[a[..., 3] == 255][:, :3], axis=0))
        ok = size in ((228, 234), (96, 88)) and al <= {0, 255} and cols <= 64
        by[size] = by.get(size, 0) + 1
        if not ok: bad += 1; print("BAD", f, size, sorted(al), cols)
    print("cuts", n, "by size", {f"{k[0]}x{k[1]}": v for k, v in by.items()}, "bad", bad, "bytes", total)
    return bad


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "one":
        o, n, box = cut(sys.argv[2], int(sys.argv[4]) if len(sys.argv) > 4 else 64); save(o, sys.argv[3]); print(sys.argv[3], "colours", n, "box", box)
    elif c == "all":
        cmd_all(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 64)
    elif c == "check":
        sys.exit(1 if cmd_check(sys.argv[2]) else 0)
