#!/usr/bin/env python3
# The collection v2 art job on the four rooms (the collection v2 design, the Builder checklist's art job items 1 to 4; the collection v2 art direction): code and hand work on the
# signed room masters, no new painting call. It reads the rooms folder of masters-pods at the commit the Station places (rooms.json source.commit) and writes a
# copy of it with the changes, for prototypes/ui/tools/place-masters.mjs --rooms to place:
#   1. rooms-manifest.json: each room's window (`view`: crop, keep, drops, the pieces it leaves out), the pieces moved for the windows (their keep-outs moved
#      with them, never typed), the Boulders lantern on the mound's crest, the arm and its pivot with the shishi, the drops' words, and each changed file's hash;
#   2. Boulders: the rear stone (x 842 to 915) painted out of the four idle bases, the moss mound closed behind it and the tall stone carried down;
#   3. Roots: the bed re-lit for its new ground [248, 496, 192, 56] in the four lights (a partial match of the ground's light, and a contact shadow on the path);
#   4. the room chips: a 128 x 32 cut, 1:1, from inside each room's window in the four lights (Reeds on its blades).
#   python3 art/station-masters/collection/source/rooms_v2.py <masters-pods>/art/station-masters/pods/rooms <out>/art/station-masters/pods/rooms
import sys, os, json, shutil, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LIGHTS = ["dawn", "day", "dusk", "night"]
CROPS = {"roots": [0, 96], "reeds": [176, 96], "boulders": [178, 96], "ferns": [152, 96]}
# the key props each window holds whole (the owner's edge rule, 14:38): boxes tightened to their ink at 1x; `leaves` names the side where the form runs off the painting itself
KEEP = {
    "roots": [{"id": "roots-tree", "box": [22, 0, 606, 374], "leaves": "top", "what": "the trunk, the root flare and the roots"}, {"id": "roots-burrow", "box": [334, 286, 92, 84]}],
    "reeds": [{"id": "reeds-boulder", "box": [208, 267, 242, 138]}],
    "boulders": [{"id": "boulders-tree", "box": [396, 0, 444, 318], "leaves": "top"}, {"id": "boulders-pond", "box": [310, 322, 276, 82], "what": "the rim stones"},
                 {"id": "boulders-tall-stone", "box": [707, 136, 148, 196]}, {"id": "boulders-stones", "box": [777, 290, 68, 93], "what": "the leaning pair"}],
    "ferns": [{"id": "ferns-log", "box": [172, 252, 298, 132]}, {"id": "ferns-croziers", "box": [393, 103, 126, 226]}],
}
# the drop spots: eight foot points a room, centre out, front before back at the same x (the collection v2 design §4's table, checked at 1x)
DROPS = {
    "roots": [[344, 444], [256, 444], [432, 420], [472, 536], [168, 460], [520, 420], [560, 536], [88, 536]],
    "reeds": [[520, 536], [520, 433], [432, 536], [608, 536], [432, 460], [344, 536], [696, 536], [344, 460]],
    "boulders": [[522, 536], [522, 484], [438, 430], [434, 536], [610, 536], [610, 484], [350, 464], [346, 536]],
    "ferns": [[496, 536], [496, 388], [408, 536], [584, 536], [408, 408], [320, 536], [672, 536], [320, 408]],
}
LEAVE_OUT = {"reeds": ["reeds-sedge-1"], "ferns": ["ferns-fern-1"]}   # not pieces of the room view (a seam painted in the base; a tuft outside the window)
# the pieces moved for the windows: id -> the new [x, y] of rect_painting (the size and the art unchanged)
MOVES = {
    "roots": {"roots-bed": [248, 496], "roots-stone-2": [604, 499], "roots-mister": [620, 323], "roots-mist-2": [550, 324]},
    "reeds": {"reeds-raincup": [818, 303]},
    "boulders": {"boulders-stone-2": [196, 502], "boulders-shishi": [198, 262], "boulders-arm": [224, 264], "boulders-cushion-1": [770, 496], "boulders-lantern": [677, 282]},
    "ferns": {"ferns-copper-1": [772, 213], "ferns-copper-2": [820, 216], "ferns-crozier-1": [740, 496]},
}
CHIPS = {"roots": [330, 320], "reeds": [176, 360], "boulders": [330, 330], "ferns": [176, 330]}   # the 128 x 32 cut's corner in the painting: the burrow, the blades over the rock's foot, the pond, the log
CHIP_WHAT = {"roots": "the burrow's dark mouth under the root flare", "reeds": "the sedge blades over the rock's dark foot", "boulders": "the pond's dark water inside its rim stones", "ferns": "the log under its moss"}

def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()

