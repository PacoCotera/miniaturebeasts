"""Jobs for the reading-room v2 concepts (readroom-v2.md section 7): directions A (the lamp and the glass, with B's glass depth and
C's warmth in the tags and stamp), B (the bell jar) and C (the field book), each in three states, and A's Compare.
usage: python3 -I tools/readroomjobs.py  -> source/work/concepts-readroom/jobs-<id>.json (one job per file, run one at a time)"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); W = os.path.join(ROOT, "source/work/concepts-readroom")
P = "/home/user/mp/art/station-masters/pods/source/work/concepts-readroom/"
ROOM = "/home/user/miniaturebeasts/prototypes/ui/assets/masters/rooms/room-roots-idle-dusk-1024x568.png"

def refs(state):
    state = state.split("-")[0]
    return [
        [P + f"ref-layout-{state}-16x9.png", "THE LAYOUT (a flat wireframe, project-owned): where things go on the 1024x600 game screen (the screen is centred in this 16:9 canvas). A dark top bar and a dark bottom line; the wall behind; the table top from a little above the middle down; a brass lamp over the pod; the pod on its dish in the lamp's pool; the creature to its right; small pinned papers top left (a photo and a slip) and top right (a card). The bottom of the table is left empty. Take only the placement and the sizes. Never copy its flat look, and paint no lines, arcs or boxes from it."],
        [P + "ref-bench.jpg", "THE ROOM'S MATERIALS (our signed reading-room bench painting, project-owned): its umber wood, cream plaster wall, the small low brass lamp and its warm pool of light. The new picture is clearly made by the same hand, but at night: the wall goes to soft shadow away from the lamp."],
        [P + "ref-pod-loika.png", "THE POD (project-owned game art): our Loika pod, an upright seed pod with a round coral cap, slate-blue body, pale vertical ribs and coral dots. Keep its shape, cap, ribs and dots; it is the hero of the picture."],
        [P + "ref-loika.png", "THE CREATURE (project-owned game art): the Loika the pod will become: a small round charcoal creature with a cream belly and muzzle, amber eyes, four stubby legs with pale toes and three green leaves on its head. Keep its design exactly; never invent another creature."],
        [ROOM, "THE PAINTED LANGUAGE (one of our signed Vivarium room paintings, project-owned): its matte painterly miniature rendering, soft occlusion, warm golden light, cosy palette. Take the treatment and the warmth only, none of its objects."],
    ]

SCREEN = ("Paint the WHOLE screen of a cosy handheld creature-keeping game, 16:9, a calm front-on view slightly from above: the READING ROOM, where the player studies a pod "
          "(a wild seed pod with a creature's genome sleeping inside it) one page at a time. A naturalist at home after dark, one find on the table.\n"
          "PLACEMENT (follow the layout): a plain dark slate band (#1d232b) across the very top and one across the very bottom, empty. Between them the wall behind, and a wooden study table "
          "whose top runs across the screen from a little above the middle down to the bottom band. A low small brass lamp hangs DIRECTLY above the pod, its shade just above the pod's cap; its warm pool of light falls on the pod. "
          "The POD stands on a low turned wooden dish with a thin brass lip, its centre a little left of the screen's centre (at about 39 percent of the width), in the pool; the pod is SMALL and modest, a little SHORTER than the creature beside it (the pod with its cap about 30 percent of the screen's height, the dish's foot at about 63 percent of the height), with a wide margin of wall above its cap; it is the brightest thing on screen, not the biggest. It is OUR pod, not a jar or vase: keep its round coral cap, its pale vertical ribs, its coral dots and its slate-blue colour; only its shell between the ribs is a translucent smoky slate-blue glass lit from within. The CREATURE stands on the table to the pod's right, "
          "at the pool's edge, about as tall as the pod. PINS"
          "Top left, pinned to the wall: a small photo print of the place it was found (a meadow by a pond) on kraft paper with a blank strip under it, "
          "and below it a small kraft slip with a tiny painted pod on it (its kin). Top right, pinned: a small cream card with a tiny painting of a Loika with pale patches on its back (the player's goal). "
          "PINS_END The lower part of the table (below the dish and the creature) is plain, quiet, empty wood, darker toward the bottom: nothing stands there (the game places its buttons and words there later). "
          "\n")
FINISH = ("LIGHT AND FINISH: one warm key light from the lamp, warm bounce, soft ambient occlusion, a soft contact shadow under every object. Matte, hand-painted miniature finish like the painted reference, "
          "cosy and warm, real depth; low saturation everywhere except the pod's inner light. No gloss, no chrome, no plastic, no neon, no sci-fi interface, no holograms, nothing childish.\n"
          "NO text, letters, digits, numbers or logos anywhere, and no symbols other than the faint part silhouettes inside the pod (the game types its words later): the papers carry only their small paintings, with no writing. No buttons, no plates, no dishes other than the pod's one dish. No frame, no border, no vignette; the screen fills the canvas edge to edge.")

DIR = {
 "A": ("DIRECTION: THE LAMP AND THE GLASS. A dark wooden study table at night under the one low brass lamp; the wall behind is plaster going to shadow, with a window's last deep blue dusk at the far right edge. "
       "The pod is lit from above and glows from within like a seed held to a candle. Between its pale ribs its shell is thin warm glass with real depth: a soft rim light on its edges and a faint reflection of the lamp, "
       "so what is inside feels truly INSIDE, deep in the glass, not stuck on the surface. The pinned papers are warm kraft with hand-inked edges, small brass pins and a string; one has a pressed leaf. "
       "The creature stands at the pool's edge, half in light. The feel: a quiet evening, one find, and something alive in it.\n"),
 "B": ("DIRECTION: THE BELL JAR. The pod stands under a clear glass bell jar with a small brass knob on top, the bell resting on the turned wooden dish with a brass rim. The lamp hangs a little to the left, so the bell throws "
       "a soft golden caustic of light onto the table. What is inside the pod is seen through two layers of glass (the bell, then the pod's own thin glassy shell between its ribs), which makes it feel further in and precious, "
       "a specimen in a naturalist's study. Keep the bell slender, clean and low-key so it never reads as a cage and never outshines the pod: the pod stays the brightest thing. Pinned papers are kraft and cream with brass pins.\n"),
 "C": ("DIRECTION: THE FIELD BOOK. An open naturalist's journal lies across the table, cream pages with soft ink sketches of the creature's parts (faint, wordless, only drawings), a pressed leaf and a pencil beside it; the dish and pod rest "
       "on the left page in the lamp's pool, and the creature stands on the facing right page as if drawn there and coming to life. The ink sketches are faint and sparse, and the pages have wide clean margins and NO writing at all, "
       "so the screen stays calm. Kraft tags tucked under the book's corners and pinned to the wall. The warmest, most bookish of the three, still at night under the one lamp.\n"),
}

STATE = {
 "unread": ("STATE: A POD JUST SET DOWN, FULL OF UNREAD SURPRISES. Inside the pod's glow, deep in the glass, FIVE soft round motes of warm light drift at different depths, each holding a faint pale tiny silhouette of a part of "
            "a creature (a lock of fur, an eye, a paw print, a leaf sprig, a curl of tail). The front mote is larger and brighter, with a tiny white four-point spark at its edge (something never seen is here) and a tiny gold pin beside it "
            "(the goal may be here). Just under it, two or three tiny faint colour swatches of fur (russet, ash grey, and one left dim and unknown) drift unresolved. The pod is full and alive with promise. "
            "The CREATURE beside it is still unread: a soft cool grey fog silhouette of the Loika's exact shape with a thin pale outline, no colour, no face detail, a faint glow on its back where the page in hand belongs; never a guess.\n"),
 "read":   ("STATE: THE MOMENT OF A READ. The lamp's pool brightens; light passes through the pod. One mote has left the pod: a small glowing square tile of russet fur rises out of the top of the pod along a short soft arc of warm light "
            "and is just landing on the creature's back, where the coat paints in from the fog: the creature's back and flank now in real russet-and-charcoal colour, the rest of it still a soft grey fog silhouette with a thin pale outline. "
            "Three motes remain drifting in the pod (it is emptier than before). On the table under the creature, a small painted tile of russet fur lies face up, and under its corner a second, smaller tile is caught MID-TURN, "
            "flipping over like a playing card to show an ash-grey fur underside: the hidden copy the pod was keeping. A tiny burst of sparks over the russet tile (a look never seen before). Discovery, then a small second discovery.\n"),
 "full":   ("STATE: A POD KNOWN IN FULL. The pod is now clear and still: its glass between the ribs is clean and quiet, holding only a calm steady glow, no motes left in it. The CREATURE stands whole beside it in its full colours, "
            "lit warmly, every part painted (charcoal with russet on the back, pale patches, cream belly, amber eyes, green leaves). On the front of the dish, a round wax stamp of warm honey-amber beeswax (not red) has just been pressed, "
            "with the small creature's head silhouette pressed into it and an irregular swollen edge: known in full. Under the creature, a few small painted tiles of its looks lie neatly in a short row. Contentment, a finished study.\n"),
}

COMPARE = ("STATE: COMPARE, TWO PODS ON THE SAME TABLE. The lamp is lowered a little and its pool widened across the back of the table. Follow the layout: on the left, our Loika pod on its small dish with its creature beside it (in colour, "
           "russet back); on the right, a second Loika pod (its kin, the same kind, slightly different dots) on its own dish with its creature beside it (in colour, but with an ash-grey back instead of russet). Both pods glow softly from within, "
           "each with two small motes left inside. Below them, one shared sheet of cream paper lies on the table's wood: a calm table of six rows, each row a small painted fur tile at the left and one at the right, with a wide blank gap "
           "between; two of the rows are softly lit by the lamp as if a band of light marks them (the ones that differ), the others quiet and dim. Below the sheet, plain empty wood. "
           "No pinned papers on this screen.\n")

def screen(state):
    head, rest = SCREEN.split("PINS", 1); pins, tail = rest.split("PINS_END", 1)
    if state == "compare": return head + tail.lstrip()
    return head + pins.strip() + " " + tail.lstrip()

def job(name, d, state):
    body = STATE[state] if state != "compare" else COMPARE
    return {"name": f"concepts-readroom/{name}", "model": "gemini-3-pro-image", "aspect": "16:9", "size": "4K", "tries": 1,
            "refs": refs(state), "prompt": screen(state) + DIR[d] + body + FINISH}

if __name__ == "__main__":
    V = "-c"                                          # try a (the first a-unread) asked for button plates; they came out as crockery: from -b on, no plates
    plan = [(f"{d.lower()}-{s}{V}", d, s) for d in "ABC" for s in ("unread", "read", "full")] + [("a-compare" + V, "A", "compare")]
    for n, d, s in plan: json.dump([job(n, d, s)], open(os.path.join(W, f"jobs-{n}.json"), "w"), indent=1)
    print(len(plan), "jobs")

# Round d: the same screen as the chosen unread frame, for one set of states that match (a-unread-c for A, b-unread-c for B).
SAME = {"A": "a-unread-c", "B": "b-unread-c"}
FIX = {
 "read": ("KEEP THE CREATURE ON MODEL: it is exactly the Loika of the creature reference (round charcoal body, cream belly and muzzle, amber eyes, stubby legs, three green leaves on its head), never another animal. "
          "Only its BACK and upper flank are now painted in, in russet fur; its head, legs, belly and leaves are STILL the soft cool grey fog silhouette with a thin pale outline. The pod keeps its coral cap, ribs and dots, and its glass glows "
          "with three of the glyph motes left inside (the same kind of motes as the earlier frame).\n"),
 "full": ("The pod's glass is EMPTY and clear: no motes, no silhouette, no shape inside it, only a calm even glow. The creature is exactly the Loika of the creature reference. The pinned papers carry only their small paintings: "
          "no handwriting, no lines of script, no letters anywhere.\n"),
 "compare": ("Both pods keep our pod's slate-blue colour, coral cap, pale ribs and coral dots (neither is clear glass), each with two glyph motes left inside. Both creatures are exactly the Loika of the creature reference, the left with a russet back, "
             "the right with an ash-grey back. No pinned papers and no writing anywhere.\n"),
}
def job_d(d, state):
    j = job(f"{d.lower()}-{state}-d", d, state); same = SAME[d]
    j["refs"].insert(0, [f"/home/user/mp/art/station-masters/pods/source/raw/concepts-readroom/{same}.jpg",
        "THE SAME SCREEN ONE MOMENT EARLIER (our concept, project-owned): keep its room, wall, window, lamp, table, dish, pinned papers, camera, scale and placement of the pod and the creature EXACTLY; change only what this state asks."])
    j["prompt"] = j["prompt"].replace("LIGHT AND FINISH:", FIX[state] + "LIGHT AND FINISH:"); return j
if __name__ == "__main__":
    for d, s in (("A", "read"), ("A", "full"), ("A", "compare"), ("B", "read")):
        json.dump([job_d(d, s)], open(os.path.join(W, f"jobs-{d.lower()}-{s}-d.json"), "w"), indent=1)
    print("round d jobs")

# Round e: A's read between its two matching frames (a-unread-c before, a-full-d after); a-read-d changed the room and the creature.
def job_e():
    j = job_d("A", "read"); j["name"] = "concepts-readroom/a-read-e"
    j["refs"].insert(1, ["/home/user/mp/art/station-masters/pods/source/raw/concepts-readroom/a-full-d.jpg",
        "THE SAME SCREEN WHEN THE POD IS KNOWN IN FULL (our concept, project-owned): the creature's exact design, size, place and pose. In this state the creature stands in exactly that place and pose and at exactly that size, "
        "but only its back is painted in; everything else of it is still the grey fog silhouette of the earlier frame."])
    j["prompt"] = j["prompt"].replace("KEEP THE CREATURE ON MODEL:", "The room, the camera, the pod, the dish and the creature's place, size and pose are EXACTLY those of the two reference frames; the creature is NOT bigger than in them. KEEP THE CREATURE ON MODEL:")
    return j
if __name__ == "__main__":
    json.dump([job_e()], open(os.path.join(W, "jobs-a-read-e.json"), "w"), indent=1)

# Round f: A's read with the creature taken from b-read-d (on model, back painted, the rest fog), the room from a-unread-c.
def job_f():
    j = job_d("A", "read"); j["name"] = "concepts-readroom/a-read-f"
    j["refs"].insert(1, ["/home/user/mp/art/station-masters/pods/source/raw/concepts-readroom/b-read-d.jpg",
        "THE READ BEAT (our other concept, project-owned): take from it ONLY the creature, exactly as it is here (its Loika face and eyes, its size, the russet back painted in, the grey fog head, legs and leaves with the thin pale outline), "
        "the arc of light and the two small tiles on the table, the second one flipping. Do NOT take its glass bell, its wall or its room."])
    j["prompt"] = j["prompt"].replace("KEEP THE CREATURE ON MODEL:", "The room, camera, pod and dish are EXACTLY those of the same-screen frame; the creature stands where the grey silhouette stands there, at that size. KEEP THE CREATURE ON MODEL:")
    return j
if __name__ == "__main__":
    json.dump([job_f()], open(os.path.join(W, "jobs-a-read-f.json"), "w"), indent=1)
