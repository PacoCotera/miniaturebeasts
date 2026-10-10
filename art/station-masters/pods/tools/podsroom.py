"""Pass 93: the Pods room set (Station art director's brief, Oct 10; direction: the signed concept board frame 2, the device's sample case, in Home's light): the stage under everything and its states, cut and composed from the Pro paintings of the run
source/work/pods-room-base.json, pods-room-states.json and pods-room-states-r2.json (gemini-3-pro-image, 21:9). The paintings put the dish, the ledge and the panels where the model chose, not where the layout rectangles are, so the stage is COMPOSED: each 1584x672 painting is centre-cropped to 1024:522 and reduced with Lanczos to 1024x522 (stage coordinates: screen y minus 40), and then
 - the left foam of the base painting (its tall oval cut-out removed by a feathered mirror of the foam beside it) is the background,
 - the dish (a pod's fitted cut-out) and the ledge (the case's rim under it) are taken from the overview or chapter painting and set, scaled to the layout's rectangles, where the layout puts them: overview dish (144, 288, 224, 96) and ledge (112, 328, 288, 72) in stage coordinates, chapter dish (104, 288, 224, 96) and ledge (72, 328, 288, 72) (main, station-layouts.md "Pods: collection, pod overview, chapter page"),
 - the right-hand panel is the painting's own (overview: the plain slate panel; chapter: the flat page panel), joined to the foam by a feathered seam,
 - the stamp case plate (stage (856, 344, 152, 152)) is drawn by hand in code: a dim, unlit, matte plate set into the panel.
Nothing is painted into a cut-out: the pods are placed by the renderer. Compare is skipped (it is not on main). Outputs (opaque RGB 1x unless noted): room-bench-stage (the base floor), room-bench-stage-{overview,chapter,collection}, room-cradle (the overview's dish, 224x96), room-cradle-front (RGBA: its near lip), room-shelf (288x72), room-stamp-case-152x152 and -front (RGBA: the rim only, no glass).
python3 -I tools/podsroom.py -> slices/room-*.png, marks/pods-room-sheet-1x.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
pal = {n: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for n, h in json.load(open("../../../prototypes/ui/palettes/station.json"))["colours"]}
def crop(n):
    im = Image.open(f"source/raw/{n}.jpg").convert("RGB"); W, H = im.size; cw = round(H * 1024 / 522); x0 = (W - cw) // 2
    return im.crop((x0, 0, x0 + cw, H)).resize((1024, 522), Image.LANCZOS)
def soft(box, size, feather, shape="rect"):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    (d.ellipse if shape == "ellipse" else d.rectangle)(box, fill=255); return m.filter(ImageFilter.GaussianBlur(feather))
def paste(dst, src, mask, at): dst.paste(src, at, mask)
base, ovr, chp, col = crop("room-stage-base"), crop("room-stage-overview-r2"), crop("room-stage-chapter-r2"), crop("room-stage-collection")
# background: the base floor with its tall oval (x 0..205, y 100..410) refilled: the smooth lighting from the surrounding foam (normalised blur of the floor with the oval left out, sigma 40) plus the fine foam detail (the high-pass of a clean foam patch, x 410..560, y 150..400, tiled with flips)
bg = base.copy(); ba = np.asarray(base).astype(float); known = np.ones((522, 1024)); known[88:422, 0:222] = 0; known[:, 722:] = 0
def nblur(a, sig):
    k = np.asarray(Image.fromarray((known * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sig))).astype(float) / 255
    ch = [np.asarray(Image.fromarray(np.clip(a[..., c] * known, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sig))).astype(float) for c in range(3)]
    return np.stack(ch, -1) / np.maximum(k[..., None], 1e-3), k
def multi(a):                                                                     # the finest blur that has enough known foam under it at each pixel, then coarser ones where the hole is wide
    out, k0 = nblur(a, 30); res = out.copy(); w = np.clip(k0 / 0.35, 0, 1)[..., None]; res = out * w
    for sg in (60, 120, 240):
        o, k = nblur(a, sg); ww = np.clip(k / 0.35, 0, 1)[..., None] * (1 - w); res = res + o * ww; w = w + ww
    return res / np.maximum(w, 1e-3)
low = multi(ba); clean = ba[150:400, 410:560]; cl = np.stack([np.asarray(Image.fromarray(np.clip(clean[..., c], 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(25))).astype(float) for c in range(3)], -1); hp = clean - cl
tile = np.zeros((522, 1024, 3))
for ty in range(0, 522, 250):
    for tx in range(0, 1024, 150):
        t = hp[::(-1 if (ty // 250) % 2 else 1), ::(-1 if (tx // 150) % 2 else 1)]; h_, w_ = min(250, 522 - ty), min(150, 1024 - tx); tile[ty:ty + h_, tx:tx + w_] = t[:h_, :w_]
fill = np.clip(low + tile, 0, 255); mm = Image.new("L", (1024, 522), 0); ImageDraw.Draw(mm).rectangle([0, 96, 214, 414], fill=255); mm = np.asarray(mm.filter(ImageFilter.GaussianBlur(10))).astype(float)[..., None] / 255
bg = Image.fromarray(np.clip(ba * (1 - mm) + fill * mm, 0, 255).astype(np.uint8))
def foam_to_x(left, right, cut, feather=14):                      # `left`'s picture up to x = cut, `right`'s from there, joined by a feathered vertical seam
    m = Image.new("L", (1024, 522), 0); ImageDraw.Draw(m).rectangle([cut, 0, 1023, 521], fill=255); return Image.composite(right, left, m.filter(ImageFilter.GaussianBlur(feather)))
def with_dish_and_ledge(canvas, src, dish_src, ledge_src, dish_dst, ledge_dst):
    out = canvas.copy()
    lw, lh = ledge_dst[2], ledge_dst[3]; lp = src.crop(ledge_src).resize((lw, lh), Image.LANCZOS); lmask = soft((6, 6, lw - 7, lh - 7), (lw, lh), 5); out.paste(lp, (ledge_dst[0], ledge_dst[1]), lmask)
    dw, dh = dish_dst[2], dish_dst[3]; dp = src.crop(dish_src).resize((dw, dh), Image.LANCZOS); dmask = soft((3, 3, dw - 4, dh - 4), (dw, dh), 3, "ellipse"); out.paste(dp, (dish_dst[0], dish_dst[1]), dmask)
    return out
DISH_SRC = (68, 95, 540, 365); LEDGE_SRC = (8, 300, 598, 462)           # the painting's dish (outer rim) and ledge (the handle-shaped rim), measured on the 1024x522 crop
# the stamp case plate, by hand: a dim, unlit, matte plate set into the housing
def plate_assets():
    W = 152; rim = Image.new("RGBA", (W, W), (0, 0, 0, 0)); d = ImageDraw.Draw(rim); c = lambda n, a=255: pal[n] + (a,)
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=10, fill=c("bevel")); d.rounded_rectangle([2, 2, W - 3, W - 3], radius=9, fill=c("hairline")); d.rounded_rectangle([8, 8, W - 9, W - 9], radius=6, fill=c("bar"))
    d.line([(10, 2), (W - 12, 2)], fill=c("enamel")); d.line([(2, 10), (2, W - 12)], fill=c("enamel"))                        # a lit lip along the top and left
    for x, y in ((14, 14), (W - 15, 14), (14, W - 15), (W - 15, W - 15)): d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=c("metal")); d.ellipse([x - 3, y - 3, x + 1, y + 1], fill=c("enamel")); d.line([(x - 2, y + 1), (x + 2, y - 1)], fill=c("hairline"))
    inner = Image.new("RGBA", (W, W), (0, 0, 0, 0)); di = ImageDraw.Draw(inner); di.rounded_rectangle([22, 22, W - 23, W - 23], radius=4, fill=c("panel")); di.line([(23, 23), (W - 24, 23)], fill=c("void")); di.line([(23, 23), (23, W - 24)], fill=c("void"))
    full = Image.alpha_composite(rim, inner)
    front = Image.new("RGBA", (W, W), (0, 0, 0, 0)); front.paste(full.crop((0, 0, W, W)), (0, 0)); a = np.asarray(front).copy(); a[22:W - 22, 22:W - 22, 3] = 0; front = Image.fromarray(a, "RGBA")     # the rim only: nothing across the opening
    return full, front
plate, plate_front = plate_assets()
# overview
ov = foam_to_x(bg, ovr, 722)
ov = with_dish_and_ledge(ov, ovr, DISH_SRC, LEDGE_SRC, (144, 288, 224, 96), (112, 328, 288, 72))
ov.paste(ov.crop((960, 150, 1024, 290)), (960, 326))                 # the painting's own small plate shows a sliver at the right edge: plain panel is copied over it
ov_rgba = ov.convert("RGBA"); ov_rgba.alpha_composite(plate, (856, 344)); ov = ov_rgba.convert("RGB")
# chapter
ch = foam_to_x(bg, chp, 425, 12)
ch = with_dish_and_ledge(ch, ovr, DISH_SRC, LEDGE_SRC, (104, 288, 224, 96), (72, 328, 288, 72))      # the chapter's own painting has its dish cut off by the crop, so the overview's dish and ledge are set here too
out = {"room-bench-stage": base, "room-bench-stage-overview": ov, "room-bench-stage-chapter": ch, "room-bench-stage-collection": col}
cradle = ov.crop((144, 288, 368, 384)); shelf = ov.crop((112, 328, 400, 400))
front = cradle.convert("RGBA"); a = np.asarray(front).copy(); yy, xx = np.mgrid[0:96, 0:224]
ramp = np.clip((yy - 66) / 14.0, 0, 1) * np.clip(np.minimum(xx, 223 - xx) / 18.0, 0, 1); a[..., 3] = (ramp * 255).astype(np.uint8); front = Image.fromarray(a, "RGBA")
stamp = ov.crop((856, 344, 1008, 496))
files = {"room-cradle": cradle, "room-cradle-front": front, "room-shelf": shelf, "room-stamp-case-152x152": stamp, "room-stamp-case-152x152-front": plate_front}
files.update(out)
man = json.load(open("slices/manifest.json"))
SRC = {"room-bench-stage": "source/raw/room-stage-base.jpg", "room-bench-stage-overview": "source/raw/room-stage-overview-r2.jpg + room-stage-base.jpg", "room-bench-stage-chapter": "source/raw/room-stage-chapter-r2.jpg + room-stage-base.jpg", "room-bench-stage-collection": "source/raw/room-stage-collection.jpg"}
for n, im in files.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": man.get(n, {}).get("rect"), "src": SRC.get(n, "composed in tools/podsroom.py from the overview stage"), "made": "the Pods room set (pass 93): " + {
        "room-bench-stage": "the case's floor, the stage under everything: dark matte foam, canvas edge strips, hoses, a tall empty cut-out at the left and a slate panel with small empty cut-outs at the right; a Pro painting, 1024x522, no pods",
        "room-bench-stage-overview": "the overview stage: one fitted dish (224x96 at stage (144, 288)) and its ledge (288x72 at (112, 328)) at the axis x 256, a plain worn slate panel at the right with the dim stamp plate at (856, 344); composed from Pro paintings (the dish and ledge set where the layout puts them)",
        "room-bench-stage-chapter": "the chapter stage: the dish (224x96 at stage (104, 288)) and its ledge (288x72 at (72, 328)) at the axis x 216, a flat matte page panel to the right; composed from Pro paintings",
        "room-bench-stage-collection": "the collection stage: a 3 x 2 grid of large fitted cut-outs in dark foam; a Pro painting, not recomposed (its grid is only roughly under the places' rectangles)",
        "room-cradle": "the pod's fitted cut-out (224x96), cut from the overview stage at (144, 288)", "room-cradle-front": "the cut-out's near lip as a separate layer (RGBA, 224x96): the bottom rows of the cradle, faded in over 14 rows and at both ends",
        "room-shelf": "the case's rim under the cradle (288x72), cut from the overview stage at (112, 328)", "room-stamp-case-152x152": "the small dim unlit matte plate set into the housing where the stamp label sits, drawn by hand in code, cut from the overview stage at (856, 344)",
        "room-stamp-case-152x152-front": "the plate's rim only (RGBA 152x152, the opening transparent, no glass)"}[n] + "; the pods are placed by the renderer, never painted in",
        "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