# ---- 2. Boulders' rear stone, painted out ----
REAR = [(843, 368), (845, 350), (850, 318), (856, 295), (862, 272), (868, 258), (874, 249), (882, 242), (892, 240), (903, 243), (912, 250), (918, 261), (919, 285), (916, 315), (911, 340), (906, 358), (902, 368)]   # its silhouette at 1x
EDGE = 856   # the tall stone's right edge, carried down behind where the rear stone stood
MOSS = [(905, 327), (930, 335), (950, 350), (970, 367), (990, 383)]   # the moss's top to the right of the stone, measured at 1x (the same line in the four lights)
def moss_top(x): return float(np.interp(x, [p[0] for p in MOSS], [p[1] for p in MOSS]))
def mound(x): return 318 + (x - 856) * (327 - 318) / (905 - 856)   # the mound's new top: from the tall stone's shoulder to the moss it meets
def blurred(a, r): return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float)
def paint_out_rear_stone(im):
    a = np.asarray(im.convert("RGB")).astype(np.float64); H, W, _ = a.shape
    core = Image.new("L", (W, H), 0); ImageDraw.Draw(core).polygon(REAR, fill=255); core = core.filter(ImageFilter.MaxFilter(5))
    ring = core.filter(ImageFilter.MaxFilter(7)); m = np.asarray(ring) > 0; mc = np.asarray(core) > 0
    out = a.copy(); ys, xs = np.nonzero(m)
    left = a[236:260, 858:866].reshape(-1, 3).mean(0)   # the haze between the two stones
    for y in range(ys.min(), ys.max() + 1):   # the haze, row by row between the haze left of it and the haze right of it
        row = [x for x in range(835, 930) if m[y, x] and x > EDGE and y < mound(x)]
        if not row: continue
        xr = max(row) + 2; R = a[max(y - 2, 0):y + 3, xr:xr + 5].reshape(-1, 3).mean(0)
        xl = min(row) - 2; L = a[y - 2:y + 3, xl - 4:xl + 1].reshape(-1, 3).mean(0) if y < 258 else left
        for x in row: t = (x - xl) / (xr - xl); out[y, x] = L * (1 - t) + R * t
    src = a[230:320, 930:1000]; grain = src - blurred(src, 1.5)   # the haze's own grain, from the open haze to the right
    for y, x in zip(ys, xs):
        if x > EDGE and y < mound(x): out[y, x] += grain[(y * 3) % grain.shape[0], (x * 7) % grain.shape[1]]
    for y, x in sorted(zip(ys, xs)):   # the tall stone carried down: its own texture 70 rows up, top to bottom
        if x <= EDGE: out[y, x] = out[y - 70, x]
    for y, x in zip(ys, xs):   # the mound's moss 50 px to the right, its rows aligned on the two tops
        if x > EDGE and y >= mound(x): sx = x + 50; sy = int(round(moss_top(sx) + (y - mound(x)))); out[y, x] = a[min(sy, H - 1), sx]
    b = blurred(out, 0.9); seam = np.zeros((H, W), bool)
    for y, x in zip(ys, xs):
        if abs(y - mound(x)) <= 1.5 or abs(x - EDGE) <= 1: seam[y, x] = True
    out = np.where(seam[..., None], b, out)
    d = np.asarray(core.filter(ImageFilter.GaussianBlur(1.5))).astype(float) / 255   # weight 1 on the stone and 2 px round it, falling to 0 over the next 3 px
    w = (np.where(mc, 1.0, np.clip(d * 1.6, 0, 1)) * m)[..., None]
    res = a * (1 - w) + out * w
    return Image.fromarray(np.clip(np.round(res), 0, 255).astype(np.uint8), "RGB")

# ---- 3. Roots' bed re-lit on its new ground ----
OLD_BED, NEW_BED = (792, 496), (248, 496)
def relight_bed(bed, base):
    b = np.asarray(bed.convert("RGBA")).astype(np.float64); a = b[..., 3] / 255; g = np.asarray(base.convert("RGB")).astype(np.float64)
    def ground(x, y): reg = g[y:y + 56, x:x + 192]; return reg[a < 0.05].mean(0)
    gain = (ground(*NEW_BED) / ground(*OLD_BED)) ** 0.45   # the ground's light, matched part way: the nest keeps its own moss and straw
    rgb = np.clip(b[..., :3] * gain, 0, 255)
    # the contact shadow: the nest's own footprint, blurred, 3 px down, on the soil round it (within the bed's rect), at most 45 %
    sh = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(3.0))
    s = np.zeros_like(a); s[3:, :] = (np.asarray(sh).astype(float) / 255)[:-3, :]; s = np.clip(s * 0.45, 0, 0.45)
    soil = ground(*NEW_BED) * 0.35   # the shadow's colour: the path's own soil, darkened
    A = a + s * (1 - a)
    C = np.where(A[..., None] > 0, (rgb * a[..., None] + soil * (s * (1 - a))[..., None]) / np.maximum(A, 1e-6)[..., None], 0)
    return Image.fromarray(np.dstack([np.clip(np.round(C), 0, 255), np.round(A * 255)]).astype(np.uint8), "RGBA"), gain

