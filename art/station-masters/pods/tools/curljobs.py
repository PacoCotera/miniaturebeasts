"""Curled sleeper jobs (ad-curl, 2026-10-28): for each species and stage, the signed 304x312 master's body (alpha >= 200, its baked shadow left out)
flattened on #FF00FF in cell 1 of a 1200x800 sheet at x1.6, feet on row 700, centred on x 300; cell 2 (x 600-1200) empty. One Pro request per picture at 1K 3:2.
usage: python3 -I curljobs.py OUT_JOBS.json NAME_SUFFIX SPECIES-STAGE ...   (e.g. S02-juvenile)  writes curl/inputs/curl-<sp>-<stage>-in.png"""
import sys, json, hashlib, numpy as np
from PIL import Image
ROOT = "/home/user/mp/art/station-masters/pods"; REL = "art/station-masters/pods"
SC, FEET, CX = 1.6, 700, 300
HOW = {
 "S02": "it settles flat into a round furred heap, its cap tipped forward over its closed eyes, its little tail wrapped round to the front",
 "S03": "it lies on its belly with its body curled into a ring and its tail wrapped round to its nose, its chin resting on its forepaws",
 "S04": "it curls up like a sleeping kitten into a round doughnut, its tail wrapped round its nose and paws, its head tucked on its paws",
 "S05": "it curls up like a sleeping fox cub into a tight round ball, its big tail wrapped over its paws and the tip of its nose",
 "S06": "it curls up like a sleeping bear cub into a round heap, its head resting on its forepaws, its round ears showing",
 "S07": "it curls up like a sleeping bear cub into a round heap, its head resting on its forepaws, its round ears showing",
 "S08": "it lies down like a sleeping fawn, its legs folded under its body, its neck curved back so its head rests on its flank, its little antlers showing",
 "S09": "it sits down low like a sleeping bird, its legs hidden under its fluffed body, its head turned back and tucked into its back feathers, its beak under the edge of its wing",
 "S10": "it lies curled on its belly like a sleeping piglet, its legs tucked under, its snout resting on its front trotters, its curly tail round its side",
 "S11": "it lies flat with its legs and tail drawn in under its shell and its head pulled half into the shell, its chin resting at the shell's rim",
 "S12": "it settles low with all its legs folded under its body, its antennae folded back along its back, its head bowed onto its forelegs",
 "S13": "it settles low with all its legs tucked under its shell, its body pressed to the ground, its antennae folded back along its back, its head bowed",
 "S14": "it coils its soft body into a round spiral like a sleeping snail without a shell, its head resting on top of the coil, its eye-stalks drooping",
 "S15": "it settles into a squat round mound with its legs tucked under, its leaves drooping softly over its body",
 "S16": "it lies down along the ground with its fins folded against its body, its long neck curved round so its round head rests on its own side",
}
def master(sp, stage):
    return f"{ROOT}/{'adult' if stage == 'adult' else 'juvenile'}/mibi-{stage}-{sp}-304x312.png"
def compose(sp, stage):
    a = np.asarray(Image.open(master(sp, stage)).convert("RGBA")).astype(float)
    body = a[..., 3] >= 200
    im = Image.fromarray(np.dstack([a[..., :3], np.where(body, 255, 0)]).astype(np.uint8), "RGBA")
    ys, xs = np.where(body); cx = (xs.min() + xs.max() + 1) / 2
    sm = im.resize((round(304 * SC), round(312 * SC)), Image.LANCZOS)
    sheet = Image.new("RGBA", (1200, 800), (255, 0, 255, 255))
    ox, oy = round(CX - cx * SC), round(FEET - (ys.max() + 0.5) * SC)
    sheet.alpha_composite(sm, (ox, oy))
    out = f"{ROOT}/curl/inputs/curl-{sp}-{stage}-in.png"; sheet.convert("RGB").save(out)
    return out, {"ox": ox, "oy": oy, "scale": SC, "cx": cx, "last": int(ys.max())}
def prompt(sp, stage):
    young = "young" if stage == "juvenile" else "grown"
    return (f"The image is a sheet of two cells on a flat #FF00FF magenta ground. Cell 1 (the left half) shows a {young} creature, a finished painting. "
            "Keep cell 1 exactly as it is. In cell 2 (the right half, now empty) paint the SAME creature fast asleep, curled up: " + HOW[sp] + ". "
            "Its eyes are closed: each eye a soft closed lid line, no iris, no white showing. It looks peaceful and cosy. "
            "Exactly the same creature as cell 1: the same colours, the same markings, the same proportions, the same painting style, finish and light from the upper left, "
            "and the SAME SIZE: the curled body holds the same amount of creature as the standing one, so it is lower and wider, never smaller. "
            "It lies on the same ground line as cell 1's feet and faces the same way as cell 1. "
            "No shadow, no ground, no bed, no props, no text, no outline: the creature alone on the flat #FF00FF magenta, with clear magenta all round it and nothing crossing the middle line between the cells.")
if __name__ == "__main__":
    out, suffix, keys = sys.argv[1], sys.argv[2], sys.argv[3:]; jobs = []; reg = {}
    for k in keys:
        sp, stage = k.split("-"); path, r = compose(sp, stage)
        r["sha256"] = hashlib.sha256(open(path, "rb").read()).hexdigest(); reg[f"curl-{sp}-{stage}-{suffix}"] = r
        jobs.append({"name": f"curl-{sp}-{stage}-{suffix}", "model": "gemini-3-pro-image", "aspect": "3:2", "size": "1K", "tries": 1,
                     "refs": [[path.replace(ROOT, REL), "Image 1: the sheet. Cell 1 holds the signed creature; cell 2 is empty."]], "prompt": prompt(sp, stage)})
    json.dump(jobs, open(out, "w"), indent=1)
    regf = f"{ROOT}/curl/inputs/register.json"
    try: allr = json.load(open(regf))
    except Exception: allr = {}
    allr.update(reg); json.dump(allr, open(regf, "w"), indent=1)
    print(len(jobs), "jobs ->", out)
