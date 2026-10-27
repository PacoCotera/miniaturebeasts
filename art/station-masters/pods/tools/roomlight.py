"""Vivarium rooms 2-4 showpieces: the light edits (each room's own way; owner 18:05) and the shared mist sheet.
Each edit's only reference is the room's own signed day (Idle or near). No room-1 reference.
python3 -I tools/roomlight.py edit ROOM PIC LIGHT LETTER -> source/work/rooms/<name>.json ; python3 -I tools/roomlight.py mist LETTER -> source/work/rooms/mist-sheet-<letter>.json"""
import os, sys, json, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
P = "art/station-masters/pods/"
# Round t (composite-method days; owner 18:05 each room its own light; showpiece light gate G3): each edit relights the room's own signed scene WITHOUT pieces;
# the pieces are graded by hand to the new light (tools/roomcut.py LIGHT). The zen Boulders' CHAR (round s) is kept below as written.
ZEN = {"boulders": {
 "night": "NIGHT in this garden: cool moonlight from the upper left; the combed gravel floor pale and silvery, clearly BRIGHTER than the dark stones and the dark bamboo back; the moss caps dark green with a faint cool rim on their tops; the stone lantern stays UNLIT and dark; the water trickle catches a thin cool highlight. No moon disc in view, no lamps, no glow, no stars.",
 "dusk": "DUSK in this garden: the sun low and warm amber from the left, long soft blue shadows of the stones falling to the right across the combed gravel, the moss caps glowing warm on their sunlit side only, the bamboo back warm and darkening; the lantern unlit. No lamps, no glow.",
 "dawn": "DAWN in this garden: soft pale early light, a thin low mist lying over the moss behind the stones only, the gravel cool and soft, the colours muted and fresh, the bamboo back pale and hazy; the lantern unlit. No lamps, no glow."}}
FLOOR_NIGHT = "The open moss ground in the front half stays the BRIGHTEST part of the picture, softly lit, clearly brighter than the back, so small creatures read on it; the back goes darker. No moon disc in view, no lamps, no glow, no stars, no fireflies."
CHAR = {
 "reeds": {
  "night": "NIGHT after rain: cool blue-grey moonlight from the upper left; the pale haze behind deepens to a dark blue-grey; the sedges dark silver-green with a thin cool rim of light on their blades and the raindrops catching small cool glints; the rock dark with a cool rim. " + FLOOR_NIGHT,
  "dusk": "DUSK after rain: grey-violet cloud light with one warm break, a low warm rose-amber light from the left grazing the moss ground and the left side of the rock; the haze behind grey-violet, warmer near the horizon; the sedges grey-green with warm tips; long soft violet shadows. No lamps, no glow.",
  "dawn": "DAWN after rain: pearly early haze, cool and pale, the back softer and cooler blue-grey than in Image 1, the sedges silver with bright beads of rain, the moss ground fresh and soft, a faint pale pink in the haze high up; gentle low light. No lamps, no glow."},
 "boulders": {
  "night": "NIGHT in this shrine garden: cool moonlight from the upper left; the warm autumn bokeh behind goes dark blue-grey; the maple keeps EXACTLY its leaves, shape and amber-gold colour, only darkened and cooled by moonlight with a faint cool rim on the top of the canopy; the stones dark with cool rims on their tops; the pond dark with one thin cool reflection. " + FLOOR_NIGHT,
  "dusk": "DUSK in this shrine garden: the sun very low and warm from the left, long soft blue-violet shadows of the stones and the maple falling to the right across the moss, the maple's canopy (the same leaves, shape and colour) glowing on its left side only, the back darkening to warm brown-violet; the pond holding a warm reflection. No lamps, no glow.",
  "dawn": "DAWN in this shrine garden: soft pale early light, a thin low mist lying over the moss behind the island only, the back cooler and paler, grey-blue, the maple (the same leaves, shape and colour) soft in the cool light, the moss fresh and dewy, the pond pale and still. No lamps, no glow."},
 "ferns": {
  "night": "NIGHT in this fern dell: dark green-blue night; cool moonlight from the upper left; the fronds dark with thin cool rims on their edges; the croziers catching a faint cool rim; the low mist along the back catching a faint cool light; the bokeh behind dark. " + FLOOR_NIGHT,
  "dusk": "DUSK in this fern dell: warm amber flecks of low sun from the left through the fronds onto the moss ground and the log, the shade cool blue-green, the back darkening warm; the fronds' edges warm where the low sun touches them. No lamps, no glow.",
  "dawn": "DAWN in this fern dell: the fog at its deepest, pale cool mist lying low along the back and among the fronds behind the log, the back cooler and paler, grey-green, the moss ground fresh with dew in soft even light. No lamps, no glow."},
}
def edit(room, pic, light, L):
    big = pic == "idle"; n = f"idle-vivarium-{room}-{light}-{L}" if big else f"vivarium-near-{room}-{light}-{L}"
    src = P + f"rooms/signed-{pic}-{room}-day.png"
    prompt = ("Output a NEW image, " + ("16:9" if big else "4:3") + ": Image 1 at a different time of day. " + CHAR[room][light] +
      " Keep Image 1 EXACTLY the same in composition and content: every plant, stone, root, leaf, the ground's shapes and levels, in the same places and sizes, in the same hand-painted miniature finish; "
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
