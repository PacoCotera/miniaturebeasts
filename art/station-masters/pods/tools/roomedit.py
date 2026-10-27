"""Vivarium rooms 2-4 showpieces, Idle day round sb (lead's go after sa): Pro edits of each room's sa picture, "keep everything, change only".
Image 1 is rooms/work-idle-vivarium-<room>-day-sa.png (the cut 1024x568). python3 -I tools/roomedit.py -> source/work/rooms/idle-vivarium-<room>-day-sb.json"""
import os, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"
KEEP = ("Output a NEW image, 16:9: Image 1 edited. KEEP EVERYTHING in Image 1 exactly as it is (the planting, the composition, the palette, the light, the hand-painted miniature finish, the soft back, the camera) and CHANGE ONLY the following. ")
FRONT = ("1. Take out the two low pieces standing on the open floor (described below) and paint plain open floor where they stood, matching the floor around them. "
         "2. Then add two SMALL low pieces at the very front of the floor, their bases resting on the top edge of the dark soil strip at the bottom: one between about 12 and 30 percent of the width, one between about 68 and 85 percent; "
         "each no wider than about 9 percent of the width and no taller than about 8 percent of the height, about the size of a fist beside a pebble; nothing else new on the floor. ")
END = (" Do not add anything else; no creatures, no text, no frame, no box, no pool.")
ROOMS = {
 "reeds": FRONT.replace("(described below)", "(the sedge tuft at the left and the rounded stone right of centre)") +
   "The two new front pieces: a small sedge tuft (left) and a small wet rounded stone (right). "
   "3. Make the funnel at the right about a third of its size, half hidden among the sedges and in shadow, its single drop kept. "
   "4. Remove the two thin vertical glass posts in the upper back and the half grey cylinder at the far right edge; paint the misty back and sedges there.",
 "boulders": FRONT.replace("(described below)", "(the moss-capped stone at the left of the gravel and the green azalea cushion right of centre)") +
   "The two new front pieces: a small moss-capped stone (left) and a small rounded clipped moss cushion (right), on the gravel. "
   "3. The large stones at the right of centre: move their lower edges up so the gravel runs a little further back there, their feet ending higher, at the same line as the stones at the left. "
   "4. If it can be done believably, make the bamboo a shishi-odoshi: the flume pours into a short bamboo arm on a pivot post that would tip into the stone basin; otherwise leave the bamboo flume and its trickle as they are.",
 "ferns": FRONT.replace("(described below)", "(the fern tuft at the left and the clump of croziers right of centre)") +
   "The two new front pieces: a small low fern tuft (left) and a small clump of croziers (right). "
   "3. Make the ceramic fogger bowl about a third of its size, half hidden behind the log, its low fog kept along the back. "
   "4. Keep only two thin copper drip lines, in shade among the fronds, hidden behind the fronds above about 35 percent of the height (none crossing the band from 20 to 35 percent of the height), each ending in one drop; remove the others. "
   "5. Remove the brown fallen leaves from the floor; paint plain short moss there. "
   "6. Lift the mossy log a little so its underside rests higher, about 70 percent of the height from the top, and the open floor runs a little further back beneath it. "
   "7. Make the open floor a little brighter, sunlit, like the light on the log.",
}
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
for room, txt in ROOMS.items():
    n = f"idle-vivarium-{room}-day-sb"; prompt = KEEP + txt + END
    refs = [[P + f"rooms/work-idle-vivarium-{room}-day-sa.png", "IMAGE 1, THE PICTURE TO EDIT (this room's day, round sa): keep everything but the listed changes:"]]
    if n in idx and idx[n]["prompt"] != prompt: raise SystemExit(f"{n} already written with another prompt")
    json.dump([{"name": n, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}], open(f"source/work/rooms/{n}.json", "w"), indent=1)
    idx[n] = {"sha256": hashlib.sha256(prompt.encode()).hexdigest(), "prompt": prompt, "refs": refs}
json.dump(idx, open(idx_p, "w"), indent=1); print("3 jobs sb")