def main(src, out):
    if os.path.abspath(src) == os.path.abspath(out): sys.exit("the output must be a copy, not the source")
    if os.path.exists(out): shutil.rmtree(out)
    shutil.copytree(src, out, ignore=shutil.ignore_patterns("proof-*", "work-*", "composite-*", "pick-*", "superseded-*"))
    mf = json.load(open(os.path.join(out, "rooms-manifest.json")))
    pods = os.path.dirname(out)
    rel = lambda p: os.path.relpath(p, pods).replace(os.sep, "/")
    changed = []
    # 2. the rear stone
    for l in LIGHTS:
        f = os.path.join(out, f"seated-idle-boulders-{l}.png"); im = Image.open(os.path.join(src, f"seated-idle-boulders-{l}.png")); paint_out_rear_stone(im).save(f); changed.append(f)
    # 3. the bed
    gains = {}
    for l in LIGHTS:
        f = os.path.join(out, f"pieces/roots/roots-bed-{l}.png"); r, gains[l] = relight_bed(Image.open(os.path.join(src, f"pieces/roots/roots-bed-{l}.png")), Image.open(os.path.join(src, f"seated-idle-roots-{l}.png"))); r.save(f); changed.append(f)
    # 4. the chips, from the placed bases (Boulders' painted out)
    os.makedirs(os.path.join(out, "chips"), exist_ok=True)
    for room, (x, y) in CHIPS.items():
        for l in LIGHTS:
            f = os.path.join(out, f"chips/room-{room}-chip-{l}-128x32.png"); Image.open(os.path.join(out, f"seated-idle-{room}-{l}.png")).convert("RGB").crop((x, y, x + 128, y + 32)).save(f); changed.append(f)
    # 1. the manifest
    for room in CROPS:
        r = mf[room]; mv = MOVES[room]
        for p in r["pieces"] + r.get("occluders", []):
            if p["id"] in mv:
                ox, oy = p["rect_painting"][:2]; nx, ny = mv[p["id"]]; dx, dy = nx - ox, ny - oy
                p["rect_painting"] = [nx, ny] + p["rect_painting"][2:]
                if p.get("foot_painting") is not None: p["foot_painting"] += dy
                if p.get("keepOut_painting"): k = p["keepOut_painting"]; p["keepOut_painting"] = [k[0] + dx, k[1] + dy, k[2], k[3]]
                if p.get("pivot_painting"): q = p["pivot_painting"]; p["pivot_painting"] = [q[0] + dx, q[1] + dy]
                p["moved"] = f"collection v2: from [{ox}, {oy}] (the room's window, the collection v2 design §4)"
            if p["id"] in LEAVE_OUT.get(room, []): p["view"] = False
        if room == "roots": r["keeps"]["bed_painting"] = [248, 496, 192, 56]
        if room == "boulders":
            for p in r["pieces"]:
                if p["id"] == "boulders-trickle": p["what"] = "the flume's trickle cell (at +32 px with the shishi and the arm, collection v2)"
                if p["id"] == "boulders-lantern": p["what"] = "small stone lantern (toro), unlit, on the mound's crest between the maple and the tall stone, its foot on the moss (collection v2: placed at 1x)"
        if room == "reeds":
            for p in r["pieces"]:
                if p["id"] == "reeds-drop": p["what"] = "the drop cell: falls from the cup's lip (x 844, y 309) to the bank's moss at y 340, every ~4 s"
        r["view"] = {"crop": CROPS[room], "keep": KEEP[room], "drops": DROPS[room], "rest": "main's left end inside the crop",
                     "note": "the room view's window [cx, 96, 688, 472] of the painting (the collection v2 design §4, the collection v2 art direction): the owner's edge rule, 14:38 and 15:24"}
        r["chip"] = {"file": f"rooms/chips/room-{room}-chip-{{light}}-128x32.png", "size": [128, 32], "crop_painting": CHIPS[room] + [128, 32], "what": CHIP_WHAT[room],
                     "source": f"the room's placed idle base of the light (Boulders' with the rear stone painted out), the 128 x 32 window at {CHIPS[room]}, 1:1, opaque; collection v2 art job 4, no new painting"}
    for f in changed: mf["hashes"][rel(f)] = sha(f)
    mf["unsigned"] = {rel(f): "the collection v2 art job, code and hand work, for the art director's check at 1x" for f in changed}
    mf["collection_v2"] = {"note": "collection v2 art job (the collection v2 design Builder checklist 1 to 4): Boulders' rear stone painted out of the four seated idle bases; Roots' bed re-lit at [248, 496, 192, 56] (gain per light below, a contact shadow on the path); the room chips cut 128 x 32; the windows' crops, keep boxes and drop spots; the pieces moved for the windows. Made by art/station-masters/collection/source/rooms_v2.py in the Station repo, no paid call",
                           "bed_gain": {l: [round(float(v), 4) for v in g] for l, g in gains.items()}}
    open(os.path.join(out, "rooms-manifest.json"), "w").write(json.dumps(mf, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {len(changed)} pictures and the manifest into {out}")

if __name__ == "__main__":
    if len(sys.argv) != 3: sys.exit("usage: rooms_v2.py <masters-pods rooms folder> <out rooms folder>")
    main(sys.argv[1], sys.argv[2])
