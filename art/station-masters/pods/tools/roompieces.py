"""Vivarium rooms, composite method (owner 18:41): the piece sheets. Each room's separate pieces (front occluders, fittings, animated parts, Roots' bed) are painted
on ONE sheet on a flat key colour, then cut to alpha by hand at 0 MXN (tools/roomcut.py) and placed by hand (rooms-manifest.json `pieces`).
Image 1 is the room's signed day, for palette, light and finish only. Key: magenta #FF00FF for the green rooms; pure green #00FF00 for the koi (no green in a koi).
Pieces are incidental, small and partly shaded unless they act (owner 18:16; ad-rooms-showpiece.md §2). One request per sheet, tries 1.
python3 -I tools/roompieces.py ROOM LETTER -> source/work/rooms/pieces-<room>-<letter>.json  (ROOM: roots, reeds, boulders, koi, ferns)"""
import os, sys, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; room, L = sys.argv[1], sys.argv[2]
def common(key, n, light):
    return ("Output ONE image, 16:9: a PIECE SHEET for a painted terrarium scene: " + str(n) + " separate small objects, each painted on its own, well apart from each other with wide empty space between them, "
     "laid out in a loose grid, every object whole and nothing cut by the picture's edge, on a FLAT, PURE, EVEN " + key + " background edge to edge: no gradient, no texture, no floor, no ground plane, no cast shadow on the background, no vignette. "
     "Painted in the SAME hand-painted miniature-diorama finish, palette and light as Image 1: fine painterly grain, believable materials, sharp edges, " + light + ". "
     "Each object is lit and shaded as it would sit in Image 1: its lower part darker, as if partly in shadow. Never photographic, never toon, never childish, no cartoon outlines, no toy colours, no gloss, no glow. "
     "No creatures, no animals, no figures, no text, no letters, no digits, no labels, no frame. Do NOT paint the room of Image 1: only the objects listed, each isolated on the flat background. THE OBJECTS: ")
MAG = "MAGENTA (#FF00FF)"
SHEET = {
 "roots": (MAG, 5, "warm golden late-morning light from the upper left",
   "1. A LOW TUFT of small young ferns and moss, rounded and leafy, wider than tall (about 2 to 1), its base a soft mossy clump. "
   "2. A SMALL ROUNDED MOSSY STONE, honey-grey, wider than tall (about 2 to 1), moss on its top, its base flat. "
   "3. A SLEEPING NEST: a very shallow oval mat of soft moss and fine dry golden grass, seen from a low eye height so it is very wide and thin (about 3.5 to 1), plain and soft, a few tiny dry leaves woven in, no bowl, no rim, no pit. "
   "4. A SMALL MISTER: a short thin weathered copper pipe, bent once, ending in a tiny brass nozzle, with a fine soft fan of mist spraying from the nozzle; small and plain, half wrapped by a thin root and a sprig of moss. "
   "5. The same short copper pipe and tiny brass nozzle as object 4 with NO mist, alone."),
 "reeds": (MAG, 4, "soft bright overcast light from above, cool grey-green, raindrops beaded on the leaves",
   "1. A LOW TUFT of silver-green sedge blades beaded with raindrops, arching, wider than tall (about 2 to 1), its base a small mossy clump. "
   "2. A SMALL WET ROUNDED STONE, rain-darkened grey with a soft wet sheen, a little moss at its base, wider than tall (about 2 to 1), its base flat. "
   "3. A SMALL RAIN CUP: a little dark grey matte ceramic cup on a short thin bamboo stake, tilted slightly, rain water filling it to the lip, ONE drop hanging from its lip; plain and modest. "
   "4. ONE single clear water drop, large, alone."),
 "boulders": (MAG, 6, "warm low autumn light from the left, soft shade",
   "1. A LOW ROUNDED MOSSY STONE, grey granite with a thick moss cap, wider than tall (about 2 to 1), its base flat. "
   "2. A LOW CLIPPED MOSS-AND-FERN CUSHION, rounded, a few small gold maple leaves resting on it, wider than tall (about 2 to 1). "
   "3. A SMALL STONE LANTERN (a plain Japanese garden lantern, toro), weathered grey granite with moss on its roof, UNLIT, its window dark, a little taller than wide. "
   "4. A SHISHI-ODOSHI WITHOUT ITS ARM: a thin bamboo flume (kakehi) on a short bamboo post pouring a thin trickle of water down, and below it a small carved stone basin with water inside its lip only, and the two short bamboo posts of the pivot standing empty beside the basin. "
   "5. THE ARM ALONE: one short thick bamboo tube cut at a slant at one end, closed at the other, lying level, about five times as long as it is thick. "
   "6. A small thin trickle of falling water, alone, a short vertical thread."),
 "koi": ("PURE GREEN (#00FF00)", 16, "seen from above at a steep angle, as fish just under the surface of a dark still pond, soft warm light from the left",
   "SIXTEEN small koi in FOUR ROWS of FOUR. Each ROW is ONE koi shown in four swimming poses, one after another, all facing RIGHT, each a slightly different bend of the body and tail as it swims (straight, tail left, straight, tail right). "
   "Row 1: a white koi with orange-red patches. Row 2: a pale gold koi. Row 3: a white koi with a red head spot and a few black marks. Row 4: an orange koi. "
   "Each fish slender, about five times as long as wide, soft fins, painted, never cartoon."),
 "ferns": (MAG, 5, "dappled green-gold light from the upper left, cool shade",
   "1. A LOW TUFT of small ferns, rounded and leafy, deep green with lighter new fronds, wider than tall (about 2 to 1), its base a mossy clump. "
   "2. A SMALL CLUMP of curled croziers and tiny young fronds, low, wider than tall (about 3 to 2), its base a mossy clump. "
   "3. A SMALL FOGGER BOWL: a low wide matte grey-green ceramic bowl, partly mossed, with a soft low fog brimming over its rim; plain and modest, wider than tall (about 2 to 1). "
   "4. TWO THIN COPPER DRIP LINES side by side: each a very thin weathered copper tube hanging down, bent gently once, ending in a small drop at its tip; long and thin, about twelve times as long as wide. "
   "5. ONE single clear water drop, large, alone."),
}
key, n, light, objs = SHEET[room]
name = f"pieces-{room}-{L}"; prompt = common(key, n, light) + objs
day = "boulders" if room == "koi" else room
refs = [[P + f"rooms/signed-idle-{day}-day.png", "IMAGE 1, THE ROOM (its signed day painting): palette, light and finish only; do not paint the room:"]]
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if name in idx and idx[name]["prompt"] != prompt: raise SystemExit(f"{name} already written with another prompt")
json.dump([{"name": name, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{name}.json", "w"), indent=1)
idx[name] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}; json.dump(idx, open(idx_p, "w"), indent=1); print(name)
