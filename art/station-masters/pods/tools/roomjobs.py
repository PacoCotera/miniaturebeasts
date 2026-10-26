"""Vivarium rooms 2-4, the studio's job files (art director's briefs ad-rooms-briefs.md §3, owner's go 2026-10-26).
Writes source/work/rooms/<name>.json (one request each, tries 1: a failed or refused request stops the job, no retry) and
source/work/rooms/prompts.json (every prompt with its sha256). Model and size as room 1's pass 94: gemini-3-pro-image, 1K.
python3 -I tools/roomjobs.py"""
import os, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"; MODEL = "gemini-3-pro-image"
REF1_IDLE = {l: P + f"slices/idle-vivarium-{l}-1024x568.png" for l in ("day", "dawn", "dusk", "night")}
REF1_NEAR = {l: P + f"slices/vivarium-near-{l}-544x408.png" for l in ("day", "dawn", "dusk", "night")}
MAP_IDLE = P + "rooms/map-idle-1024x568.png"; MAP_NEAR = P + "rooms/map-near-544x408.png"
BACKDROP = {"reeds": P + "slices/sitting-backdrop-pond-544x408.png", "boulders": P + "slices/sitting-backdrop-rock-544x408.png", "ferns": P + "slices/sitting-backdrop-wood-544x408.png"}
SUBJ = {"reeds": "reeds, rushes and damp ground", "boulders": "sandstone stone and scree", "ferns": "leaf litter and forest-floor ground"}
NEVER = {"reeds": "never its finish, never its water, never its pools or banks", "boulders": "never its flat, toon-like finish, never its angular flat-topped slabs", "ferns": "never its finish, never its tree trunks"}
HOUSE = ("The SAME terrarium inside the SAME rugged field device as Image 1, seen from the same eye height with the same lens and the same depth of field: "
         "the left wall with its braided feed line and connector, the right wall with its mister arm and slatted vent, the dark soil strip along the foot, each exactly where it is in Image 1. "
         "Inside it a NEW planting, painted in the Miniature Lives finish of Image 1: fine grain on the world, soft bokeh behind, a warm key light from the top left with its shafts. "
         "Cute by craft, never childish: no cartoon outlines, no toy colours, no gloss, no glow, no chrome, no alien tech. "
         "No creatures, no animals, no figures, no text, no letters, no digits, no logos, no frame, no UI. No water except one small flat seep. Pebbles and leaves at the scale of Image 1's.")
FLOOR = ("THE OPEN FLOOR (the pale band of Image 2, from the red line down to the dark soil strip) is low open ground, nothing a small creature could perch on: "
         "every piece on it lower than a pebble-and-a-half (about 32 px of a 568 px tall picture), at most two rounded or leafy pieces up to about twice that, never flat-topped; "
         "no flat raised top, no ledge, no slab, no step; no log, root or stem lying across the floor; everything tall stands BEHIND the red line, its feet ending on it, never spilling forward onto the floor. "
         "The back edge of the floor (where open floor ends and the planting behind begins) runs along the red line of Image 2, or a little above it inside the amber strip, never below it. "
         "The two dark side columns of Image 2 hold only the device walls, the feed line at the left and the mister and vent at the right, kept clear of planting.")
