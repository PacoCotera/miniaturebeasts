"""Measure every trial output: size, unique colours, off-palette pixels, and write a quantised
copy (nearest colour in the 48-colour Companion palette, no dither) for comparison.
Writes measurements.json and prints a markdown table."""
import glob, json, os, sys
from PIL import Image

T = sys.argv[1]
pal = json.load(open(os.path.join(T, "companion-palette-48.json")))
PAL = [tuple(c["rgb"]) for c in pal]
PALSET = set(PAL)
palimg = Image.new("P", (1, 1))
flat = sum(([r, g, b] for r, g, b in PAL), [])
palimg.putpalette(flat + [0, 0, 0] * (256 - len(PAL)))


def quantise(im):
    rgb = im.convert("RGB").quantize(palette=palimg, dither=Image.Dither.NONE).convert("RGB")
    if im.mode == "RGBA":
        rgb.putalpha(im.getchannel("A"))
    return rgb


rows = []
for f in sorted(glob.glob(os.path.join(T, "*", "*.png"))):
    name = os.path.basename(f)
    if name.endswith("-quantised.png") or "/refs/" in f:
        continue
    im = Image.open(f)
    mode = im.mode
    im = im.convert("RGBA")
    px = list(im.get_flattened_data()) if hasattr(im, "get_flattened_data") else list(im.getdata())
    opaque = [p[:3] for p in px if p[3] > 0]
    uniq = set(opaque)
    off = sum(1 for p in opaque if p not in PALSET)
    def maxdiff(p):
        q = min(PAL, key=lambda c: sum((a - b) ** 2 for a, b in zip(p, c)))
        return max(abs(a - b) for a, b in zip(p, q))
    worst = max((maxdiff(p) for p in set(opaque) - PALSET), default=0)
    real_off = worst > 1
    q = quantise(Image.open(f))
    qpx = list(q.convert("RGBA").get_flattened_data()) if hasattr(q, "get_flattened_data") else list(q.convert("RGBA").getdata())
    quniq = set(p[:3] for p in qpx if p[3] > 0)
    qname = f.replace(".png", "-quantised.png")
    # Only keep a quantised copy where the original was not already on-palette.
    if real_off:
        q.save(qname)
    rows.append({"file": os.path.relpath(f, T), "size": list(im.size), "mode": mode,
                 "opaque_px": len(opaque), "unique_colours": len(uniq),
                 "off_palette_px": off, "off_palette_pct": round(100 * off / max(1, len(opaque)), 1),
                 "max_channel_distance": worst,
                 "unique_after_quantise": len(quniq),
                 "quantised": os.path.relpath(qname, T) if real_off else None})
json.dump(rows, open(os.path.join(T, "measurements.json"), "w"), indent=1)
print("| File | Size | Unique colours | Off-palette px | Max distance | Unique after quantise |")
print("| --- | --- | --- | --- | --- | --- |")
for r in rows:
    print(f"| `{r['file']}` | {r['size'][0]}×{r['size'][1]} | {r['unique_colours']} | {r['off_palette_px']} / {r['opaque_px']} ({r['off_palette_pct']}%) | {r['max_channel_distance']} | {r['unique_after_quantise']} |")
