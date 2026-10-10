"""Pass 95: the Pods room set, redone by the Station art director's method (verdict on ac57c715; the first version, passes 93, composed a squeezed dish onto a grey stage and is replaced). The model never has to hit rectangles: three Pro paintings, then composed here to the layout's rectangles
(main, station-layouts.md "Pods: collection, pod overview, chapter page"; positions only; stage coordinates are screen y minus 40):
  source/raw/pods-floor.jpg   the case floor in frame 2's materials and light: the sage-and-sand housing rim at the edges, WARM dark foam, hoses, a vent and a small gauge at the margins, no cut-outs (16:9, centre-cropped in height to 1024:522)
  source/raw/pods-nest.jpg    ONE fitted egg-shaped nest, empty, lying on its side, worn, with moss and a paper tag (16:9)
  source/raw/pods-plate.jpg   the small stamp plate set into the housing (painted), and a large flat warm slate panel
Composed: the nest (the egg, its dust, the moss and the tag, softly masked) scaled UNIFORMLY (never squeezed) so that its egg is 96 px tall at the overview and chapter (about 150x96) and centred on the dish rectangle's centre (overview (256, 336), chapter (216, 336)); the collection's six nests at the six place centres (176 + 336c, 120 + 240r) at 0.34 (an egg of about 212x136);
the overview's plain slate panel (stage (584, 80, 424, 432)) and the chapter's page panel (stage (424, 72, 584, 440)) are the painting's warm panel, scaled to those rectangles with its own rubber edge; the stamp plate (painted, the old blue chrome gone) at stage (856, 344, 152, 152). Cradle (224x96 at (144, 288)), its front lip (the lower arc of the nest's rim, RGBA) and the shelf (288x72 at (112, 328)) are cut from the composed overview.
Outputs: room-bench-stage (the floor), room-bench-stage-{overview,chapter,collection}, room-cradle, room-cradle-front, room-shelf, room-stamp-case-152x152, room-stamp-case-152x152-front (RGBA: the rim only, the opening transparent, no glass).
python3 -I tools/podsroom.py -> slices/room-*.png"""
import os, json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
def soft(size, shapes, blur):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    for kind, box in shapes: (d.ellipse if kind == "e" else d.rectangle)(box, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))
fl = Image.open("source/raw/pods-floor.jpg").convert("RGB"); W, H = fl.size; ch = round(W * 522 / 1024); y0 = (H - ch) // 2; floor = fl.crop((0, y0, W, y0 + ch)).resize((1024, 522), Image.LANCZOS)
nest = Image.open("source/raw/pods-nest.jpg").convert("RGB"); pl = Image.open("source/raw/pods-plate.jpg").convert("RGB")
# the nest object: the egg with its rim and dust, the moss and the tag, cut from x 300..1050, y 150..730 of the nest painting; its egg's centre (694, 385), the egg 625x400
NB = (300, 150, 1050, 730); EC = (694 - 300, 385 - 150); EGG_H = 400.0
nmask = soft((NB[2] - NB[0], NB[3] - NB[1]), [("e", (EC[0] - 335, EC[1] - 222, EC[0] + 335, EC[1] + 222)), ("e", (440 - 300 - 150, 500 - 150 - 112, 440 - 300 + 150, 500 - 150 + 112)), ("r", (600 - 300, 590 - 150, 800 - 300, 725 - 150))], 14)
nobj = nest.crop(NB)
bgm = np.asarray(nest).astype(float)[20:140, 1180:1360].reshape(-1, 3).mean(0); fm = np.asarray(floor).astype(float)[150:370, 300:700].reshape(-1, 3).mean(0)         # the nest painting's plain foam (its upper right) is matched to the floor's foam by a per-channel gain, so no lighter halo shows round the nest
nobj = Image.fromarray(np.clip(np.asarray(nobj).astype(float) * (fm / bgm), 0, 255).astype(np.uint8))
def put_nest(canvas, cx, cy, egg_h):
    s = egg_h / EGG_H; w, h = round(nobj.width * s), round(nobj.height * s); o = nobj.resize((w, h), Image.LANCZOS); m = nmask.resize((w, h), Image.LANCZOS)
    canvas.paste(o, (round(cx - EC[0] * s), round(cy - EC[1] * s)), m); return s
# panels and plate from the plate painting
panel = pl.crop((710, 69, 1328, 711)); plate = pl.crop((240, 278, 450, 490)).resize((152, 152), Image.LANCZOS)
def put_panel(canvas, rect):
    x, y, w, h = rect; p = panel.resize((w, h), Image.LANCZOS); m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=10, fill=255); canvas.paste(p, (x, y), m.filter(ImageFilter.GaussianBlur(0.8)))