IDLE = {
 "reeds": ("THE NEW PLANTING: a reed and rush margin on damp ground. Tall reeds stand behind the floor, rising to about a quarter of the height from the top: slender straw-gold dry stems among green ones, "
           "fine seed heads catching the key light; the stand is densest at the centre-left (from about 37 to 64 percent of the width) and thinner to the right; their dark wet roots meet the floor's back edge. "
           "Low rush tufts at the far left, just right of the feed line. The floor: damp dark soil and short wet moss, three flat wet stones lying low with a soft sheen, one small seep of water no bigger than a hand's width "
           "(about 110 by 28 px) lying flat between about 41 and 59 percent of the width, reed litter lying flat. NO pool, no pond, no bank, no open water, no ripples, no reflections. "
           "Straw-gold and warm olive, never blue-green. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
 "boulders": ("THE NEW PLANTING: two great rounded sandstone boulders, smooth and weathered, with lichen and moss in their cracks. The large one fills the back left (from about 12 to 41 percent of the width, its top at about 35 percent of the height); "
              "the smaller one stands right of centre (from about 55 to 70 percent of the width, its top at about half the height). Both are domed and rounded all over: no flat top, no ledge, no cliff, no climbable face, no crag. "
              "Fans of fine scree at their feet stop at the floor's back edge. Cushion plants and small succulents in the gaps. The floor: fine scree, small pebbles, moss and low cushion plants, two rounded stones at most. "
              "The stone is warm ochre-grey sandstone lit from the top left, its shadow side warm, never blue granite. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
 "ferns": ("THE NEW PLANTING: a fern bank of broad fronds fanning out across the back (from about 29 to 74 percent of the width, rising to about 28 percent of the height from the top): deep green fronds with lighter new fronds and curled croziers. "
           "A fallen log, mossy and soft-barked, lies along the back edge of the floor from about 14 to 55 percent of the width, its top at about 58 percent of the height and its underside resting ON the red line, fronds growing over it; it never crosses onto the floor. "
           "The floor: leaf litter lying flat in warm browns, moss, a few small croziers, two small fern tufts at most. No tree trunks, no forest: it is a terrarium planting. "
           "Fern greens warm, never cooler than Image 1's moss. Do NOT copy Image 1's burrow, root mound, succulents or its pool: Image 1 is the authority on the device, camera, scale, finish and light only."),
}
NEAR = {
 "reeds": "THE NEW PICTURE: reed stems framing both sides, rising out of the top of the frame; a flat wet stone at the right (from about 81 to 96 percent of the width); seed heads soft in the back; the floor in front, across the centre, open damp moss.",
 "boulders": "THE NEW PICTURE: the rounded flank of a sandstone boulder filling the left side (the left quarter of the width); a slope of fine scree and cushion plants at the right; the floor across the centre open and finely pebbled.",
 "ferns": "THE NEW PICTURE: fern fronds arching in from both top corners; the mossy log's end at the right (from about 77 percent of the width to the edge), lying behind the floor line; leaf litter lying flat across the centre of the floor.",
}
def job(name, aspect, refs, prompt):
    return {"name": name, "model": MODEL, "aspect": aspect, "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}
jobs = {}
for room in ("reeds", "boulders", "ferns"):
    jobs[f"idle-vivarium-{room}-day-a"] = job(f"idle-vivarium-{room}-day-a", "16:9", [
        [REF1_IDLE["day"], "IMAGE 1, THE AUTHORITY (room 1's signed painting by day): the device, the camera, the lens, the scale, the finish and the light. Never the layout of its planting:"],
        [MAP_IDLE, "IMAGE 2, THE LAYOUT MAP (structure and placement only, never the look): green-grey is the back zone where the tall planting stands; the red line is the floor's back edge (the amber strip above it is the only allowed slack); pale sand is the open floor; dark brown at the foot is the soil strip; dark grey columns are the device walls with the feed line, mister and vent; the white frame is the part that must hold the room's main feature; the hatched corner must not hold it:"],
        [BACKDROP[room], f"IMAGE 3, SUBJECT AND MATERIAL ONLY ({SUBJ[room]}): {NEVER[room]}:"]],
        "Output a NEW image, 16:9. " + HOUSE + " " + IDLE[room] + " " + FLOOR)
    jobs[f"vivarium-near-{room}-day-a"] = job(f"vivarium-near-{room}-day-a", "4:3", [
        [REF1_NEAR["day"], "IMAGE 1, THE AUTHORITY (room 1's signed close-up by day): the camera at ground level, the lens, the depth of field, the scale, the finish and the light. Never the layout of its planting:"],
        [MAP_NEAR, "IMAGE 2, THE LAYOUT MAP (structure and placement only, never the look): green-grey above is the soft back; pale sand below is the ground; the darker side panels are where the room's features frame the view; the white block is open floor where one small creature will stand (moss or soil only, nothing taller than a few pixels); the white outline is ground throughout:"],
        [BACKDROP[room], f"IMAGE 3, SUBJECT AND MATERIAL ONLY ({SUBJ[room]}): {NEVER[room]}:"]],
        "Output a NEW image, 4:3: this room seen much CLOSER and at GROUND LEVEL, at the creatures' scale, in the same warm daylight from the upper left, the same Miniature Lives finish (fine grain, soft bokeh behind) as Image 1. "
        + NEAR[room] + " The open floor across the centre of the lower part (the white block of Image 2) is moss or soil only, nothing on it taller than a tiny pebble; nothing busy directly behind the middle of the picture: the features frame it from the sides and from far back. "
        "No creatures, no animals, no figures, no text, no letters, no digits, no frame, no UI, no pool, no open water, no cliff or ledge. Cute by craft, never childish: no cartoon outlines, no toy colours, no gloss, no glow.")
LIGHT = {
 "night": ("NIGHT: warm and low. The floor stays lit like Image 2's night ground (the open floor brighter than the back zone); the back zone warm and dark; the moon only as a thin cool rim on the tops of the tallest pieces; "
           "no glow effects, no glowing moss, no lamps, no moon disc."),
 "dusk": "DUSK: the key light low and amber from the left, long soft shadows falling to the right, the back zone warm and dark; no lamps, no glow.",
 "dawn": "DAWN: the same key light, lower and paler; a thin cool haze in the back zone only; a soft floor; no glow, no lamps.",
}
def edit(room, pic, light):
    big = pic == "idle"; nm = f"idle-vivarium-{room}-{light}-a" if big else f"vivarium-near-{room}-{light}-a"
    src = f"art/station-masters/pods/rooms/signed-{pic}-{room}-day.png"; ref = REF1_IDLE[light] if big else REF1_NEAR[light]
    return nm, job(nm, "16:9" if big else "4:3", [
        [src, "IMAGE 1, THE PICTURE TO EDIT (this room's signed painting by day): keep everything, relight only:"],
        [ref, f"IMAGE 2, THE LIGHT TO MATCH (room 1's signed painting by {light}): take its light, colour and brightness only, never its planting or composition:"]],
        "Output a NEW image: Image 1 at " + LIGHT[light] + " Match Image 2's overall brightness and warmth. Keep Image 1 EXACTLY the same in composition and content: every reed, stone, frond, pebble, leaf, the device walls, feed line, mister, vent and soil strip in the same places and sizes, the same matte miniature finish; "
        "change ONLY the light and its colour. Do not move or add any piece, do not add a lamp, a moon disc or glowing things, do not recolour the materials. Still no creatures, no text, no water but the one small seep.")
for room in ("reeds", "boulders", "ferns"):
    for light in ("night", "dusk", "dawn"):
        for pic in ("idle", "near"):
            n, j = edit(room, pic, light); jobs[n] = j
os.makedirs("source/work/rooms", exist_ok=True); idx = {}
for n, j in jobs.items():
    json.dump([j], open(f"source/work/rooms/{n}.json", "w"), indent=1); idx[n] = {"sha256": hashlib.sha256(j["prompt"].encode()).hexdigest(), "prompt": j["prompt"], "refs": j["refs"]}
json.dump(idx, open("source/work/rooms/prompts.json", "w"), indent=1); print(len(jobs), "jobs")
