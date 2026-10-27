"""Vivarium rooms 2-4 as showpieces (owner 18:05, picks 18:15, money 18:23; art director's ad-rooms-showpiece.md): the jobs.
Image 1 is the owner's picked option tile, cut inside its case (the only reference; no map, no crop of room 1). Geometry in words.
python3 -I tools/roomshow.py -> rooms/pick-<room>.png, source/work/rooms/idle-vivarium-<room>-day-s<L>.json, prompts.json entries (kept, never rewritten)."""
import os, json, hashlib
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; MODEL = "gemini-3-pro-image"; ROUND = os.environ.get("ROOMSHOW_ROUND", "sa")
PICK = {"reeds": ("B", (688, 0), (32, 26, 656, 356)), "boulders": ("D", (688, 384), (40, 40, 648, 352)), "ferns": ("A", (0, 0), (84, 48, 600, 330))}
for room, (opt, (ox, oy), (x0, y0, x1, y1)) in PICK.items():
    Image.open(f"source/raw/options-{room}-a.jpg").convert("RGB").crop((ox + x0, oy + y0, ox + x1, oy + y1)).save(f"rooms/pick-{room}.png")
COMMON = ("Image 1 is the owner's approved concept for this room. Paint THIS room as a finished painting: the same planting, palette, mood and light as Image 1, "
 "but showing ONLY the inside of the terrarium, edge to edge, wide, from a low eye height, straight on: no case, no bezel, no frame, no window posts, no box, no ceiling, no side walls of a box, no glass edges. "
 "Finish: a hand-painted miniature diorama, fine painterly grain on everything, the back softly out of focus with gentle bokeh, the floor sharp; believable materials; never photographic, never toon, never childish, no cartoon outlines, no toy colours, no gloss, no glow, no chrome, no alien tech. "
 "No creatures, no animals, no figures, no text, no letters, no digits, no logos, no UI. No pool, no pond, no open water surface, no cliff, no crag, no ledge. "
 "LAYOUT, as fractions of the picture: the open floor's back edge (where the open floor ends and everything taller begins) runs at about 80 percent of the height down from the top over the left tenth of the width, "
 "about 76 percent from 10 to 32 percent of the width, about 70 percent from 32 to 55 percent, about 71 percent from 55 to 88 percent, and about 75 percent over the right eighth; it may sit a little higher, never lower. "
 "Below that edge, down to about 97 percent of the height, is the OPEN FLOOR: low, CALM and plain, nothing on it taller than a small pebble, no scatter of litter, debris or stones, no roots or stems lying across it, "
 "so small dark, brown and teal creatures read clearly on it. The bottom 3 percent is a thin dark soil strip across the full width. "
 "Everything tall stands BEHIND the back edge, its feet ending on it, never spilling onto the floor. "
 "EXCEPT TWO LOW FOREGROUND PIECES at the very front of the floor, their bases at about 94 to 96 percent of the height, each no wider than a tenth of the width and no taller than about 8 percent of the height: "
 "one between about 12 and 30 percent of the width, one between about 68 and 85 percent. "
 "Nothing important between 57 and 65 percent of the width in the lowest fifth. "
 "FITTINGS are incidental: small, half in shadow, off-centre, standing at or behind the back edge, never in the open floor and never as hoses or pipes along the side edges; each small, no more than about 7 percent of the width and a fifth of the height. ")