def put_plate(canvas): m = Image.new("L", (152, 152), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 151, 151], radius=14, fill=255); canvas.paste(plate, (856, 344), m.filter(ImageFilter.GaussianBlur(0.8)))
ov = floor.copy(); put_panel(ov, (584, 80, 424, 432)); put_plate(ov); s_ov = put_nest(ov, 256, 336, 96)
ch_ = floor.copy(); put_panel(ch_, (424, 72, 584, 440)); put_nest(ch_, 216, 336, 96)
col = floor.copy()
for c in range(3):
    for r in range(2): put_nest(col, 176 + 336 * c, 120 + 240 * r, 0.34 * EGG_H)
out = {"room-bench-stage": floor, "room-bench-stage-overview": ov, "room-bench-stage-chapter": ch_, "room-bench-stage-collection": col}
cradle = ov.crop((144, 288, 368, 384)); shelf = ov.crop((112, 328, 400, 400)); stamp = ov.crop((856, 344, 1008, 496))
# the front lip: the lower arc of the egg's rim in the cradle (the egg is centred at (112, 48) in the cradle, 96 tall and about 150 wide)
s = s_ov; ew, eh = 625 * s, 400 * s; ring = Image.new("L", (224, 96), 0); dr = ImageDraw.Draw(ring)
dr.ellipse([112 - ew / 2 - 6, 48 - eh / 2 - 4, 112 + ew / 2 + 6, 48 + eh / 2 + 6], fill=255); dr.ellipse([112 - ew / 2 + 10, 48 - eh / 2 + 8, 112 + ew / 2 - 10, 48 + eh / 2 - 6], fill=0)
low = np.clip((np.mgrid[0:96, 0:224][0] - 60) / 12.0, 0, 1); alpha = (np.asarray(ring.filter(ImageFilter.GaussianBlur(1.5))).astype(float) * low).astype(np.uint8)
front = cradle.convert("RGBA"); front.putalpha(Image.fromarray(alpha, "L"))
sm = Image.new("L", (152, 152), 0); dm = ImageDraw.Draw(sm); dm.rounded_rectangle([0, 0, 151, 151], radius=14, fill=255); dm.rounded_rectangle([24, 24, 127, 127], radius=6, fill=0)
sfront = stamp.convert("RGBA"); sfront.putalpha(sm.filter(ImageFilter.GaussianBlur(0.8)))
files = {"room-cradle": cradle, "room-cradle-front": front, "room-shelf": shelf, "room-stamp-case-152x152": stamp, "room-stamp-case-152x152-front": sfront}; files.update(out)
man = json.load(open("slices/manifest.json"))
WHAT = {"room-bench-stage": "the case's floor, the stage under everything: the housing rim at the edges, warm dark foam, hoses, a vent and a small gauge at the margins, no cut-outs; a Pro painting (pods-floor.jpg), 1024x522", "room-bench-stage-overview": "the overview stage: the floor with ONE fitted egg-shaped nest (about 150x96, uniformly scaled) on the pod axis x 256, the stamp plate at (856, 344) and a plain warm slate panel at the right; composed from three Pro paintings",
        "room-bench-stage-chapter": "the chapter stage: the floor with the nest on the axis x 216 and a warm matte slate page panel to the right (424, 72, 584, 440); composed", "room-bench-stage-collection": "the collection stage: the floor with six nests at the six places' centres; composed", "room-cradle": "the pod's fitted nest (224x96), cut from the composed overview at (144, 288)",
        "room-cradle-front": "the nest's near rim as a separate layer (RGBA 224x96): the lower arc of the egg's rim, cut from the cradle", "room-shelf": "the case floor under the cradle (288x72), cut from the composed overview at (112, 328)", "room-stamp-case-152x152": "the small dim unlit matte stamp plate set into the housing, painted (pods-plate.jpg), cut at (856, 344)", "room-stamp-case-152x152-front": "the plate's rim only (RGBA 152x152, the opening transparent, no glass)"}
SRC = "source/raw/pods-floor.jpg, pods-nest.jpg, pods-plate.jpg (gemini-3-pro-image), composed in tools/podsroom.py"
for n, im in files.items():
    im.save(f"slices/{n}.png", optimize=True)
    man[n] = {"size": list(im.size), "rect": man.get(n, {}).get("rect"), "src": SRC, "made": "the Pods room set, the redo (pass 95): " + WHAT[n] + "; the pods are placed by the renderer, never painted in", "sha256": hashlib.sha256(open(f"slices/{n}.png", "rb").read()).hexdigest()}
json.dump(man, open("slices/manifest.json", "w"), indent=1)
a = np.asarray(floor).astype(float); print("floor mean RGB", a.reshape(-1, 3).mean(0).round(0), "foam centre RGB", a[150:370, 300:700].reshape(-1, 3).mean(0).round(0))
