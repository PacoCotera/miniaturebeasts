"""Sitting S01 keys: writes the K2-K4 (and K1j) job files with the brief's prompts as written plus the art director's added lines
(ruling 22:31: the facing line; Round 2 22:48: the cell-4 line and the juvenile calm sentence), each after the first paragraph.
usage (from art/station-masters/pods): python3 -I floor/S01/sitting/guides/jobs-sit.py <stage> <k1|k2|k3|k4> <letter>"""
import json, sys
stage, k, letter = sys.argv[1:4]; ad = stage == 'adult'; SIDE = 'LEFT' if ad else 'RIGHT'
FACING = f"Every figure keeps its facing exactly as in the reference: the head toward the {SIDE}, the same as cell 1. Do not turn or mirror any figure."
CELL4 = "Cell 4 (bottom left) stays empty, plain flat magenta: put nothing in it, and never a copy of a reference."
K1 = """Edit this key sheet. Cell 1 (top left) holds our creature standing. Keep cell 1 exactly as it is, unchanged in every pixel.

In cells 2, 3, 5 and 6, paint the SAME creature: the same species, face, eyes, eye rings, {crest}, colours, proportions, size and matte painterly brush. {view} Each cell holds one full figure, the same size as cell 1, with its feet on the same ground line as cell 1 (20 px above the cell's bottom edge), centred, and clear of every cell edge by at least 20 px.

Cells 2 and 5: SHAKE-DRY, two different takes. The body is caught mid-shake, twisting through the shoulders, the coat flared out in soft tufts, the eyes squeezed shut, the crest leaves flung back. All four feet stay on the ground. Five or six small water droplets fly off the coat: pale blue-white rounded beads, each clearly separate, all close around the body, none on the coat and none below the feet.

Cells 3 and 6: CALM, two different takes. {calm} Nothing else.

Cell 4 (bottom left) stays empty magenta. Calm and natural, a grown-up naturalist painting, never a cartoon squash, never childish. Plain flat solid magenta (#FF00FF) everywhere around the figures: no cell borders, no text, numbers or labels, no props, no ground, no shadow, no glow."""
K2 = """Edit the first reference. Keep every cell exactly as it is: the same creature, pose, size, place, outline, eyes, eye rings, colours, light and brush, the water droplets exactly where they are, and the same magenta background.

{add}

Change only one thing in every cell: remove the leaf crest on top of the head and paint the bare head there. The bare head is round and whole, continuing the head's own dark coat, outline and top-left light, exactly like the bare head in the second reference, with no stub, no scar and no flat cut. Where a leaf crossed the body or a droplet, paint what lies behind it.

No new parts, no text, no borders, no shadow, no glow."""
K3 = """Edit the reference sheet. Cell 1 already wears its pale cream patches. Keep cell 1 exactly as it is.

{add}

Paint the SAME patches on the creature in every other filled cell: the same two large, rounded, irregular cream masses as cell 1, with soft painted edges, one on the back or shoulder behind the head and one on the haunch. Each follows the pose's body as it bends or twists. Each patch is one big rounded mass, at least {px} px across on this sheet. NO crescents, NO bands, NO stripes, NO small spots or specks, and no third patch. Use the cream of the belly, with the fur's soft shading and the light from the top left over them.

Patches go only on the dark fur of the body: none on the head, face, eye rings, belly cream, toes, droplets or the legs below the thigh. Return the SAME sheet: every creature in exactly the same position, pose, size, outline, eyes, belly, toes, droplets and light, on the same flat magenta (#FF00FF). No new object, no text, no borders, no glow, no leaves, no crest."""
K4 = """Edit the reference sheet. Cell 1 already wears its pale cream stripes. Keep cell 1 exactly as it is.

{add}

Paint the SAME stripes on the creature in every other filled cell: {stripes}, as in cell 1. They follow each pose's body as it bends or twists. Use the cream of the belly, with the fur's soft shading and the light from the top left.

Stripes go only on the dark fur of the body: NEVER on the head, face, eye rings, belly cream, toes, droplets or the lower legs. Return the SAME sheet: every creature in exactly the same position, pose, size, outline, eyes, belly, toes, droplets and light, on the same flat magenta (#FF00FF). No new object, no text, no borders, no glow, no leaves, no crest."""
G = 'art/station-masters/pods/floor/S01/sitting/guides/'
if k == 'k1':
    view = ("Use the same three-quarter view with the head toward the LEFT and the same soft light from the top left." if ad else
            "Use the same three-quarter view as cell 1, facing the same way as cell 1: the snout and eyes toward the RIGHT edge of the sheet, the rump toward the left. Keep the same soft light from the top left.")
    calm = ("The body is low and soft, settled down, the eyes gently lidded (half closed), and one forepaw lifted a little off the ground." if ad else
            "The body is sunk low and soft, the belly near the ground and the hind legs folded under, the eyes gently lidded (half closed), and one forepaw lifted a little off the ground.")
    prompt = K1.format(crest='three-leaf crest' if ad else 'leaf crest as in cell 1', view=view, calm=calm)
    refs = [[G + f'compose-sit-{stage}-crested.png', f"Our signed {stage} creature (project-owned), standing in cell 1: the creature to repeat, exactly this one. Keep cell 1 exactly as it is."]]; name = 'crested'
else:
    add = FACING + ("\n\n" + CELL4 if (k != 'k2' or not ad) else "")
    if k == 'k2':
        prompt = K2.format(add=add); name = 'bare'
        refs = [[G + f'compose-sit-{stage}-bare-in.png', "The key sheet to edit: the same creature in every cell; edit only what the prompt names."], [G + f'compose-sit-{stage}-bare-anchor-ref.png', "How this creature's bare head looks, with no leaves (project-owned)."]]
    elif k == 'k3':
        prompt = K3.format(add=add, px=60 if ad else 75); name = 'patches'
        refs = [[G + f'compose-sit-{stage}-patches-in.png', "The sheet to edit. Cell 1 already wears its pale cream patches; keep cell 1 exactly as it is."]]
    else:
        st = ("broad pale bands behind the shoulder, bowing back down the flank and tapering to a point, two or three on the visible flank" if ad else
              "broad pale bands on the dark cap behind the head, bowing back down the flank and tapering to a point, one or two on the visible side")
        prompt = K4.format(add=add, stripes=st); name = 'stripes'
        refs = [[G + f'compose-sit-{stage}-stripes-in.png', "The sheet to edit. Cell 1 already wears its pale cream stripes; keep cell 1 exactly as it is."]]
job = [{"name": f"sit-S01-{stage}-keys-{name}-{letter}", "model": "gemini-3-pro-image", "aspect": "3:2", "size": "1K", "tries": 1, "refs": refs, "prompt": prompt}]
out = f'source/work/sit-S01-{stage}-keys-{name}-{letter}.json'; json.dump(job, open(out, 'w'), indent=1); print(out)