ROOMS = {
 "reeds": ("THE ROOM: a sedge meadow just after rain, as in Image 1: silver-green sedges beaded with raindrops under soft bright overcast light, cool grey-green above, a warm short wet moss floor, a thin pale haze in the soft back. "
           "ADD one rain-darkened rounded rock, smooth and weathered, half among the sedges at the back left of centre (from about 18 to 34 percent of the width, its top at about 55 percent of the height), sitting behind the back edge. "
           "The rain-catch funnel is made SMALL and quiet: about 5 percent of the width, at the far right back, half hidden among the sedges and in shadow, a single drop at its lip; no tall copper stand in view. "
           "The two foreground pieces: a low sedge tuft (left) and a small wet rounded stone (right)."),
 "boulders": ("THE ROOM: a Japanese moss garden, as in Image 1, made more Japanese with restraint: large river-smoothed pink-grey granite stones with soft moss caps behind the back edge, a moss garden between them, soft green dappled light. "
              "The OPEN FLOOR is fine pale grey gravel combed in long straight low-contrast lines running parallel to the bottom edge, calm and even, no circles, nothing on it. "
              "In the left third, at the back, a bamboo shishi-odoshi: a thin bamboo flume trickling into a bamboo arm on a pivot, over a small carved stone basin (tsukubai) whose water shows only inside its lip; the basin small, behind the back edge; no ripples beyond its lip, no pond. "
              "At the back right, half in shadow, one small unlit grey stone lantern (toro). A few soft bamboo stems or one maple branch in the far bokeh, not both. "
              "Never a torii, a bridge, a pagoda, koi, cherry blossom, red lacquer, bonsai or a sand pattern of circles. "
              "The two foreground pieces: a low moss-capped stone (left) and a small clipped green azalea cushion without flowers (right)."),
 "ferns": ("THE ROOM: a shaded fern dell, as in Image 1: a deep green fern bank with golden flecks of sun, dappled green-gold light, cool shade, a mossy fallen log lying along the back edge (from about 15 to 60 percent of the width), its underside on the back edge. "
           "The ceramic fogger bowl is made SMALL: about 6 percent of the width, half hidden behind the log at the right of centre, a low soft fog drifting from it along the back only, never over the open floor. "
           "Two or three very thin copper drip lines hang in the shade among the fronds, one drop at a tip. The floor short moss and dark peat with only two or three flat leaves. "
           "No tree trunks, no forest: it is a terrarium planting. The two foreground pieces: a low fern tuft (left) and a small clump of curled croziers (right)."),
}
# Round sc (art director's written ruling, lead's go after sb): Reeds and Ferns only. Occluders are the in-band pieces (lead's ruling 1), each room declares
# its own measured tops (ruling 2), so the layout keeps its back-edge fractions as guidance only. Sizes are given against the room's own pieces, which the model
# holds better than percentages: Reeds' fitting smaller than a quarter of the rock's height; Ferns' bowl a tenth of the log's length, two copper lines below 35 %.
if ROUND == "sc":
    ROOMS = {
     "reeds": ROOMS["reeds"].replace("The rain-catch funnel is made SMALL and quiet: about 5 percent of the width, at the far right back, half hidden among the sedges and in shadow, a single drop at its lip; no tall copper stand in view. ",
        "The only fitting is a TINY dark grey ceramic rain cup on a short stake, LESS THAN A QUARTER OF THE ROCK'S HEIGHT, at the back right, half hidden among the sedges and in shadow, one drop at its lip; no funnel on a stand, no posts, no cylinders, no glass edges. "),
     "ferns": ROOMS["ferns"].replace("The ceramic fogger bowl is made SMALL: about 6 percent of the width, half hidden behind the log at the right of centre, a low soft fog drifting from it along the back only, never over the open floor. ",
        "The ceramic fogger bowl is TINY: no wider than a tenth of the log's length, half hidden BEHIND the log at the right of centre so only its rim shows, a low soft fog drifting from it along the back only, never over the open floor. ")
        .replace("Two or three very thin copper drip lines hang in the shade among the fronds, one drop at a tip. ",
        "Exactly TWO very thin copper drip lines, in shade among the fronds; they appear only below about 35 percent of the height, coming out from behind fronds, never hanging from the top of the picture; one drop at each tip. ")
        .replace("a mossy fallen log lying along the back edge (from about 15 to 60 percent of the width), its underside on the back edge. ",
        "a mossy fallen log lying level along the back edge (from about 15 to 60 percent of the width), its underside resting ON the back edge at about 72 percent of the height along its whole length, never sloping down onto the floor. ")
        .replace("The floor short moss and dark peat with only two or three flat leaves. ", "The floor short bright sunlit moss, no leaves. "),
    }
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
for room, txt in ROOMS.items():
    n = f"idle-vivarium-{room}-day-{ROUND}"; prompt = "Output a NEW image, 16:9. " + COMMON + txt
    refs = [[P + f"rooms/pick-{room}.png", f"IMAGE 1, THE APPROVED CONCEPT (the owner's pick, option {PICK[room][0]}): the room's planting, palette, mood and light; never its case, frame or box:"]]
    j = {"name": n, "model": MODEL, "aspect": "16:9", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}
    if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
    json.dump([j], open(f"source/work/rooms/{n}.json", "w"), indent=1); idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}
json.dump(idx, open(idx_p, "w"), indent=1); print(len(ROOMS), "jobs", ROUND)
