"""Vivarium rooms 2-4 showpieces: the light edits (each room's own way; owner 18:05) and the shared mist sheet.
Each edit's only reference is the room's own signed day (Idle or near). No room-1 reference.
python3 -I tools/roomlight.py edit ROOM PIC LIGHT LETTER -> source/work/rooms/<name>.json ; python3 -I tools/roomlight.py mist LETTER -> source/work/rooms/mist-sheet-<letter>.json"""
import os, sys, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"
CHAR = {"boulders": {
 "night": "NIGHT in this garden: cool moonlight from the upper left; the combed gravel floor pale and silvery, clearly BRIGHTER than the dark stones and the dark bamboo back; the moss caps dark green with a faint cool rim on their tops; the stone lantern stays UNLIT and dark; the water trickle catches a thin cool highlight. No moon disc in view, no lamps, no glow, no stars.",
 "dusk": "DUSK in this garden: the sun low and warm amber from the left, long soft blue shadows of the stones falling to the right across the combed gravel, the moss caps glowing warm on their sunlit side only, the bamboo back warm and darkening; the lantern unlit. No lamps, no glow.",
 "dawn": "DAWN in this garden: soft pale early light, a thin low mist lying over the moss behind the stones only, the gravel cool and soft, the colours muted and fresh, the bamboo back pale and hazy; the lantern unlit. No lamps, no glow."}}
def edit(room, pic, light, L):
    big = pic == "idle"; n = f"idle-vivarium-{room}-{light}-s{L}" if big else f"vivarium-near-{room}-{light}-s{L}"
    src = P + f"rooms/signed-{pic}-{room}-day.png"
    prompt = ("Output a NEW image, " + ("16:9" if big else "4:3") + ": Image 1 at a different time of day. " + CHAR[room][light] +
      " Keep Image 1 EXACTLY the same in composition and content: every stone, moss cap, gravel line, the bamboo flume and its basin, the lantern, the two low pieces on the gravel, in the same places and sizes, in the same hand-painted miniature finish; "
      "change ONLY the light and its colour. Do not move, add or remove anything. No creatures, no text.")
    refs = [[src, "IMAGE 1, THE PICTURE TO RELIGHT (this room's signed day): keep everything, relight only:"]]
    return n, {"name": n, "model": "gemini-3-pro-image", "aspect": "16:9" if big else "4:3", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}
def mist(L):
    n = f"mist-sheet-{L}"
    prompt = ("Output ONE image, 16:9: a reference sheet of SIX separate soft wisps of low mist, painted in a fine hand-painted miniature finish, pure soft white, each wisp a long low horizontal drift about four times as wide as it is tall, "
      "with soft feathered edges fading to nothing, laid out in two rows of three, well apart, on a flat PURE BLACK background (#000000) edge to edge. Nothing else: no ground, no plants, no objects, no glow, no text, no frame.")
    return n, {"name": n, "model": "gemini-3-pro-image", "aspect": "16:9", "size": "1K", "tries": 1, "refs": [], "prompt": prompt}
n, j = edit(*sys.argv[2:6]) if sys.argv[1] == "edit" else mist(sys.argv[2])
idx_p = "source/work/rooms/prompts.json"; idx = json.load(open(idx_p))
if n in idx and idx[n]["prompt"] != j["prompt"]: raise SystemExit(f"{n} already written with another prompt")
json.dump([j], open(f"source/work/rooms/{n}.json", "w"), indent=1); idx[n] = {"sha256": hashlib.sha256(j["prompt"].encode()).hexdigest(), "prompt": j["prompt"], "refs": j["refs"]}
json.dump(idx, open(idx_p, "w"), indent=1); print(n)
